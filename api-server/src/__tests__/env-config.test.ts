import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { test } from "node:test";

test('eligibility defaults stay unavailable and sensitive feature releases fail closed', () => {
  const defaults = spawnSync(process.execPath, ['--import','tsx','--eval',
    "import {env} from './src/config/env.ts'; console.log(JSON.stringify({adapter:env.ELIGIBILITY_ASSURANCE_ADAPTER,registry:env.ELIGIBILITY_POLICY_SOURCE,seller:env.SELLER_ENABLED,memberships:env.MEMBERSHIPS_ENABLED,ai:env.AI_COMPANION_ENABLED}))"],
    { cwd: path.resolve(import.meta.dirname, '../..'), encoding: 'utf8', timeout: 10_000,
      env: { ...process.env, NODE_ENV: 'test', PUBLIC_BETA: 'false', SELLER_ENABLED: '', MEMBERSHIPS_ENABLED: '', AI_COMPANION_ENABLED: '' } });
  assert.equal(defaults.status, 0, defaults.stderr);
  assert.deepEqual(JSON.parse(defaults.stdout.trim()), { adapter: 'unavailable', registry: 'approved_registry', seller: false, memberships: false, ai: false });
  for (const input of [{ ELIGIBILITY_ASSURANCE_ADAPTER: 'fixture' }, { ELIGIBILITY_POLICY_SOURCE: 'fixture' }, { AI_COMPANION_ENABLED: 'treu' }]) {
    const result = spawnSync(process.execPath, ['--import','tsx','--eval', "import './src/config/env.ts'"],
      { cwd: path.resolve(import.meta.dirname, '../..'), encoding: 'utf8', timeout: 10_000,
        env: { ...process.env, NODE_ENV: 'production', PUBLIC_BETA: 'false', ...input } });
    assert.notEqual(result.status, 0);
    assert.match(`${result.stdout}\n${result.stderr}`, /ELIGIBILITY_ASSURANCE_ADAPTER|ELIGIBILITY_POLICY_SOURCE|AI_COMPANION_ENABLED/);
  }
});

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

test("production configuration rejects cleartext browser origins", () => {
  const result = spawnSync(
    process.execPath,
    ["--import", "tsx", "--eval", "import './src/config/env.ts'"],
    {
      cwd: path.resolve(import.meta.dirname, "../.."),
      encoding: "utf8",
      timeout: 10_000,
      env: {
        ...process.env,
        NODE_ENV: "production",
        JWT_SECRET: "a".repeat(40),
        JWT_REFRESH_SECRET: "b".repeat(40),
        CONTACT_SHIELD_SECRET: "c".repeat(40),
        TOTP_ENCRYPTION_KEY: "d".repeat(40),
        DATABASE_URL: "postgresql://app:secret@db.example.com:5432/yor",
        REDIS_URL: "redis://redis.example.com:6379",
        CLIENT_ORIGIN: "http://app.example.com",
        CORS_ORIGINS: "http://app.example.com",
        CLOUDINARY_CLOUD_NAME: "yor-cloud",
        CLOUDINARY_API_KEY: "cloud-key",
        CLOUDINARY_API_SECRET: "cloud-secret",
        RESEND_API_KEY: "re_live_key",
        EMAIL_FROM: "hello@example.com",
        OPENAI_API_KEY: "sk-live-placeholder-value",
        PUBLIC_BETA: "false",
        PAYMENTS_ENABLED: "false",
        LIVE_ROOMS_ENABLED: "false",
        WEB_PUSH_ENABLED: "false",
        RTC_CALLS_ENABLED: "false",
      },
    },
  );
  assert.notEqual(result.status, 0);
  assert.match(`${result.stdout}\n${result.stderr}`, /canonical HTTPS origins/);
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
        METRICS_BEARER_TOKEN_FILE: "/run/secrets/metrics_bearer_token",
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
