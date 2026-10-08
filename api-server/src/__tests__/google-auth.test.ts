import assert from "node:assert/strict";
import { after, mock, test } from "node:test";
import { randomUUID } from "node:crypto";
import { OAuth2Client } from "google-auth-library";
import { authenticator } from "otplib";
import { pool } from "@workspace/db";
import { env } from "../config/env.js";
import { AuthService, GoogleLinkVerificationRequiredError, TwoFactorRequiredError, isGoogleAuthoritativeEmail } from "../services/auth-service.js";
import { RedisRepository } from "../repositories/redis-repository.js";
import { UserRepository } from "../repositories/user-repository.js";
import { createTestUser } from "./test-helpers.js";

// The verifier is stubbed ONLY in this test worker. It models the identity
// returned by Google's verifier, not Google's cryptographic JWT verification.
type Payload = { sub: string; email: string; email_verified: boolean; hd?: string };
const credentials = new Map<string, Payload>();
const verified = mock.method(OAuth2Client.prototype, "verifyIdToken", async ({ idToken }) =>
  ({ getPayload: () => credentials.get(idToken) }) as never);
const originalClientId = env.GOOGLE_CLIENT_ID;
env.GOOGLE_CLIENT_ID = "1234567890-test.apps.googleusercontent.com";

const users = new UserRepository();
const redis = new RedisRepository();
const auth = new AuthService(users, redis);
const testUsers: string[] = [];

function credential(sub: string, email: string, opts: Partial<Payload> = {}): string {
  const key = randomUUID();
  credentials.set(key, { sub, email, email_verified: true, ...opts });
  return key;
}

async function account(email: string) {
  const user = await createTestUser(users, {
    email,
    username: `google-${randomUUID().slice(0, 12)}`,
    emailVerified: true,
    googleSubject: null,
  });
  testUsers.push(user.id);
  return user;
}

after(async () => {
  verified.mock.restore();
  env.GOOGLE_CLIENT_ID = originalClientId;
  for (const id of testUsers) {
    for (const key of await redis.scanStrict(`session:${id}:*`)) await redis.delStrict(key);
    await users.deleteById(id);
  }
  await redis.disconnect();
  await pool.end();
});

test("only Google-authoritative domains qualify for automatic email account linking", () => {
  assert.equal(isGoogleAuthoritativeEmail("someone@gmail.com"), true);
  assert.equal(isGoogleAuthoritativeEmail("someone@googlemail.com"), true);
  assert.equal(isGoogleAuthoritativeEmail("person@company.example", "company.example"), true);
  assert.equal(isGoogleAuthoritativeEmail("person@company.example", "other.example"), false);
  assert.equal(isGoogleAuthoritativeEmail("person@external.example"), false);
});

test("untrusted third-party Google email cannot attach to an existing Yor identity", async () => {
  const email = `person-${randomUUID().slice(0, 12)}@external.example`;
  const user = await account(email);
  await assert.rejects(
    auth.loginWithGoogle({ credential: credential(randomUUID(), email) }),
    GoogleLinkVerificationRequiredError,
  );
  assert.equal((await users.findById(user.id))?.googleSubject, null);
});

test("trusted Gmail Google account can link and create a session", async () => {
  const email = `person-${randomUUID().slice(0, 12)}@gmail.com`;
  const user = await account(email);
  const subject = `google-${randomUUID()}`;
  const result = await auth.loginWithGoogle({ credential: credential(subject, email) });
  assert.equal(result.user.id, user.id);
  assert.ok(result.tokens.accessToken);
  assert.equal((await users.findById(user.id))?.googleSubject, subject);
});

test("hosted-domain Google Account is accepted only when hd matches the email domain", async () => {
  const email = `person-${randomUUID().slice(0, 12)}@company.example`;
  const user = await account(email);
  const subject = `google-${randomUUID()}`;
  await assert.rejects(
    auth.loginWithGoogle({ credential: credential(subject, email, { hd: "wrong.example" }) }),
    GoogleLinkVerificationRequiredError,
  );
  assert.equal((await users.findById(user.id))?.googleSubject, null);
  await auth.loginWithGoogle({ credential: credential(subject, email, { hd: "company.example" }) });
  assert.equal((await users.findById(user.id))?.googleSubject, subject);
});

