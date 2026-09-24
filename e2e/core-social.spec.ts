import { expect, test, type Page, type Route } from "@playwright/test";
import AxeBuilder from '@axe-core/playwright';

const user = {
  id: "1cc96a14-2728-46fd-ae3c-cbf15fd9db1a",
  username: "ada",
  email: "ada@example.test",
  fullName: "Ada Lovelace",
  bio: "Building thoughtful systems.",
  avatarUrl: null,
  role: "user",
  permissions: [],
  createdAt: "2026-08-28T09:00:00.000Z",
  updatedAt: "2026-08-28T09:00:00.000Z",
  followerCount: 12,
  followingCount: 0,
  following: [] as string[],
  postCount: 1,
  verified: true,
  settings: { notificationsEnabled: true, privateAccount: false, contentFilter: "regular" },
  privacy: { profileVisibility: "public", messageRequests: true, allowDmFromStrangers: true },
  termsVersion: "test-public-beta-1",
  termsAcceptedAt: "2026-08-30T00:00:00.000Z",
  ageConfirmedAt: "2026-08-30T00:00:00.000Z",
};

function post(content: string, id: string) {
  return {
    id,
    authorId: user.id,
    content,
    images: [],
    createdAt: "2026-08-28T09:05:00.000Z",
    updatedAt: "2026-08-28T09:05:00.000Z",
    likesCount: 0,
    commentsCount: 0,
    bookmarksCount: 0,
    shareCount: 0,
    repostCount: 0,
    likedByMe: false,
    savedByMe: false,
    repostedByMe: false,
    audience: "public",
    contentCategory: "technology",
    contentRating: "regular",
  };
}

async function json(route: Route, data: unknown, meta: Record<string, unknown> = {}) {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ success: true, message: "OK", data, errors: [], meta }),
  });
}

async function installApiBoundary(page: Page, profile = user) {
  await page.route("**/socket.io/**", (route) => route.abort());
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace(/^\/api/, "") || "/";

    if (path === "/auth/refresh" && request.method() === "POST") {
      return json(route, { accessToken: "browser-smoke-access-token" });
    }
    if (path === "/users/me" && request.method() === "GET") return json(route, profile);
    if (path === `/users/${user.id}`) return json(route, profile);
    if (path === "/users/search") return json(route, [user]);
    if (path === "/search") return json(route, { users: [], posts: [] });
    if (path === "/readyz") return json(route, { status: 'ready' });
    if (path === "/feed" && request.method() === "GET") {
      return json(route, [post("A real signal delivered through the feed boundary.", "18fac78e-65fa-4fd4-931e-8b79e086c48d")], {
        nextCursor: null,
        hasMore: false,
        limit: 20,
      });
    }
    if (path === "/posts" && request.method() === "POST") {
      const payload = request.postDataJSON() as { content: string };
      return json(route, post(payload.content, "292d72b6-6bd1-4693-91e8-b4dc32302c7c"));
    }

    return json(route, []);
  });
}

test("restores the social shell, publishes a post, and navigates discovery", async ({ page }) => {
  await installApiBoundary(page);
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  await expect(page.getByRole("article").getByText("A real signal delivered through the feed boundary.")).toBeVisible();

  await page.getByRole("button", { name: "Create a post" }).first().click();
  const dialog = page.getByRole("dialog", { name: "Create post" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("textbox", { name: "Write a post" }).fill("Browser-tested publishing works end to end.");
  await dialog.locator("#post-content-category").selectOption("technology");
  await dialog.getByRole("button", { name: "Post", exact: true }).click();

  await expect(dialog).toBeHidden();
  await expect(page.getByRole("article").getByText("Browser-tested publishing works end to end.")).toBeVisible();

  await page.getByRole("button", { name: "Explore", exact: true }).first().click();
  await expect(page.getByRole("heading", { name: "Explore" })).toBeVisible();
});

test('feed failures show a retry, never a false empty-success state', async ({ page }) => {
  await installApiBoundary(page);
  let unavailable = true;
  await page.route('**/api/feed?*', async (route) => {
    if (unavailable) return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'Feed temporarily unavailable', errors: [] }) });
    return json(route, [post('The recovered feed is here.', 'recover-post')]);
  });
  await page.goto('/');
  await expect(page.getByRole('alert').filter({ hasText: 'Feed temporarily unavailable' })).toBeVisible();
  await expect(page.getByText('You are all caught up.')).toHaveCount(0);
  unavailable = false;
  await page.getByRole('button', { name: 'Retry feed' }).click();
  await expect(page.getByRole('article').getByText('The recovered feed is here.')).toBeVisible();
});

