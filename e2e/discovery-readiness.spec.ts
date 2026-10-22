import { expect, test, type Page, type Route } from '@playwright/test';

const owner = {
  id: '1cc96a14-2728-46fd-ae3c-cbf15fd9db1a', username: 'ada', fullName: 'Ada Lovelace',
  email: 'ada@example.test', avatarUrl: null, role: 'user', permissions: [], verified: true,
  createdAt: '2026-08-28T09:00:00.000Z', updatedAt: '2026-08-28T09:00:00.000Z',
  followerCount: 1, followingCount: 0, following: [] as string[], pendingFollowIds: [] as string[],
  settings: { notificationsEnabled: true, privateAccount: false, contentFilter: 'regular' },
  privacy: { profileVisibility: 'public', messageRequests: true, allowDmFromStrangers: true },
  termsVersion: 'test-public-beta-1', termsAcceptedAt: '2026-08-30T00:00:00.000Z',
};
const creator = { ...owner, id: '62717fa5-5428-4e1f-8d0d-c825d6ad70c7', username: 'river', fullName: 'River Stone' };
const follower = { ...owner, id: 'dcfd5a98-59c4-4b6c-9814-fdc9c35f5cab', username: 'robin', fullName: 'Robin Green' };
function post(content: string, id: string, authorId = owner.id) {
  return { id, authorId, content, images: [], createdAt: owner.createdAt, updatedAt: owner.updatedAt,
    likesCount: 0, commentsCount: 0, bookmarksCount: 0, shareCount: 0, repostCount: 0,
    likedByMe: false, savedByMe: false, repostedByMe: false, audience: 'public', contentCategory: 'technology', contentRating: 'regular' };
}
async function json(route: Route, data: unknown, meta: Record<string, unknown> = {}) {
  await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data, errors: [], meta }) });
}
async function unavailable(route: Route) {
  await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'Temporarily unavailable. Please retry.' }) });
}
async function installBoundary(page: Page) {
  const unhandled: string[] = [];
  page.on('close', () => expect(unhandled, 'Every discovery API route must be explicitly mocked').toEqual([]));
  await page.route('**/socket.io/**', route => route.abort());
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname.replace(/^\/api/, '');
    if (path === '/auth/refresh') return json(route, { accessToken: 'discovery-test-session' });
    if (path === '/users/me') return json(route, owner);
    if (path === '/users/me/eligibility') return json(route, { experience: 'adult_18_plus', activated: true,
      maximumContentRating: 'mature', revision: 'a'.repeat(64), policyVersions: ['test-policy-v1'], publicBrowsingAllowed: true, reason: null,
      capabilities: { social: true, publish: true, messaging: true, payments: true, seller: true, memberships: true, live: true, rtc: true, ai: true, analytics: true, profiling: true } });
    if (path === '/users/me/premium-profile') return json(route, {
      selection: { bioStyleId: 'default', messageFontId: 'default', storyFontId: 'default', appIconId: 'yor-default' },
      options: { bioStyles: [{ id: 'default', label: 'Default' }], messageStyles: [{ id: 'default', label: 'Default' }], storyStyles: [{ id: 'default', label: 'Default' }], appIcons: [{ id: 'yor-default', label: 'Yor', platforms: ['web'] }] }, enabledFeatures: {},
    });
    if (path === '/users/search') return json(route, [creator, follower]);
    if (path === '/search') return json(route, { users: [creator], posts: [] });
    if (path === '/readyz') return json(route, { status: 'ready' });
    const user = [owner, creator, follower].find(item => path === `/users/${item.id}`);
    if (user) return json(route, user);
    const lists = ['/feed', '/users/me/guardian-authorizations', '/users/me/close-friends', '/users/me/contact-shields', '/users/me/follow-requests', '/users/me/favorites/creators', '/conversations', '/notifications', '/stories', '/notes', '/videos', '/articles', '/events', '/products', '/products/orders', '/communities', '/creator/workspace', '/achievements/me', '/posts/liked', '/posts/saved', '/videos/saved'];
    if (route.request().method() === 'GET' && (lists.includes(path) || /^\/users\/[0-9a-f-]{36}\/(feed|posts|followers|following|showcases|profile-comments|pinned-posts)$/.test(path))) return json(route, [], { hasMore: false, nextCursor: null });
    unhandled.push(`${route.request().method()} ${path}`);
    return unavailable(route);
  });
}

