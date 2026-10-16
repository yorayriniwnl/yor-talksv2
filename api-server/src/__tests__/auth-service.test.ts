import assert from "node:assert/strict";
import { after, test } from "node:test";
import { AuthService } from "../services/auth-service.js";
import { EmailOtpInvalidError, EmailVerificationRequiredError, TooManyAttemptsError } from "../services/auth-service.js";
import { RedisRepository } from "../repositories/redis-repository.js";
import { UserRepository } from "../repositories/user-repository.js";
import { pool } from "@workspace/db";
import { authenticator } from "otplib";
import { TwoFactorRequiredError } from "../services/auth-service.js";
import { randomUUID } from "node:crypto";
import { EligibilityEnrollmentService } from "../services/eligibility-enrollment-service.js";

const redisRepository = new RedisRepository();
const approvedEnrollment = {
  consumeAuthorizedEnrollment: async (enrollmentId: string) => ({ enrollmentId,experience: 'adult_18_plus' as const,territory: 'US',
    assessment: {} as never,guardianAuthorizations: [],policyVersions: {} }),
  bindAuthorizedEnrollment: async () => undefined,
} as unknown as EligibilityEnrollmentService;
const makeAuthService = () => new AuthService(new UserRepository(),redisRepository,undefined,undefined,approvedEnrollment);
const makeEmailOtpService = (sendCode: (code: string) => void) => new AuthService(new UserRepository(),redisRepository,undefined,{
  sendVerificationEmail: async () => true,
  sendEmailLoginCode: async (_email: string, code: string) => { sendCode(code); return true; },
  sendPasswordResetEmail: async () => true,
} as never,approvedEnrollment);
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

test("email OTP reservation and redemption are atomic with exact attempt accounting", async t => {
  const unique = `${Date.now()}-${randomUUID().slice(0,8)}`;
  const username = `emailotp-${unique.slice(-13)}`;
  const email = `${unique.replace(/-/g,'').slice(-12)}@kiit.ac.in`;
  const sentCodes: string[] = [];
  const authService = makeEmailOtpService(code => sentCodes.push(code));
  let firstUserId: string | undefined;
  t.after(async () => {
    if (firstUserId) await authService.logoutAllDevices(firstUserId).catch(() => undefined);
    await pool.query('DELETE FROM users WHERE username=$1',[username]);
  });
  const registered = await authService.register({ username,email,password: 'GoodPassword1!',fullName: 'Email OTP User',acceptedTerms: true,
    ...registrationCredentials() });
  firstUserId = registered.user.id;

  const reservations = await Promise.allSettled([authService.requestEmailOtp(email),authService.requestEmailOtp(email)]);
  assert.equal(reservations.filter(result => result.status==='fulfilled').length,1);
  assert.equal(reservations.filter(result => result.status==='rejected' && result.reason instanceof TooManyAttemptsError).length,1);
  assert.equal(sentCodes.length,1);

  const correctCode = sentCodes[0]!;
  const redemptions = await Promise.allSettled(Array.from({length:8},() => authService.loginWithEmailOtp({email,code: correctCode})));
  assert.equal(redemptions.filter(result => result.status==='fulfilled').length,1);
  assert.equal(redemptions.filter(result => result.status==='rejected' && result.reason instanceof EmailOtpInvalidError).length,7);
  await authService.logoutAllDevices(registered.user.id);

  const wrongCodes: string[] = [];
  const wrongCodeService = makeEmailOtpService(code => wrongCodes.push(code));
  const secondEmail = `retry${unique.replace(/-/g,'').slice(-10)}@kiit.ac.in`;
  const secondUsername = `retry-${unique.slice(-12)}`;
  const second = await wrongCodeService.register({ username: secondUsername,email: secondEmail,password: 'GoodPassword1!',fullName: 'OTP Retry User',acceptedTerms: true,
    ...registrationCredentials() });
  t.after(async () => {
    await wrongCodeService.logoutAllDevices(second.user.id).catch(() => undefined);
    await pool.query('DELETE FROM users WHERE id=$1',[second.user.id]);
  });
  await wrongCodeService.requestEmailOtp(secondEmail);
  const wrong = wrongCodes[0]==='999999'?'000000':'999999';
  const attempts = await Promise.allSettled(Array.from({length:4},() => wrongCodeService.loginWithEmailOtp({email: secondEmail,code: wrong})));
  assert.equal(attempts.filter(result => result.status==='rejected' && result.reason instanceof EmailOtpInvalidError).length,4);
  const key = `email-login-otp:${await redisRepository.hashToken(secondEmail)}`;
  assert.equal(JSON.parse((await redisRepository.getStrict(key))!).attempts,4);
  await assert.rejects(() => wrongCodeService.loginWithEmailOtp({email: secondEmail,code: wrong}),EmailOtpInvalidError);
  assert.equal(JSON.parse((await redisRepository.getStrict(key))!).attempts,5);
  await assert.rejects(() => wrongCodeService.loginWithEmailOtp({email: secondEmail,code: wrongCodes[0]}),EmailOtpInvalidError);
  assert.equal(await redisRepository.getStrict(key),null);
});