test('posts survive unavailable author profiles and recover without hook errors', async ({ page }) => {
  await installApiBoundary(page);
  const authorId = '10000000-0000-4000-8000-000000000007';
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  let unavailable = true;
  await page.route('**/api/feed?*', (route) => json(route, [{ ...post('A post from a new creator.', 'author-post'), authorId }]));
  await page.route(`**/api/users/${authorId}`, (route) => unavailable
    ? route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'Temporarily unavailable' }) })
    : json(route, { ...user, id: authorId, username: 'maya', fullName: 'Maya Chen' }));
  await page.goto('/');
  await expect(page.getByRole('article').getByText('A post from a new creator.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Retry creator details' })).toBeVisible();
  unavailable = false;
  await page.getByRole('button', { name: 'Retry creator details' }).click();
  await expect(page.getByRole('article').getByRole('link', { name: 'Maya Chen', exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test('outgoing messages never increase the unread conversation badge', async ({ page }) => {
  await installApiBoundary(page);
  const other = '10000000-0000-4000-8000-000000000009';
  await page.route('**/api/conversations', (route) => json(route, ['incoming', 'outgoing'].map((id) => ({
    conversation: { id, participantA: user.id, participantB: other, participantIds: [user.id, other], updatedAt: user.createdAt },
    lastMessage: { id: `${id}-message`, conversationId: id, senderId: id === 'incoming' ? other : user.id, recipientId: user.id, content: id, createdAt: user.createdAt, seenAt: null },
  }))));
  await page.goto('/');
  await expect(page.getByRole('link', { name: '1 unread conversations', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: '2 unread conversations', exact: true })).toHaveCount(0);
});

for (const colorScheme of ['light', 'dark'] as const) {
test(`mobile home is readable and keyboard-operable in ${colorScheme} mode`, async ({ page }) => {
  await page.emulateMedia({ colorScheme });
  await page.setViewportSize({ width: 390, height: 844 });
  await installApiBoundary(page);
  await page.goto('/');
  await expect(page.getByRole('article')).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Following' })).toHaveAttribute('aria-selected', 'true');
  await page.getByRole('tab', { name: 'Following' }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'For you' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('tab', { name: 'For you' })).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(results.violations.filter((item) => item.impact === 'critical' || item.impact === 'serious')).toEqual([]);
});
}

test('sign-in preserves password and email-code paths with accessible controls', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await installApiBoundary(page);
  await page.route('**/api/auth/refresh', (route) => route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'Not signed in' }) }));
  await page.goto('/auth');
  await expect(page.getByRole('heading', { name: 'Welcome to your corner.' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Password', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'Email code', exact: true })).toHaveAttribute('aria-pressed', 'false');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(results.violations.filter((item) => item.impact === 'critical' || item.impact === 'serious')).toEqual([]);
});

test('sign-in validation focuses and describes the first invalid field', async ({ page }) => {
  await installApiBoundary(page);
  await page.route('**/api/auth/refresh', (route) => route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'Not signed in' }) }));
  await page.goto('/auth');
  await page.getByRole('button', { name: 'Sign in', exact: true }).last().click();
  const identifier = page.getByLabel('Username or email');
  await expect(identifier).toBeFocused();
  await expect(identifier).toHaveAttribute('aria-invalid', 'true');
  const describedBy = await identifier.getAttribute('aria-describedby');
  expect(describedBy).toBeTruthy();
  await expect(page.locator(`#${describedBy}`)).toContainText('Enter your username or email.');
  const password = page.getByLabel('Password', { exact: true });
  await expect(password).toHaveAttribute('aria-describedby', /password-error/);
});

