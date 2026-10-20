import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { after, test, type TestContext } from "node:test";
import bcrypt from "bcryptjs";
import { authenticator } from "otplib";
import { pool } from "@workspace/db";
import { AuthService } from "../services/auth-service.js";
import { allowedEmailDomains, env } from "../config/env.js";
import { encryptSecret } from "../lib/secret-box.js";
import type { UserRecord } from "../types/index.js";

after(() => pool.end());

async function fixture(t: TestContext) {
  const originalOptions = authenticator.options;
  const originalClientId = env.GOOGLE_CLIENT_ID;
  const originalDomains = [...allowedEmailDomains];
  authenticator.options = { epoch: Date.UTC(2026, 9, 17, 0, 0, 15) };
  env.GOOGLE_CLIENT_ID = "synthetic-client";
  allowedEmailDomains.splice(0);
  t.after(() => {
    authenticator.resetOptions(); authenticator.options = originalOptions;
    env.GOOGLE_CLIENT_ID = originalClientId;
    allowedEmailDomains.splice(0, allowedEmailDomains.length, ...originalDomains);
  });
  const secret = authenticator.generateSecret();
  const user = {
    id: randomUUID(), email: "synthetic@gmail.com", emailVerified: true,
    username: "synthetic", passwordHash: await bcrypt.hash("synthetic-password", 4),
    accountStatus: "active", authVersion: 0, googleSubject: "synthetic-subject",
    totpSecret: encryptSecret(secret, env.TOTP_ENCRYPTION_KEY), settings: {},
  } as UserRecord;
  const claims = new Map<string, { value: string; ttl: number }>();
  let disableCalls = 0;
  const redis = {
    hashToken: async (value: string) => createHash("sha256").update(value).digest("hex"),
    setIfAbsentStrict: async (key: string, value: string, ttl: number) => {
      if (claims.has(key)) return false;
      claims.set(key, { value, ttl }); return true;
    },
    claimEmailOtpStrict: async () => JSON.stringify({ userId: user.id, authVersion: 0, reservationId: "fixture-reservation" }),
    deleteEmailOtpIfReservationStrict: async () => true,
    getStrict: async () => encryptSecret(secret, env.TOTP_ENCRYPTION_KEY),
    deleteIfValueStrict: async () => true,
  };
  const service = new AuthService({
    findById: async () => user, findByEmail: async () => user,
    findByGoogleSubject: async () => user,
    enableTwoFactorIfDisabled: async (_id: string, value: string) => { user.totpSecret = value; return true; },
    disableTwoFactorIfMatches: async () => { disableCalls++; return true; },
  } as never, redis as never, {
    detectAbuse: async () => false, createAuditEvent: () => {},
  } as never, undefined, undefined, () => ({
    verifyIdToken: async () => ({ getPayload: () => ({ sub: user.googleSubject, email: user.email, email_verified: true }) }),
  }) as never);
  const sessions = t.mock.method(service as any, "createSession", async () => ({ user }));
  const login = (code = authenticator.generate(secret)) => service.login({
    identifier: user.email, password: "synthetic-password", totpCode: code,
  });
  return { service, redis, user, secret, claims, sessions, login, disableCalls: () => disableCalls };
}

test("concurrent password logins consume a valid authenticator code exactly once", async t => {
  const f = await fixture(t);
  const outcomes = await Promise.allSettled(Array.from({ length: 20 }, () => f.login()));
  assert.equal(outcomes.filter(result => result.status === "fulfilled").length, 1);
  assert.equal(outcomes.filter(result => result.status === "rejected" && /Invalid two-factor/.test(result.reason.message)).length, 19);
  assert.equal(f.sessions.mock.callCount(), 1);
  assert.equal(f.claims.size, 1);
  const [key, claim] = [...f.claims][0];
  assert.match(key, new RegExp(`^totp-used:${f.user.id}:[a-f0-9]{64}$`));
  assert.deepEqual(claim, { value: "used", ttl: 90 });
  assert.equal(key.includes(f.secret), false);
});

test("authenticator replay is denied across password, Google, email OTP and disable flows", async t => {
  const f = await fixture(t);
  const code = authenticator.generate(f.secret);
  await f.login(code);
  await assert.rejects(f.service.loginWithGoogle({ credential: "synthetic", totpCode: code }), /Invalid two-factor/);
  await assert.rejects(f.service.loginWithEmailOtp({ email: f.user.email, code: "123456", totpCode: code }), /Invalid two-factor/);
  assert.equal(await f.service.disableTwoFactor(f.user.id, code), false);
  assert.equal(f.disableCalls(), 0);
  assert.equal(f.sessions.mock.callCount(), 1);
  authenticator.options = { epoch: Date.UTC(2026, 9, 17, 0, 0, 45) };
  await f.login();
  assert.equal(f.sessions.mock.callCount(), 2, "the next valid authenticator period remains usable");
});

test("setup consumes its authenticator code and a fresh code is required for login", async t => {
  const f = await fixture(t);
  f.user.totpSecret = null;
  const code = authenticator.generate(f.secret);
  assert.equal(await f.service.confirmTwoFactorSetup(f.user.id, code), true);
  await assert.rejects(f.login(code), /Invalid two-factor/);
  assert.equal(f.sessions.mock.callCount(), 0);
});

test("invalid authenticator codes do not claim Redis and a replay-store outage fails closed", async t => {
  const f = await fixture(t);
  await assert.rejects(f.login("invalid"), /Invalid two-factor/);
  assert.equal(f.claims.size, 0);
  t.mock.method(f.redis, "setIfAbsentStrict", async () => { throw new Error("synthetic replay-store outage"); });
  await assert.rejects(f.login(), /synthetic replay-store outage/);
  assert.equal(f.sessions.mock.callCount(), 0);
});