test("email OTP cleanup cannot delete a replacement code", async t => {
  const key = `email-login-otp:cleanup-test:${randomUUID()}`;
  t.after(async () => redisRepository.delStrict(key));
  const first = JSON.stringify({reservationId:"first",authVersion:3});
  const replacement = JSON.stringify({reservationId:"replacement",authVersion:4});
  await redisRepository.setStrict(key,first,300);
  assert.equal(await redisRepository.deleteIfValueStrict(key,first),true);
  await redisRepository.setStrict(key,replacement,300);
  assert.equal(await redisRepository.deleteIfValueStrict(key,first),false);
  assert.equal(await redisRepository.deleteEmailOtpIfReservationStrict(key,"first"),false);
  assert.equal(await redisRepository.deleteEmailOtpIfAuthVersionChangedStrict(key,4),false);
  assert.equal(await redisRepository.getStrict(key),replacement);
  assert.equal(await redisRepository.deleteEmailOtpIfAuthVersionChangedStrict(key,5),true);
  assert.equal(await redisRepository.getStrict(key),null);
});

test("email OTPs issued before logout-all or password reset cannot create a session", async t => {
  const unique = `${Date.now()}-${randomUUID().slice(0,8)}`;
  const username = `revoked-${unique.slice(-12)}`;
  const email = `revoked${unique.replace(/-/g,'').slice(-10)}@kiit.ac.in`;
  const sentCodes: string[] = [];
  const authService = makeEmailOtpService(code => sentCodes.push(code));
  const registered = await authService.register({ username,email,password: 'GoodPassword1!',fullName: 'Revoked OTP User',acceptedTerms: true,
    ...registrationCredentials() });
  t.after(async () => {
    await authService.logoutAllDevices(registered.user.id).catch(() => undefined);
    await pool.query('DELETE FROM users WHERE id=$1',[registered.user.id]);
  });

  await authService.requestEmailOtp(email);
  const beforeLogout = sentCodes.at(-1)!;
  await authService.logoutAllDevices(registered.user.id);
  await assert.rejects(() => authService.loginWithEmailOtp({email,code: beforeLogout}),EmailOtpInvalidError);

  await authService.requestEmailOtp(email);
  const beforeReset = sentCodes.at(-1)!;
  const resetToken = await authService.requestPasswordReset(email);
  assert.ok(resetToken);
  assert.equal(await authService.confirmPasswordReset(resetToken,'ReplacementPassword2!'),true);
  await assert.rejects(() => authService.loginWithEmailOtp({email,code: beforeReset}),EmailOtpInvalidError);
});

test("email OTP remains single-use while a two-factor approval challenge is pending", async t => {
  const unique = `${Date.now()}-${randomUUID().slice(0,8)}`;
  const username = `otpmfa-${unique.slice(-12)}`;
  const email = `otpmfa${unique.replace(/-/g,'').slice(-10)}@kiit.ac.in`;
  const key = `email-login-otp:${await redisRepository.hashToken(email)}`;
  const sentCodes: string[] = [];
  const authService = makeEmailOtpService(code => sentCodes.push(code));
  const registered = await authService.register({ username,email,password: 'GoodPassword1!',fullName: 'OTP MFA User',acceptedTerms: true,
    ...registrationCredentials() });
  t.after(async () => {
    await redisRepository.delStrict(key).catch(() => undefined);
    await authService.logoutAllDevices(registered.user.id).catch(() => undefined);
    await pool.query('DELETE FROM users WHERE id=$1',[registered.user.id]);
  });
  const setup = await authService.beginTwoFactorSetup(registered.user.id);
  assert.ok(setup?.secret);
  assert.equal(await authService.confirmTwoFactorSetup(registered.user.id,authenticator.generate(setup!.secret)),true);
  await authService.requestEmailOtp(email);
  const code = sentCodes.at(-1)!;
  let challenge: { challengeId: string; matchingNumber: number; expiresAt: string } | undefined;
  await assert.rejects(() => authService.loginWithEmailOtp({email,code}),error => {
    assert.ok(error instanceof TwoFactorRequiredError);
    challenge=error.challenge;
    return true;
  });
  assert.ok(challenge);
  const pending = challenge;
  await assert.rejects(() => authService.loginWithEmailOtp({email,code}),EmailOtpInvalidError);
  await redisRepository.setStrict(key,JSON.stringify({reservationId:"replacement-after-expiry",authVersion:registered.user.authVersion}),300);
  assert.equal(await authService.approveTwoFactorChallenge(registered.user.id,pending.challengeId,pending.matchingNumber),true);
  const session = await authService.completeTwoFactorLogin(pending.challengeId);
  assert.equal(session?.user.id,registered.user.id);
  assert.equal(JSON.parse((await redisRepository.getStrict(key))!).reservationId,"replacement-after-expiry");
});
