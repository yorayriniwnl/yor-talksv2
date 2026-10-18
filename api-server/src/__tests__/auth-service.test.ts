import assert from "node:assert/strict";
import { after, test } from "node:test";
import { AuthService } from "../services/auth-service.js";
import { EmailVerificationRequiredError } from "../services/auth-service.js";
import { RedisRepository } from "../repositories/redis-repository.js";
import { UserRepository } from "../repositories/user-repository.js";
import { pool } from "@workspace/db";
import { authenticator } from "otplib";
import { TwoFactorRequiredError } from "../services/auth-service.js";
import { randomUUID } from "node:crypto";
import { EligibilityEnrollmentService } from "../services/eligibility-enrollment-service.js";
import { env } from "../config/env.js";
import type { UserRecord } from "../types/index.js";

const redisRepository = new RedisRepository();
const approvedEnrollment = {
  consumeAuthorizedEnrollment: async (enrollmentId: string) => ({ enrollmentId,experience: 'adult_18_plus' as const,territory: 'US',
    assessment: {} as never,guardianAuthorizations: [],policyVersions: {} }),
  bindAuthorizedEnrollment: async () => undefined,
} as unknown as EligibilityEnrollmentService;
const makeAuthService = () => new AuthService(new UserRepository(),redisRepository,undefined,undefined,approvedEnrollment);
const registrationCredentials = () => ({ enrollmentId: randomUUID(),registrationNonce: randomUUID()+randomUUID() });
after(async () => {
  await redisRepository.disconnect();
  await pool.end();
});

test("registration requires email verification before password login", async () => {
  const authService = makeAuthService();
  const unique = Date.now();
  const email = `${String(unique).slice(-7)}@kiit.ac.in`;

  const registered = await authService.register({
    username: `alice-${unique}`,
    email,
    password: "supersecret",
    fullName: "Alice Example",
    acceptedTerms: true,
    ...registrationCredentials(),
  });

  assert.equal(registered.user.emailVerified, false);
  assert.ok(registered.verificationToken);

  await assert.rejects(
    () => authService.login({ identifier: email, password: "supersecret" }),
    EmailVerificationRequiredError,
  );

  const verified = await authService.confirmEmailVerification(registered.verificationToken!);
  assert.equal(verified?.emailVerified, true);

  const loggedIn = await authService.login({ identifier: email, password: "supersecret" });
  assert.equal(loggedIn.user.id, registered.user.id);
  assert.ok(loggedIn.tokens.accessToken);
  assert.ok(loggedIn.tokens.refreshToken);
});

test("current terms acceptance requires affirmative input and records the configured version and server time", async (t) => {
  const repository = new UserRepository();
  let writtenId: string | undefined;
  let writtenVersion: string | null | undefined;
  let writtenAt: string | null | undefined;
  let writtenAgeConfirmation: string | null | undefined;
  t.mock.method(repository, "update", async (id: string, updates: Partial<UserRecord>) => {
    writtenId = id;
    writtenVersion = updates.termsVersion;
    writtenAt = updates.termsAcceptedAt;
    writtenAgeConfirmation = updates.ageConfirmedAt;
    return undefined;
  });
  const service = new AuthService(repository, redisRepository, undefined, undefined, approvedEnrollment);
  const before = Date.now();

  await assert.rejects(() => service.acceptCurrentTerms("consent-test-user", { acceptedTerms: false }), /must accept/i);
  assert.equal(writtenId, undefined);

  await service.acceptCurrentTerms("consent-test-user", { acceptedTerms: true });
  assert.equal(writtenId, "consent-test-user");
  assert.equal(writtenVersion, env.TERMS_VERSION);
  assert.ok(writtenAt);
  assert.ok(Date.parse(writtenAt) >= before);
  assert.equal(Date.parse(writtenAt), Date.parse(new Date(writtenAt).toISOString()));
  assert.equal(writtenAgeConfirmation, undefined);
});

test("two-factor authentication blocks password login until the authenticator code is valid", async () => {
  const authService = makeAuthService();
  const unique = Date.now() + 1;
  const email = `${String(unique).slice(-7)}@kiit.ac.in`;
  const registered = await authService.register({
    username: `twofactor-${unique}`,
    email,
    password: "supersecret",
    fullName: "Two Factor Example",
    acceptedTerms: true,
    ...registrationCredentials(),
  });

  await authService.confirmEmailVerification(registered.verificationToken!);
  const setup = await authService.beginTwoFactorSetup(registered.user.id);
  assert.ok(setup?.secret);
  assert.match(setup?.otpauthUrl ?? "", /^otpauth:\/\//);
  assert.equal(await authService.confirmTwoFactorSetup(registered.user.id, authenticator.generate(setup!.secret)), true);

  let challenge: { challengeId: string; matchingNumber: number; expiresAt: string } | undefined;
  await assert.rejects(
    () => authService.login({ identifier: email, password: "supersecret" }),
    (error: unknown) => {
      assert.ok(error instanceof TwoFactorRequiredError);
      challenge = error.challenge;
      return true;
    },
  );
  assert.ok(challenge);
  const createdChallenge = challenge;
  assert.ok(createdChallenge.matchingNumber >= 1 && createdChallenge.matchingNumber <= 99);
  assert.ok(Date.parse(createdChallenge.expiresAt) > Date.now());

  const pending = await authService.listPendingTwoFactorChallenges(registered.user.id);
  assert.equal(pending.some((item) => item.challengeId === createdChallenge.challengeId), true);
  const wrongNumber = createdChallenge.matchingNumber === 99 ? 1 : createdChallenge.matchingNumber + 1;
  assert.equal(await authService.approveTwoFactorChallenge(registered.user.id, createdChallenge.challengeId, wrongNumber), false);
  assert.equal(await authService.approveTwoFactorChallenge(registered.user.id, createdChallenge.challengeId, createdChallenge.matchingNumber), true);
  assert.equal((await authService.getTwoFactorChallengeStatus(createdChallenge.challengeId))?.status, "approved");

  const loggedIn = await authService.completeTwoFactorLogin(createdChallenge.challengeId);
  assert.ok(loggedIn);
  assert.equal(loggedIn.user.id, registered.user.id);
  assert.ok(loggedIn.tokens.accessToken);
  assert.equal(await authService.completeTwoFactorLogin(createdChallenge.challengeId), undefined);
});