test('expired bearer logout revokes refresh session before a reload can restore it', async ({ page }) => {
  let refreshAllowed = true;
  let logoutAttempts = 0;
  await page.route('**/socket.io/**', (route) => route.abort());
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace(/^\/api/, '');
    if (path === '/auth/refresh') {
      return refreshAllowed
        ? json(route, { accessToken: 'access-before-expiry' })
        : route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'Invalid refresh token' }) });
    }
    if (path === '/users/me') return json(route, user);
    if (path === '/auth/logout') {
      logoutAttempts++;
      if (request.headers().authorization) {
        return route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'Expired access token' }) });
      }
      refreshAllowed = false;
      return json(route, null);
    }
    if (path === '/readyz') return json(route, { status: 'ready' });
    return json(route, []);
  });

  await page.goto('/settings');
  await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Log out', exact: true }).click();
  await expect(page).toHaveURL(/\/auth/);
  expect(logoutAttempts).toBe(1);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Welcome to your corner.' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toHaveCount(0);
});

test('narrow Google sign-in stays within its panel as the viewport changes', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 760 });
  await installApiBoundary(page);
  await page.route('https://accounts.google.com/gsi/client', (route) => route.fulfill({
    contentType: 'application/javascript',
    body: `window.google={accounts:{id:{initialize(){},renderButton(parent,options){const button=document.createElement('button');button.dataset.renderedWidth=String(options.width);button.style.width=options.width+'px';button.textContent='Sign in with Google';parent.append(button)}}}};`,
  }));
  await page.route('**/api/auth/refresh', (route) => route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'Not signed in' }) }));
  await page.goto('/auth');
  const button = page.locator('.operator-google-access__button button');
  await expect(button).toBeVisible();
  const widthAt320 = Number(await button.getAttribute('data-rendered-width'));
  const panelWidthAt320 = await page.locator('.operator-google-access__button').evaluate((element) => element.clientWidth);
  expect(widthAt320).toBeLessThanOrEqual(panelWidthAt320);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(async () => Number(await button.getAttribute('data-rendered-width'))).toBeLessThanOrEqual(await page.locator('.operator-google-access__button').evaluate((element) => element.clientWidth));
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});

test('video load failures show a retry instead of a false empty queue', async ({ page }) => {
  await installApiBoundary(page);
  let unavailable = true;
  await page.route('**/api/videos', (route) => unavailable
    ? route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'Unavailable' }) })
    : json(route, []));
  await page.goto('/videos');
  await expect(page.getByRole('alert').filter({ hasText: 'Videos could not load' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Your queue is empty' })).toHaveCount(0);
  unavailable = false;
  await page.getByRole('button', { name: 'Retry videos' }).click();
  await expect(page.getByRole('heading', { name: 'Your queue is empty' })).toBeVisible();
});

test('direct-message and group-member search failures can retry without claiming no matches', async ({ page }) => {
  await installApiBoundary(page);
  const candidate = { ...user, id: '10000000-0000-4000-8000-000000000091', username: 'grace', fullName: 'Grace Hopper' };
  let attempts = 0;
  await page.route('**/api/users/search*', (route) => {
    attempts++;
    return attempts === 1 || attempts === 3
      ? route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'Unavailable' }) })
      : json(route, [candidate]);
  });
  await page.goto('/messages');

  await page.getByRole('button', { name: 'Start a new conversation' }).click();
  const directDialog = page.getByRole('dialog', { name: 'Start a conversation' });
  await directDialog.getByRole('textbox', { name: 'Search people to message' }).fill('grace');
  await expect(directDialog.getByRole('alert').filter({ hasText: 'People could not load' })).toBeVisible();
  await expect(directDialog.getByText('No users found.')).toHaveCount(0);
  await directDialog.getByRole('button', { name: 'Retry people search' }).click();
  await expect(directDialog.getByRole('button', { name: /Grace Hopper/ })).toBeVisible();
  await page.keyboard.press('Escape');

  await page.getByRole('button', { name: 'Create a group chat' }).click();
  const groupDialog = page.getByRole('dialog', { name: 'Create a group conversation' });
  await groupDialog.getByRole('textbox', { name: 'Search people to add' }).fill('grace');
  await expect(groupDialog.getByRole('alert').filter({ hasText: 'Group members could not load' })).toBeVisible();
  await expect(groupDialog.getByText('No people found.')).toHaveCount(0);
  await groupDialog.getByRole('button', { name: 'Retry member search' }).click();
  await expect(groupDialog.getByRole('button', { name: /Grace Hopper/ })).toBeVisible();
  expect(attempts).toBe(4);
});

