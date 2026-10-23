import { defineConfig, devices } from "@playwright/test";

const requestedPort = process.env.PLAYWRIGHT_PORT || "4173";
if (!/^\d+$/.test(requestedPort)) {
  throw new Error("PLAYWRIGHT_PORT must be an integer between 1024 and 65535");
}
const previewPort = Number(requestedPort);
if (previewPort < 1024 || previewPort > 65535) {
  throw new Error("PLAYWRIGHT_PORT must be an integer between 1024 and 65535");
}
const previewUrl = `http://127.0.0.1:${previewPort}`;

export default defineConfig({
  testDir: "./e2e",
  // Exercise production chunks; dev-server transformation time is not an E2E
  // product signal. Keep hangs bounded and surface retries as failures in CI.
  timeout: 60_000,
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: process.env.CI ? 1 : undefined,
  // "github" turns each failure into a check annotation readable without logs.
  reporter: process.env.CI ? [["github"], ["line"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: previewUrl,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: {
    command: `pnpm --filter @workspace/social exec node scripts/build.mjs --outDir dist/e2e && pnpm --filter @workspace/social exec vite preview --outDir dist/e2e --host 127.0.0.1 --port ${previewPort}`,
    url: previewUrl,
    reuseExistingServer: false,
    timeout: 300_000,
    env: {
      ...process.env,
      VITE_REALTIME_ENABLED: "false",
      VITE_PUBLIC_ORIGIN: "https://yor-talks.test",
      VITE_PUBLIC_BETA: "true",
      VITE_TERMS_VERSION: "test-public-beta-1",
      VITE_LEGAL_CONTENT_REVIEWED: "true",
      VITE_LEGAL_OPERATOR_NAME: "Yor Talks Test Operator",
      VITE_LEGAL_OPERATOR_ADDRESS: "1 Test Street, Synthetic Test City",
      VITE_LEGAL_EFFECTIVE_DATE: "2026-10-15",
      VITE_LEGAL_GOVERNING_LAW: "Synthetic CI fixture only",
      VITE_PRIVACY_CONTACT_EMAIL: "privacy@example.test",
      VITE_SUPPORT_EMAIL: "support@example.test",
      VITE_GRIEVANCE_OFFICER_NAME: "Yor Talks Test Officer",
      VITE_GRIEVANCE_CONTACT_EMAIL: "grievance@example.test",
      VITE_GOOGLE_CLIENT_ID: "test.apps.googleusercontent.com",
    },
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // API/provider fixtures are fulfilled by routes. Prevent an omitted
        // external fixture from reaching Google, storage, or stock-image hosts.
        launchOptions: {
          args: ["--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1, EXCLUDE localhost"],
        },
      },
    },
  ],
});
