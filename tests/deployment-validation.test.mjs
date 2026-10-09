import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { validateConfig } from "../ops/validate-deployment-config.mjs";

function makeValidEnv(overrides = {}) {
  return {
    POSTGRES_DB: "yor_talks",
    POSTGRES_USER: "yor_talks",
    POSTGRES_PASSWORD: "a".repeat(64),
    DATABASE_URL: "postgresql://yor_talks:pass@postgres:5432/yor_talks",
    REDIS_PASSWORD: "b".repeat(64),
    JWT_SECRET: "c".repeat(64),
    JWT_REFRESH_SECRET: "d".repeat(64),
    CONTACT_SHIELD_SECRET: "e".repeat(64),
    TOTP_ENCRYPTION_KEY: "f".repeat(64),
    TERMS_VERSION: "2026-08-public-beta-1",
    MINIMUM_AGE: "18",
    CLIENT_ORIGIN: "https://yor-talks.example",
    CORS_ORIGINS: "https://yor-talks.example",
    LEGAL_OPERATOR_NAME: "Example Operator",
    LEGAL_OPERATOR_ADDRESS: "Example Address",
    LEGAL_EFFECTIVE_DATE: "2026-08-30",
    LEGAL_GOVERNING_LAW: "Example Law",
    PRIVACY_CONTACT_EMAIL: "privacy@yor-talks.example",
    SUPPORT_EMAIL: "support@yor-talks.example",
    GRIEVANCE_OFFICER_NAME: "Example Officer",
    GRIEVANCE_CONTACT_EMAIL: "grievance@yor-talks.example",
    METRICS_BEARER_TOKEN_FILE: "/etc/dummy/token",
    RCLONE_CONFIG_FILE: "/etc/dummy/rclone.conf",
    BACKUP_AGE_RECIPIENT: "age1example",
    BACKUP_REMOTE: "remote:yor-talks",
    ALERTMANAGER_WEBHOOK_URL: "https://alerts.example/webhook",
    ALERTMANAGER_WEBHOOK_USER: "user",
    ALERTMANAGER_WEBHOOK_PASSWORD_FILE: "/etc/dummy/pwd",
    WEB_PORT: "8080",
    API_HOST_PORT: "4000",
    ...overrides,
  };
}

test("validateConfig passes on a complete valid production configuration (checkFiles=false)", () => {
  const env = makeValidEnv();
  const res = validateConfig(env, { checkFiles: false });
  assert.equal(res.ok, true, `Validation failed: ${res.errors.join(", ")}`);
  assert.equal(res.errors.length, 0);
  assert.ok(res.passed.length > 5);
});

test("validateConfig fails if a required key is missing", () => {
  const env = makeValidEnv({ JWT_SECRET: "" });
  const res = validateConfig(env, { checkFiles: false });
  assert.equal(res.ok, false);
  assert.ok(res.errors.some((e) => e.includes("Missing or empty required variable: JWT_SECRET")));
});

test("validateConfig detects unreplaced CHANGE_ME placeholders", () => {
  const env = makeValidEnv({ JWT_SECRET: "CHANGE_ME_64_HEX" });
  const res = validateConfig(env, { checkFiles: false, checkPlaceholders: true });
  assert.equal(res.ok, false);
  assert.ok(res.errors.some((e) => e.includes("contains unreplaced placeholder")));
});

test("validateConfig detects insufficient secret length", () => {
  const env = makeValidEnv({ TOTP_ENCRYPTION_KEY: "short-key-123" });
  const res = validateConfig(env, { checkFiles: false });
  assert.equal(res.ok, false);
  assert.ok(res.errors.some((e) => e.includes("TOTP_ENCRYPTION_KEY length is insufficient")));
});

test("validateConfig detects secret reuse across core cryptographic keys", () => {
  const reused = "x".repeat(64);
  const env = makeValidEnv({ JWT_SECRET: reused, JWT_REFRESH_SECRET: reused });
  const res = validateConfig(env, { checkFiles: false });
  assert.equal(res.ok, false);
  assert.ok(res.errors.some((e) => e.includes("Security violation: JWT_SECRET and JWT_REFRESH_SECRET reuse the same secret")));
});

test("validateConfig detects port collisions between WEB_PORT and API_HOST_PORT", () => {
  const env = makeValidEnv({ WEB_PORT: "4000", API_HOST_PORT: "4000" });
  const res = validateConfig(env, { checkFiles: false });
  assert.equal(res.ok, false);
  assert.ok(res.errors.some((e) => e.includes("Port collision")));
});

test("validateConfig enforces HTTPS on CLIENT_ORIGIN in production", () => {
  const env = makeValidEnv({ CLIENT_ORIGIN: "http://insecure.example" });
  const res = validateConfig(env, { checkFiles: false, target: "production" });
  assert.equal(res.ok, false);
  assert.ok(res.errors.some((e) => e.includes("CLIENT_ORIGIN must use HTTPS")));
});

test("validateConfig validates real file existence and minimum size when checkFiles=true", () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "yor-test-cfg-"));
  const tokenFile = path.join(tmpDir, "metrics.token");
  const pwdFile = path.join(tmpDir, "pwd.txt");
  const rcloneFile = path.join(tmpDir, "rclone.conf");

  fs.writeFileSync(tokenFile, "t".repeat(32));
  fs.writeFileSync(pwdFile, "p".repeat(16));
  fs.writeFileSync(rcloneFile, "r".repeat(16));

  const env = makeValidEnv({
    METRICS_BEARER_TOKEN_FILE: tokenFile,
    ALERTMANAGER_WEBHOOK_PASSWORD_FILE: pwdFile,
    RCLONE_CONFIG_FILE: rcloneFile,
  });

  const res = validateConfig(env, { checkFiles: true });
  assert.equal(res.ok, true, `Validation failed with errors: ${res.errors.join("; ")}`);

  // Now truncate token file to make it fail size check
  fs.writeFileSync(tokenFile, "short");
  const failRes = validateConfig(env, { checkFiles: true });
  assert.equal(failRes.ok, false);
  assert.ok(failRes.errors.some((e) => e.includes("METRICS_BEARER_TOKEN_FILE is too small")));

  fs.rmSync(tmpDir, { recursive: true, force: true });
});