test('reel comments expose a retry and arrow keys in the comment field do not change reels', async ({ page }) => {
  await installApiBoundary(page);
  const videos = ['First reel', 'Second reel'].map((title, index) => ({
    id: `30000000-0000-4000-8000-00000000000${index + 1}`,
    authorId: user.id,
    videoUrl: 'https://example.test/reel.mp4',
    thumbnailUrl: 'https://example.test/reel.jpg',
    title,
    views: 0,
    likes: 0,
    createdAt: user.createdAt,
    type: 'short',
  }));
  await page.route('**/api/videos', (route) => json(route, videos));
  let commentsUnavailable = true;
  await page.route(`**/api/videos/${videos[0].id}/comments`, (route) => commentsUnavailable
    ? route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'Unavailable' }) })
    : json(route, []));
  await page.route(`**/api/videos/${videos[1].id}/comments`, (route) => json(route, []));
  await page.goto('/videos');
  await page.getByRole('button', { name: 'Watch First reel' }).click();
  await page.getByRole('button', { name: 'Open comments' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Comments could not load' })).toBeVisible();
  commentsUnavailable = false;
  await page.getByRole('button', { name: 'Retry comments' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Comments could not load' })).toHaveCount(0);

  const comment = page.getByRole('textbox', { name: 'Write a comment' });
  await comment.fill('A comment draft');
  await comment.press('ArrowDown');
  await expect(page.locator('.operator-reels-progress strong')).toHaveText('01');
  await comment.press('ArrowUp');
  await expect(page.locator('.operator-reels-progress strong')).toHaveText('01');
  await page.keyboard.press('Escape');
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('.operator-reels-progress strong')).toHaveText('02');
});

test('discovery loads beyond an empty following feed without changing the selected home feed', async ({ page }) => {
  await installApiBoundary(page);
  await page.route('**/api/feed?*', (route) => {
    const mode = new URL(route.request().url()).searchParams.get('mode');
    return json(route, mode === 'for_you' ? [post('An idea beyond your following list.', 'discovery-post')] : []);
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Your people are out there.' })).toBeVisible();
  await page.getByRole('button', { name: 'Explore', exact: true }).first().click();
  await expect(page.getByRole('button', { name: 'Open post: An idea beyond your following list.' })).toBeVisible();
  await page.getByRole('button', { name: 'Home', exact: true }).first().click();
  await expect(page.getByRole('tab', { name: 'Following' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('heading', { name: 'Your people are out there.' })).toBeVisible();
});

test("public beta legal pages show configured, dated policy content", async ({ page }) => {
  await installApiBoundary(page);
  await page.goto("/privacy");
  await expect(page.getByRole("heading", { name: "Privacy Notice" })).toBeVisible();
  await expect(page.getByText("test-public-beta-1", { exact: false })).toBeVisible();
  await expect(page.getByText(/draft|not configured/i)).toHaveCount(0);
});

test("public beta requires consent before opening protected social routes", async ({ page }) => {
  await installApiBoundary(page, { ...user, termsVersion: null, termsAcceptedAt: null, ageConfirmedAt: null });
  await page.goto("/explore");
  await expect(page).toHaveURL(/\/consent$/);
  await expect(page.getByRole("heading", { name: "Review the rules before you enter" })).toBeVisible();
});

test('comments retain failed drafts, prevent duplicate sends, and hide disabled payments', async ({ page }) => {
  await installApiBoundary(page);
  let requests = 0;
  let release!: () => void;
  const pending = new Promise<void>((resolve) => { release = resolve; });
  await page.route('**/api/posts/*/comments', async (route) => {
    requests++;
    if (requests === 1) return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'Comment service unavailable' }) });
    await pending;
    return json(route, { post: { ...post('A real signal delivered through the feed boundary.', '18fac78e-65fa-4fd4-931e-8b79e086c48d'), commentsCount: 1 } });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Reply to post' }).click();
  const composer = page.getByRole('textbox', { name: 'Write a comment' });
  await composer.fill('Keep this draft until the server accepts it.');
  await expect(page.getByRole('button', { name: /UPI Tip/ })).toHaveCount(0);
  await page.getByRole('button', { name: 'Post comment', exact: true }).click();
  await expect(page.getByText('Comment service unavailable')).toBeVisible();
  await expect(composer).toHaveValue('Keep this draft until the server accepts it.');
  await composer.press('Enter');
  await expect(composer).toBeDisabled();
  await page.keyboard.press('Enter');
  await expect.poll(() => requests).toBe(2);
  release();
  await expect(composer).toBeHidden();
  expect(requests).toBe(2);
  await expect(page.getByRole('button', { name: 'View all 1 comments' })).toBeVisible();
});

test('profile achievements use earned server progress and never invent mutual followers', async ({ page }) => {
  const friend = { ...user, id: '10000000-0000-4000-8000-000000000015', username: 'friend', fullName: 'A Known Friend' };
  const target = { ...user, id: '10000000-0000-4000-8000-000000000016', username: 'newcreator', fullName: 'Another Creator' };
  await installApiBoundary(page, { ...user, following: [friend.id] });
  await page.route('**/api/achievements/me', (route) => json(route, [{ id: 'first-post', title: 'First Post', description: 'Publish your first post', icon: 'Sparkles', goal: 1, progress: 1, xp: 50, unlocked: true }]));
  await page.route('**/api/feed?*', (route) => json(route, [{ ...post('A known friend is not automatically a mutual follower.', 'friend-post'), authorId: friend.id }]));
  await page.route(`**/api/users/${friend.id}`, (route) => json(route, friend));
  await page.route(`**/api/users/${target.id}`, (route) => json(route, target));
  await page.route('**/api/users/*/profile-comments', (route) => json(route, [{ id: 'wall-note', targetUserId: target.id, authorId: friend.id, author: friend, content: 'A note from a known friend.', createdAt: user.createdAt }]));
  await page.goto(`/profile/${user.id}`);
  await page.getByRole('button', { name: 'View level 2 achievements' }).click();
  const dialog = page.getByRole('dialog', { name: 'Your Yor achievements' });
  await expect(dialog.getByText('50 XP earned', { exact: true })).toBeVisible();
  await expect(dialog.getByRole('heading', { name: 'First Post' })).toBeVisible();
  await expect(dialog.getByText(/1,850|Yor Pioneer|100 Social Waves/)).toHaveCount(0);
  await page.goto(`/profile/${target.id}`);
  await expect(page.getByRole('heading', { name: target.fullName, exact: true }).first()).toBeVisible();
  await expect(page.getByText('A Known Friend', { exact: true }).first()).toBeVisible();
  await expect(page.getByText(/Followed by/)).toHaveCount(0);
  await expect(page.getByRole('button', { name: /View level .* achievements/ })).toHaveCount(0);
  await expect(page.getByText('Profile Soundtrack', { exact: false })).toHaveCount(0);
});

test('wall comments preserve failed drafts and unknown profiles offer a retry', async ({ page }) => {
  await installApiBoundary(page);
  await page.route('**/api/users/*/profile-comments', (route) => route.request().method() === 'POST'
    ? route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'Wall temporarily unavailable' }) })
    : json(route, []));
  await page.goto(`/profile/${user.id}`);
  const composer = page.getByRole('textbox', { name: 'Write a wall comment' });
  await composer.fill('This wall draft must survive a failed request.');
  await page.getByRole('button', { name: 'Post', exact: true }).click();
  await expect(page.getByText('Wall temporarily unavailable')).toBeVisible();
  await expect(composer).toHaveValue('This wall draft must survive a failed request.');
  const missing = '10000000-0000-4000-8000-000000000017';
  await page.route(`**/api/users/${missing}`, (route) => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'Profile service unavailable' }) }));
  await page.goto(`/profile/${missing}`);
  await expect(page.getByRole('heading', { name: 'Profile unavailable' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Retry profile' })).toBeVisible();
});

test('shared post links fetch uncached posts and recover failed replies', async ({ page }) => {
  await installApiBoundary(page);
  const id = '10000000-0000-4000-8000-000000000021';
  let unavailable = true;
  await page.route(`**/api/posts/${id}`, (route) => json(route, post('A shared post outside the loaded home feed.', id)));
  await page.route(`**/api/posts/${id}/comments`, (route) => unavailable
    ? route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'Replies unavailable' }) })
    : json(route, [{ id: 'reply', authorId: user.id, author: user, content: 'Recovered reply', createdAt: user.createdAt }]));
  await page.goto(`/post/${id}`);
  await expect(page.getByRole('article').getByText('A shared post outside the loaded home feed.')).toBeVisible();
  await expect(page.getByRole('alert').filter({ hasText: 'Replies could not load.' })).toBeVisible();
  unavailable = false;
  await page.getByRole('button', { name: 'Retry replies' }).click();
  await expect(page.getByText('Recovered reply', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('article').getByText('A shared post outside the loaded home feed.')).toBeVisible();
});