test('profile uses cursor metadata for short pages and retries the failed page without discarding posts', async ({ page }) => {
  await installBoundary(page);
  const cursors: (string | null)[] = [];
  let failOlder = true;
  await page.route(`**/api/users/${owner.id}/feed?**`, route => {
    const cursor = new URL(route.request().url()).searchParams.get('cursor');
    cursors.push(cursor);
    if (!cursor) return json(route, [post('First profile post', 'first')], { hasMore: true, nextCursor: 'older+page/one=' });
    if (failOlder) return unavailable(route);
    return json(route, [post('Second profile post', 'second')], { hasMore: false, nextCursor: null });
  });
  await page.goto(`/profile/${owner.id}`);
  const grid = page.getByRole('tabpanel', { name: 'Posts', exact: true });
  await expect(grid.getByRole('button', { name: 'Open post: First profile post' })).toBeVisible();
  await grid.getByRole('button', { name: 'Load more posts', exact: true }).click();
  await expect(grid.getByRole('alert')).toContainText('More posts could not load');
  await expect(grid.getByRole('button', { name: 'Open post: First profile post' })).toBeVisible();
  failOlder = false;
  await grid.getByRole('button', { name: 'Try again' }).click();
  await expect(grid.getByRole('button', { name: 'Open post: Second profile post' })).toBeVisible();
  await expect(grid.getByRole('button', { name: 'Open post: First profile post' })).toHaveCount(1);
  await expect(grid.getByRole('button', { name: 'Load more posts', exact: true })).toHaveCount(0);
  expect(cursors).toEqual([null, 'older+page/one=', 'older+page/one=']);
});

