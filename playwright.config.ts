import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  // The Vite dev server transforms the full social shell on first navigation;
  // keep CI from marking a cold-start browser flow flaky while retaining a
  // bounded timeout for genuine hangs.
  timeout: 60_000,
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["line"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: {
    command: "pnpm --filter @workspace/social exec vite --config vite.config.ts --host 127.0.0.1 --port 4173",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      ...process.env,
      VITE_REALTIME_ENABLED: "false",
      VITE_PUBLIC_BETA: "true",
      VITE_TERMS_VERSION: "test-public-beta-1",
      VITE_MINIMUM_AGE: "18",
      VITE_LEGAL_OPERATOR_NAME: "Yor Talks Test Operator",
      VITE_LEGAL_OPERATOR_ADDRESS: "1 Test Street, Bhubaneswar, India",
      VITE_LEGAL_EFFECTIVE_DATE: "2026-08-30",
      VITE_LEGAL_GOVERNING_LAW: "India",
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
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