test('pending follows preserve existing relationships and favorites across reloads', async ({ page }) => {
  const target = { ...user, id: '10000000-0000-4000-8000-000000000022', username: 'private_creator', fullName: 'Private Creator' };
  const followed = { ...user, id: '10000000-0000-4000-8000-000000000023', username: 'known_creator', fullName: 'Known Creator' };
  const profile = { ...user, following: [followed.id], followingCount: 1, favoriteCreatorIds: [target.id], pendingFollowIds: [] as string[] };
  await installApiBoundary(page, profile);
  await page.route(`**/api/users/${target.id}`, (route) => json(route, target));
  await page.route(`**/api/users/${followed.id}`, (route) => json(route, followed));
  await page.route('**/api/users/me/favorites/creators', (route) => json(route, [target.id]));
  await page.route(`**/api/users/${user.id}/following`, (route) => json(route, [followed]));
  await page.route(`**/api/users/${target.id}/follow`, (route) => {
    profile.pendingFollowIds = [target.id];
    return json(route, { status: 'pending', follower: { ...user, following: undefined, followingCount: 1 }, target });
  });
  await page.route(`**/api/users/${target.id}/unfollow`, (route) => {
    profile.pendingFollowIds = [];
    return json(route, { follower: { ...user, following: undefined, followingCount: 1 }, target });
  });
  await page.goto(`/profile/${target.id}`);
  await expect(page.getByRole('button', { name: 'Remove Private Creator from Favorites' })).toBeVisible();
  await page.getByRole('button', { name: 'Follow', exact: true }).first().click();
  await expect(page.getByRole('button', { name: 'Requested', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Remove Private Creator from Favorites' })).toBeVisible();
  await page.getByRole('link', { name: /Ada Lovelace.*@ada/ }).first().click();
  await page.getByRole('button', { name: '1 Following', exact: true }).click();
  await expect(page.getByRole('dialog', { name: /^following$/i }).getByRole('button', { name: 'Following', exact: true })).toBeVisible();
  await page.goto(`/profile/${target.id}`);
  await expect(page.getByRole('button', { name: 'Requested', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Requested', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Follow', exact: true }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Remove Private Creator from Favorites' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Follow', exact: true }).first()).toBeVisible();
});

test('inbox failures offer a retry without claiming an empty or live-connected inbox', async ({ page }) => {
  await installApiBoundary(page);
  let unavailable = true;
  await page.route('**/api/conversations', (route) => unavailable
    ? route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'Unavailable' }) })
    : json(route, []));
  await page.goto('/messages');
  await expect(page.getByRole('alert').filter({ hasText: 'Your inbox could not refresh.' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Your inbox is clear' })).toHaveCount(0);
  await expect(page.getByText('Periodic updates', { exact: true })).toBeVisible();
  await expect(page.getByText('Connected', { exact: true })).toHaveCount(0);
  unavailable = false;
  await page.getByRole('button', { name: 'Retry inbox' }).click();
  await expect(page.getByRole('heading', { name: 'Your inbox is clear' })).toBeVisible();
  const accessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(accessibility.violations.filter((item) => item.impact === 'critical' || item.impact === 'serious')).toEqual([]);
});

test('message drafts stay with their conversation and survive failed duplicate sends', async ({ page }) => {
  await installApiBoundary(page);
  const peers = ['Alpha Tester', 'Beta Tester'].map((fullName, index) => ({ ...user, id: `10000000-0000-4000-8000-00000000003${index}`, username: `tester_${index}`, fullName }));
  const conversations = peers.map((peer, index) => ({ id: `20000000-0000-4000-8000-00000000003${index}`, participantA: user.id, participantB: peer.id, participantIds: [user.id, peer.id], updatedAt: user.createdAt }));
  await page.route('**/api/conversations', (route) => json(route, conversations.map((conversation) => ({ conversation }))));
  await page.route('**/api/conversations/*/messages', (route) => json(route, []));
  for (const peer of peers) await page.route(`**/api/users/${peer.id}`, (route) => json(route, peer));
  let requests = 0;
  let release!: () => void;
  const delayed = new Promise<void>((resolve) => { release = resolve; });
  await page.route('**/api/messages', async (route) => {
    requests++;
    if (requests === 1) {
      await delayed;
      return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'Unavailable' }) });
    }
    return json(route, { id: 'sent-fixture', conversationId: conversations[0].id, senderId: user.id, recipientId: peers[0].id, content: route.request().postDataJSON().content, createdAt: user.createdAt, seenAt: null });
  });
  await page.goto(`/messages/${conversations[0].id}`);
  const composer = page.getByRole('textbox', { name: 'Message', exact: true });
  await composer.fill('A draft for Alpha only.');
  await page.getByRole('textbox', { name: 'Search conversations' }).fill('Beta');
  await expect(composer).toHaveValue('A draft for Alpha only.');
  await page.getByRole('textbox', { name: 'Search conversations' }).fill('');
  await page.getByRole('button', { name: /Beta Tester.*No messages yet/ }).click();
  await expect(composer).toHaveValue('');
  await composer.fill('A separate draft for Beta.');
  await page.getByRole('button', { name: /Alpha Tester.*No messages yet/ }).click();
  await expect(composer).toHaveValue('A draft for Alpha only.');
  await composer.press('Enter');
  await expect(composer).toBeDisabled();
  await page.keyboard.press('Enter');
  await expect.poll(() => requests).toBe(1);
  release();
  await expect(page.getByRole('alert').filter({ hasText: 'Could not send this message.' })).toBeVisible();
  await expect(composer).toHaveValue('A draft for Alpha only.');
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(composer).toHaveValue('');
  await expect(page.getByRole('article').getByText('A draft for Alpha only.', { exact: true })).toBeVisible();
  expect(requests).toBe(2);
  await page.getByRole('button', { name: /Beta Tester.*No messages yet/ }).click();
  await expect(composer).toHaveValue('A separate draft for Beta.');
  await expect(page.getByRole('button', { name: /Tip creator/ })).toHaveCount(0);
});

