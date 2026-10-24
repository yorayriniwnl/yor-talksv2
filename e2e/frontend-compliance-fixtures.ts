import { expect, type Page, type Route } from "@playwright/test";

export const complianceUser = {
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
export const complianceCapabilities = { social: true, publish: true, messaging: true, payments: true, seller: true, memberships: true, live: true, rtc: true, ai: true, analytics: true, profiling: true };
export const complianceAdultEligibility = { experience: 'adult_18_plus', activated: true, capabilities: complianceCapabilities, maximumContentRating: 'mature', policyVersions: ['test-policy-v1'], revision: 'a'.repeat(64), reason: null, publicBrowsingAllowed: true };

export function compliancePost(content: string, id: string) {
  return {
    id,
    authorId: complianceUser.id,
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

export async function complianceJson(route: Route, data: unknown, meta: Record<string, unknown> = {}) {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ success: true, message: "OK", data, errors: [], meta }),
  });
}

export async function installComplianceApiBoundary(page: Page, profile = complianceUser, eligibility: unknown | (() => unknown) = complianceAdultEligibility, guardianAuthorizations: unknown | (() => unknown) = []) {
  const unhandled: string[] = [];
  const requestCounts = new Map<string,number>();
  page.on('close', () => expect(unhandled, 'Every mocked API route must be explicit').toEqual([]));
  await page.route("**/socket.io/**", (route) => route.abort());
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace(/^\/api/, "") || "/";
    requestCounts.set(path,(requestCounts.get(path) ?? 0)+1);

    if (path === "/auth/refresh" && request.method() === "POST") {
      return complianceJson(route, { accessToken: "browser-smoke-access-token" });
    }
    if (path === "/users/me" && request.method() === "GET") return complianceJson(route, profile);
    if (path === '/users/me/eligibility' && request.method() === 'GET') {
      const value = typeof eligibility === 'function' ? eligibility() : eligibility;
      if (value === null) return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'Verification is temporarily unavailable' }) });
      return complianceJson(route, value);
    }
    if (path === '/users/me/guardian-authorizations' && request.method() === 'GET') {
      const value = typeof guardianAuthorizations === 'function' ? guardianAuthorizations() : guardianAuthorizations;
      return complianceJson(route, value);
    }
    if (path === "/users/me/premium-profile" && request.method() === "GET") return complianceJson(route, {
      selection: { bioStyleId: 'default', messageFontId: 'default', storyFontId: 'default', appIconId: 'yor-default' },
      options: { bioStyles: [{ id: 'default', label: 'Default' }], messageStyles: [{ id: 'default', label: 'Default' }], storyStyles: [{ id: 'default', label: 'Default' }], appIcons: [{ id: 'yor-default', label: 'Yor', platforms: ['web'] }] },
      enabledFeatures: {},
    });
    if (path === `/users/${complianceUser.id}`) return complianceJson(route, profile);
    if (path === "/users/search") return complianceJson(route, [complianceUser]);
    if (path === "/search") return complianceJson(route, { users: [], posts: [] });
    if (path === "/readyz") return complianceJson(route, { status: 'ready' });
    if (path === "/feed" && request.method() === "GET") {
      return complianceJson(route, [compliancePost("A real signal delivered through the feed boundary.", "18fac78e-65fa-4fd4-931e-8b79e086c48d")], {
        nextCursor: null,
        hasMore: false,
        limit: 20,
      });
    }
    if (path === "/posts" && request.method() === "POST") {
      const payload = request.postDataJSON() as { content: string };
      return complianceJson(route, compliancePost(payload.content, "292d72b6-6bd1-4693-91e8-b4dc32302c7c"));
    }

    const ownerLists = ['/following', '/followers', '/feed', '/showcases', '/profile-comments', '/pinned-posts'].map((suffix) => '/users/' + complianceUser.id + suffix);
    const emptyLists = ['/notifications', '/users/me/follow-requests', '/users/me/close-friends', '/users/me/favorites/creators', '/users/me/contact-shields', '/conversations', '/stories', '/notes', '/videos', '/articles', '/events', '/products', '/products/orders', '/communities', '/creator/workspace', '/achievements/me', ...ownerLists];
    if (request.method() === 'GET' && emptyLists.includes(path)) return complianceJson(route, []);
    if (request.method() === 'GET' && ['/posts/liked', '/posts/saved'].includes(path)) return complianceJson(route, [], { hasMore: false, nextCursor: null });
    if (request.method() === 'GET' && path === '/users/' + complianceUser.id + '/posts') return complianceJson(route, [], { hasMore: false, nextCursor: null });
    unhandled.push(`${request.method()} ${path}`);
    await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ success: false, message: `Unhandled test route: ${request.method()} ${path}` }) });
    throw new Error(`Unhandled test route: ${request.method()} ${path}`);
  });
  return requestCounts;
}
