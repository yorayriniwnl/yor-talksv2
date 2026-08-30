import assert from "node:assert/strict";
import { after, test } from "node:test";
import { AuthService } from "../services/auth-service.js";
import { EmailVerificationRequiredError } from "../services/auth-service.js";
import { RedisRepository } from "../repositories/redis-repository.js";
import { UserRepository } from "../repositories/user-repository.js";
import { pool } from "@workspace/db";
import { authenticator } from "otplib";
import { TwoFactorRequiredError } from "../services/auth-service.js";

const redisRepository = new RedisRepository();
after(async () => {
  await redisRepository.disconnect();
  await pool.end();
});

test("registration requires email verification before password login", async () => {
  const authService = new AuthService(new UserRepository(), redisRepository);
  const unique = Date.now();
  const email = `${String(unique).slice(-7)}@kiit.ac.in`;

  const registered = await authService.register({
    username: `alice-${unique}`,
    email,
    password: "supersecret",
    fullName: "Alice Example",
    acceptedTerms: true,
    confirmedAge: true,
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

test("two-factor authentication blocks password login until the authenticator code is valid", async () => {
  const authService = new AuthService(new UserRepository(), redisRepository);
  const unique = Date.now() + 1;
  const email = `${String(unique).slice(-7)}@kiit.ac.in`;
  const registered = await authService.register({
    username: `twofactor-${unique}`,
    email,
    password: "supersecret",
    fullName: "Two Factor Example",
    acceptedTerms: true,
    confirmedAge: true,
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