test('settings expose only available notifications with accessible mobile controls', async ({ page }, testInfo) => {
  await installApiBoundary(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/settings');
  await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible();
  await expect(page.getByText('Push notifications are off for this beta', { exact: true })).toBeVisible();
  await expect(page.getByRole('switch', { name: 'Push notifications' })).toHaveCount(0);
  await expect(page.getByRole('combobox', { name: 'Profile visibility' })).toBeEnabled();
  await expect(page.getByRole('switch', { name: 'Message requests', exact: true })).toBeChecked();
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Account deletion confirmation' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(result.violations.filter((item) => item.impact === 'critical' || item.impact === 'serious')).toEqual([]);
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.screenshot({ path: testInfo.outputPath('settings-mobile.png'), fullPage: true });
});

test('privacy preferences show confirmed state, prevent duplicate saves, and recover after a failure', async ({ page }) => {
  const profile = { ...user, privacy: { ...user.privacy } };
  await installApiBoundary(page, profile);
  let attempts = 0;
  let release!: () => void;
  const pending = new Promise<void>((resolve) => { release = resolve; });
  await page.route('**/api/users/me/privacy', async (route) => {
    attempts++;
    if (attempts === 1) {
      await pending;
      return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'Privacy preferences could not be saved' }) });
    }
    profile.privacy = { ...profile.privacy, ...route.request().postDataJSON() };
    return json(route, profile.privacy);
  });
  await page.goto('/settings');
  const strangers = page.getByRole('switch', { name: 'Direct Messages from strangers', exact: true });
  const requests = page.getByRole('switch', { name: 'Message requests', exact: true });
  await strangers.click();
  await expect(strangers).toBeDisabled();
  await expect(requests).toBeDisabled();
  await expect(strangers).toBeChecked();
  await expect(page.getByRole('status').filter({ hasText: 'Saving privacy preferences' })).toBeVisible();
  expect(attempts).toBe(1);
  release();
  await expect(page.getByRole('alert').filter({ hasText: 'Privacy preferences could not be saved' })).toBeVisible();
  await expect(strangers).toBeEnabled();
  await expect(strangers).toBeChecked();
  await strangers.click();
  await expect(strangers).not.toBeChecked();
  await expect(requests).toBeChecked();
  await expect(page.getByRole('alert').filter({ hasText: 'Privacy preferences could not be saved' })).toHaveCount(0);
  expect(attempts).toBe(2);
  await page.reload();
  await expect(strangers).not.toBeChecked();
  await expect(requests).toBeChecked();
});