test("wrong TOTP and unapproved device challenge never persist a Google link", async () => {
  const email = `person-${randomUUID().slice(0, 12)}@gmail.com`;
  const user = await account(email);
  const setup = await auth.beginTwoFactorSetup(user.id);
  assert.ok(setup);
  assert.equal(await auth.confirmTwoFactorSetup(user.id, authenticator.generate(setup.secret)), true);
  const subject = `google-${randomUUID()}`;
  const googleCredential = credential(subject, email);
  const actualCode = authenticator.generate(setup.secret);
  const wrongCode = actualCode === "000000" ? "111111" : "000000";
  await assert.rejects(auth.loginWithGoogle({ credential: googleCredential, totpCode: wrongCode }), /Invalid two-factor code/);
  assert.equal((await users.findById(user.id))?.googleSubject, null);

  let challenge: NonNullable<TwoFactorRequiredError["challenge"]> | undefined;
  await assert.rejects(auth.loginWithGoogle({ credential: googleCredential }), error => {
    assert.ok(error instanceof TwoFactorRequiredError);
    challenge = error.challenge;
    return true;
  });
  assert.ok(challenge);
  assert.equal((await users.findById(user.id))?.googleSubject, null);
  assert.equal(await auth.approveTwoFactorChallenge(user.id, challenge.challengeId, challenge.matchingNumber), true);
  const session = await auth.completeTwoFactorLogin(challenge.challengeId);
  assert.equal(session?.user.id, user.id);
  assert.equal((await users.findById(user.id))?.googleSubject, subject);
  assert.equal(await auth.completeTwoFactorLogin(challenge.challengeId), undefined);
});

test("revoked Google device approval cannot attach the identity", async () => {
  const email = `person-${randomUUID().slice(0, 12)}@gmail.com`;
  const user = await account(email);
  const setup = await auth.beginTwoFactorSetup(user.id);
  assert.ok(setup);
  await auth.confirmTwoFactorSetup(user.id, authenticator.generate(setup.secret));
  let challenge: NonNullable<TwoFactorRequiredError["challenge"]> | undefined;
  await assert.rejects(auth.loginWithGoogle({ credential: credential(randomUUID(), email) }), error => {
    assert.ok(error instanceof TwoFactorRequiredError);
    challenge = error.challenge;
    return true;
  });
  assert.ok(challenge);
  await users.revokeAllCredentials(user.id);
  assert.equal(await auth.completeTwoFactorLogin(challenge.challengeId), undefined);
  assert.equal((await users.findById(user.id))?.googleSubject, null);
});

test("competing Google subjects cannot overwrite a linked account", async () => {
  const email = `person-${randomUUID().slice(0, 12)}@gmail.com`;
  const user = await account(email);
  const first = `google-${randomUUID()}`;
  const second = `google-${randomUUID()}`;
  const results = await Promise.allSettled([
    auth.loginWithGoogle({ credential: credential(first, email) }),
    auth.loginWithGoogle({ credential: credential(second, email) }),
  ]);
  assert.equal(results.filter(r => r.status === "fulfilled").length, 1);
  assert.ok([first, second].includes((await users.findById(user.id))?.googleSubject ?? ""));
});

test("existing linked Google subject rejects a different email and wrong identity", async () => {
  const email = `person-${randomUUID().slice(0, 12)}@gmail.com`;
  const user = await account(email);
  const subject = `google-${randomUUID()}`;
  await auth.loginWithGoogle({ credential: credential(subject, email) });
  await assert.rejects(
    auth.loginWithGoogle({ credential: credential(`google-${randomUUID()}`, email) }),
    /not linked|identity/i,
  );
  await assert.rejects(
    auth.loginWithGoogle({ credential: credential(subject, "changed@gmail.com") }),
    /identity/i,
  );
  assert.equal((await users.findById(user.id))?.googleSubject, subject);
});
