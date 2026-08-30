import { expect, test, type Page, type Route } from "@playwright/test";

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