test('private Liked content disappears on client navigation and a follower outage offers a retry', async ({ page }) => {
  await installBoundary(page);
  let likedReads = 0;
  let failFollowers = true;
  await page.route('**/api/posts/liked?**', route => {
    likedReads++;
    return json(route, [{ ...post('Private liked collection', 'liked-secret', creator.id), likedByMe: true }]);
  });
  await page.route(`**/api/users/${owner.id}/followers`, route => json(route, [creator]));
  await page.route(`**/api/users/${creator.id}/followers`, route => failFollowers ? unavailable(route) : json(route, [follower]));
  await page.goto(`/profile/${owner.id}`);
  await page.getByRole('tab', { name: 'Liked', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Open post: Private liked collection' })).toBeVisible();
  await page.locator('.profile-stats').getByRole('button', { name: /Followers/ }).click();
  const followers = page.getByRole('dialog', { name: 'followers', exact: true });
  await followers.getByRole('link', { name: 'River Stone @river' }).click();
  await expect(page).toHaveURL(`/profile/${creator.id}`);
  await expect(page.getByRole('tab', { name: 'Liked', exact: true })).toHaveCount(0);
  await expect(page.getByText('Private liked collection', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('tab', { name: 'Posts', exact: true })).toHaveAttribute('aria-selected', 'true');
  expect(likedReads).toBe(1);
  await page.locator('.profile-stats').getByRole('button', { name: /Followers/ }).click();
  await expect(followers.getByRole('alert')).toContainText('Could not load followers');
  await expect(followers.getByText('No followers to show.')).toHaveCount(0);
  failFollowers = false;
  await followers.getByRole('button', { name: 'Retry followers' }).click();
  await expect(followers.getByRole('link', { name: 'Robin Green @robin' })).toBeVisible();
});

test('profile posts and comment wall failures are distinct from empty states and recover', async ({ page }) => {
  await installBoundary(page);
  let fail = true;
  await page.route(`**/api/users/${owner.id}/feed?**`, route => fail ? unavailable(route) : json(route, []));
  await page.route(`**/api/users/${owner.id}/profile-comments`, route => fail ? unavailable(route) : json(route, []));
  await page.goto(`/profile/${owner.id}`);
  const grid = page.getByRole('tabpanel', { name: 'Posts', exact: true });
  await expect(grid.getByRole('alert')).toContainText('Profile posts could not load');
  await expect(page.getByRole('alert').filter({ hasText: 'Showcases and wall comments' })).toBeVisible();
  await expect(page.getByText('Your story starts here', { exact: true })).toHaveCount(0);
  await expect(page.getByText('No comments yet', { exact: true })).toHaveCount(0);
  fail = false;
  await grid.getByRole('button', { name: 'Try again' }).click();
  await page.getByRole('button', { name: 'Retry showcases and comments' }).click();
  await expect(page.getByText('Your story starts here', { exact: true })).toBeVisible();
  await expect(page.getByText('No comments yet', { exact: true })).toBeVisible();
});

test('discovery handles failed searches, initial failures, and filtered cursor pages without false emptiness', async ({ page }) => {
  await installBoundary(page);
  let failFeed = true;
  let failSearch = true;
  const cursors: (string | null)[] = [];
  await page.route('**/api/feed?**', route => {
    const cursor = new URL(route.request().url()).searchParams.get('cursor');
    cursors.push(cursor);
    if (failFeed) return unavailable(route);
    return cursor ? json(route, [post('Second discovery page', 'discovered', creator.id)], { hasMore: false }) : json(route, [], { hasMore: true, nextCursor: 'scanned+next/page=' });
  });
  await page.route('**/api/search?**', route => failSearch ? unavailable(route) : json(route, { users: [creator], posts: [] }));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/explore');
  await expect(page.getByRole('alert')).toContainText('Discovery could not load');
  await expect(page.getByText('A new perspective is around the corner.')).toHaveCount(0);
  failFeed = false;
  await page.getByRole('button', { name: 'Retry discovery' }).click();
  await expect(page.getByText('A new perspective is around the corner.')).toHaveCount(0);
  await page.getByRole('button', { name: 'Discover more posts' }).click();
  await expect(page.getByRole('button', { name: 'Open post: Second discovery page' })).toBeVisible();
  expect(cursors.at(-1)).toBe('scanned+next/page=');
  const search = page.getByRole('searchbox', { name: 'Search people and posts' });
  await search.fill('river');
  await expect(page.getByRole('alert')).toContainText('Search is unavailable');
  await expect(search).toHaveValue('river');
  failSearch = false;
  await page.getByRole('button', { name: 'Retry search' }).click();
  await expect(page.locator('.operator-discovery-search-state').getByRole('button').filter({ hasText: 'River Stone' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});

test('follower buttons serialize repeated taps and can cancel a pending private request', async ({ page }) => {
  await installBoundary(page);
  await page.route(`**/api/users/${owner.id}/followers`, route => json(route, [creator]));
  let release!: () => void;
  const pending = new Promise<void>(resolve => { release = resolve; });
  let follows = 0;
  let unfollows = 0;
  await page.route(`**/api/users/${creator.id}/follow`, async route => {
    follows++;
    await pending;
    return json(route, { follower: { ...owner, pendingFollowIds: [creator.id] }, target: creator, status: 'pending' });
  });
  await page.route(`**/api/users/${creator.id}/unfollow`, route => {
    unfollows++;
    return json(route, { follower: owner, target: creator });
  });
  await page.goto(`/profile/${owner.id}`);
  await page.locator('.profile-stats').getByRole('button', { name: /Followers/ }).click();
  const modal = page.getByRole('dialog', { name: 'followers', exact: true });
  const follow = modal.getByRole('button', { name: 'Follow River Stone', exact: true });
  await follow.click();
  await expect(follow).toBeDisabled();
  await follow.dispatchEvent('click');
  expect(follows).toBe(1);
  release();
  const cancel = modal.getByRole('button', { name: 'Cancel follow request to River Stone', exact: true });
  await expect(cancel).toHaveText('Requested');
  await cancel.click();
  await expect(follow).toBeEnabled();
  expect(unfollows).toBe(1);
});