test('activity failures are retryable and never look caught up', async ({ page }) => {
  await installApiBoundary(page);
  await page.setViewportSize({ width: 390, height: 844 });
  let unavailable = true;
  const failure = (route: Route) => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'Unavailable' }) });
  await page.route('**/api/notifications', (route) => unavailable ? failure(route) : json(route, []));
  await page.route('**/api/users/me/follow-requests', (route) => unavailable ? failure(route) : json(route, []));
  await page.goto('/notifications');
  await expect(page.getByRole('alert').filter({ hasText: 'Your activity could not refresh.' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'You’re all caught up' })).toHaveCount(0);
  await expect(page.getByText('Clear', { exact: true })).toHaveCount(0);
  unavailable = false;
  await page.getByRole('button', { name: 'Retry activity' }).click();
  await expect(page.getByRole('heading', { name: 'You’re all caught up' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Retry activity' })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(result.violations.filter((item) => item.impact === 'critical' || item.impact === 'serious')).toEqual([]);
});

test('follow decisions prevent duplicate actions and activity read-all handles failure and retry', async ({ page }) => {
  await installApiBoundary(page);
  const requester = { ...user, id: '10000000-0000-4000-8000-000000000080', username: 'river', fullName: 'River Stone' };
  let requests = [{ id: 'follow-fixture', requesterId: requester.id, targetId: user.id, status: 'pending', createdAt: new Date().toISOString(), requester }];
  await page.route('**/api/users/me/follow-requests', (route) => json(route, requests));
  const notification = { id: 'notification-fixture', type: 'like', title: 'New like', message: 'River liked your post', relatedId: 'post-fixture', metadata: { actorId: requester.id }, readAt: null, createdAt: new Date().toISOString() };
  await page.route('**/api/notifications', (route) => json(route, [notification]));
  await page.route(`**/api/users/${requester.id}`, (route) => json(route, requester));
  let release!: () => void;
  const pending = new Promise<void>((resolve) => { release = resolve; });
  let decisions = 0;
  await page.route('**/api/users/me/follow-requests/*/accept', async (route) => {
    decisions++;
    await pending;
    requests = [];
    return json(route, { follower: requester, target: { ...user, followerCount: 13 } });
  });
  let readAttempts = 0;
  await page.route('**/api/notifications/read-all', async (route) => {
    readAttempts++;
    if (readAttempts === 1) return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'Read status could not be saved' }) });
    return json(route, null);
  });
  await page.goto('/notifications');
  await expect(page.getByRole('link').filter({ hasText: 'River Stone liked your post' })).toBeVisible();
  await page.getByRole('button', { name: 'Accept', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Saving…', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Decline', exact: true })).toBeDisabled();
  expect(decisions).toBe(1);
  release();
  await expect(page.getByRole('heading', { name: 'Follow requests' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Mark all read' }).click();
  await expect(page.getByText('Read status could not be saved')).toBeVisible();
  await expect(page.getByRole('link').filter({ hasText: 'River Stone liked your post' })).toHaveAttribute('data-unread', 'true');
  await page.getByRole('button', { name: 'Mark all read' }).click();
  await expect(page.getByRole('link').filter({ hasText: 'River Stone liked your post' })).not.toHaveAttribute('data-unread', 'true');
  expect(readAttempts).toBe(2);
});
