import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { test } from "node:test";

test("invalid boolean environment values fail closed at API startup", () => {
  const result = spawnSync(
    process.execPath,
    ["--import", "tsx", "--eval", "import './src/config/env.ts'"],
    {
      cwd: path.resolve(import.meta.dirname, "../.."),
      encoding: "utf8",
      timeout: 10_000,
      env: {
        ...process.env,
        NODE_ENV: "test",
        PUBLIC_BETA: "treu",
      },
    },
  );

  assert.notEqual(result.status, 0);
  assert.match(`${result.stdout}\n${result.stderr}`, /PUBLIC_BETA|boolean/i);
});

test("production startup fails closed when required dependencies are unavailable", () => {
  const result = spawnSync(
    process.execPath,
    ["--import", "tsx", "--eval", "import './src/index.ts'"],
    {
      cwd: path.resolve(import.meta.dirname, "../.."),
      encoding: "utf8",
      timeout: 15_000,
      env: {
        ...process.env,
        NODE_ENV: "production",
        PORT: "4010",
        DATABASE_URL: "postgresql://127.0.0.1:65432/does_not_exist",
        REDIS_URL: "redis://127.0.0.1:6399",
        JWT_SECRET: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        JWT_REFRESH_SECRET: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        CONTACT_SHIELD_SECRET: "cccccccccccccccccccccccccccccccc",
        TOTP_ENCRYPTION_KEY: "dddddddddddddddddddddddddddddddd",
        CORS_ORIGINS: "https://app.example.com",
        CLIENT_ORIGIN: "https://app.example.com",
        TERMS_VERSION: "2026-09-01",
        MINIMUM_AGE: "18",
        PUBLIC_BETA: "true",
        ALLOWED_EMAIL_DOMAINS: "",
        GOOGLE_CLIENT_ID: "test-google-client-id",
        CLOUDINARY_CLOUD_NAME: "demo-cloud",
        CLOUDINARY_API_KEY: "demo-key",
        CLOUDINARY_API_SECRET: "demo-secret",
        RESEND_API_KEY: "re_demo_key",
        EMAIL_FROM: "hello@example.com",
        LEGAL_OPERATOR_NAME: "Example Operator",
        LEGAL_OPERATOR_ADDRESS: "123 Example Road",
        LEGAL_EFFECTIVE_DATE: "2026-01-01",
        LEGAL_GOVERNING_LAW: "US",
        PRIVACY_CONTACT_EMAIL: "privacy@example.com",
        SUPPORT_EMAIL: "support@example.com",
        GRIEVANCE_OFFICER_NAME: "Example Grievance Officer",
        GRIEVANCE_CONTACT_EMAIL: "grievances@example.com",
      },
    },
  );

  assert.equal(result.status, 1, `Expected startup to fail, got status ${result.status}: ${result.stdout}\n${result.stderr}`);
  assert.match(`${result.stdout}\n${result.stderr}`, /production dependency check failed|database|redis/i);
});
