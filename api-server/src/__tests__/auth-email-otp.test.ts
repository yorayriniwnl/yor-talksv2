import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createHash, randomUUID } from 'node:crypto';
import { authenticator } from 'otplib';
import { pool } from '@workspace/db';
import { AuthService, EmailOtpInvalidError, TwoFactorRequiredError } from '../services/auth-service.js';
import { RedisRepository } from '../repositories/redis-repository.js';
import { UserRepository } from '../repositories/user-repository.js';
import { EmailService } from '../services/email-service.js';
import { encryptSecret } from '../lib/secret-box.js';
import { env } from '../config/env.js';
import type { UserRecord } from '../types/index.js';

after(() => pool.end());

/** Synthetic repositories deliberately yield at reads. Atomic mutations below
 * model the existing Redis CAS contract, without contacting a datastore. */
function fixture(twoFactor = false) {
  const values = new Map<string, string>(), sets = new Map<string, Set<string>>();
  const secret = authenticator.generateSecret();
  const user: UserRecord = {
    id: randomUUID(), username: 'synthetic-otp', email: 'synthetic-otp@kiit.ac.in', passwordHash: 'unused',
    authVersion: 0, fullName: 'Synthetic OTP account', bio: '', avatarUrl: null, role: 'user', permissions: [],
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), emailVerified: true,
    settings: { theme: 'light', notificationsEnabled: false, privateAccount: true },
    totpSecret: twoFactor ? encryptSecret(secret, env.TOTP_ENCRYPTION_KEY) : null,
  };
  let sentCode = '', deliveries = 0, logins = 0;
  const redis = {
    hashToken: async (value: string) => createHash('sha256').update(value).digest('hex'),
    getStrict: async (key: string) => values.get(key) ?? null,
    setStrict: async (key: string, value: string) => { values.set(key, value); },
    delStrict: async (key: string) => { values.delete(key); },
    setIfAbsentStrict: async (key: string, value: string) => {
      if (values.has(key)) return false;
      values.set(key, value); return true;
    },
    rotateValueStrict: async (key: string, expected: string, replacement: string) => {
      if (values.get(key) !== expected) return false;
      values.set(key, replacement); return true;
    },
    consumeValueStrict: async (key: string, expected: string, expiresAt?: number) => {
      if (values.get(key) !== expected || (expiresAt !== undefined && expiresAt <= Date.now())) return false;
      values.delete(key); return true;
    },
    consumeApprovedStrict: async (key: string, now: string) => {
      const raw = values.get(key); if (!raw) return null;
      const state = JSON.parse(raw);
      if (state.status !== 'approved' || state.expiresAt <= now) return null;
      values.delete(key); return raw;
    },
    addToSetStrict: async (key: string, value: string) => {
      if (!sets.has(key)) sets.set(key, new Set());
      sets.get(key)!.add(value);
    },
    removeFromSetStrict: async (key: string, value: string) => { sets.get(key)?.delete(value); },
    getSetStrict: async (key: string) => [...(sets.get(key) ?? [])],
    scanStrict: async (pattern: string) => [...values.keys()].filter(key => key.startsWith(pattern.replace('*', ''))),
  };
  const users = {
    findByEmail: async () => ({ ...user }), findById: async () => ({ ...user }),
    revokeAllCredentials: async () => { user.authVersion = (user.authVersion ?? 0) + 1; },
    redeemPasswordReset: async () => { user.authVersion = (user.authVersion ?? 0) + 1; return user.id; },
    recordLogin: async (expected: UserRecord) => {
      if (expected.authVersion !== user.authVersion) return undefined;
      logins++; return { ...user };
    },
    getOwnRelationships: async () => ({}),
  };
  const email = { sendEmailLoginCode: async (_address: string, code: string) => { sentCode = code; deliveries++; } };
  const service = () => new AuthService(users as unknown as UserRepository, redis as unknown as RedisRepository, undefined, email as unknown as EmailService);
  const auth = service();
  const otpKey = `email-login-otp:${createHash('sha256').update(user.email).digest('hex')}`;
  const request = async () => { await auth.requestEmailOtp(user.email); return sentCode; };
  const sessions = () => [...values.keys()].filter(key => key.startsWith('session:'));
  return { auth, service, user, users, redis, email, values, secret, otpKey, request, sessions,
    code: () => sentCode, deliveries: () => deliveries, logins: () => logins };
}

test('concurrent email-code issuance reserves one code and sends one email', async () => {
  const f = fixture();
  const results = await Promise.allSettled(Array.from({ length: 12 }, () => f.service().requestEmailOtp(f.user.email)));
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal(f.deliveries(), 1);
});

test('concurrent correct email codes establish exactly one session across service instances', async () => {
  const f = fixture(), code = await f.request();
  const results = await Promise.allSettled(Array.from({ length: 12 }, () => f.service().loginWithEmailOtp({ email: f.user.email, code })));
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal(f.logins(), 1); assert.equal(f.sessions().length, 1);
  await assert.rejects(f.auth.loginWithEmailOtp({ email: f.user.email, code }), EmailOtpInvalidError);
});

test('concurrent incorrect submissions count exactly and the fifth failure closes the code', async () => {
  const f = fixture(), code = await f.request(), wrong = code === '000000' ? '000001' : '000000';
  const first = await Promise.allSettled(Array.from({ length: 4 }, () => f.service().loginWithEmailOtp({ email: f.user.email, code: wrong })));
  assert.equal(first.every(result => result.status === 'rejected'), true);
  assert.equal(JSON.parse(f.values.get(f.otpKey)!).attempts, 4);
  const remainder = await Promise.allSettled(Array.from({ length: 12 }, () => f.service().loginWithEmailOtp({ email: f.user.email, code: wrong })));
  assert.equal(remainder.every(result => result.status === 'rejected'), true);
  assert.equal(JSON.parse(f.values.get(f.otpKey)!).attempts, 5);
  await assert.rejects(f.auth.loginWithEmailOtp({ email: f.user.email, code }), EmailOtpInvalidError);
  assert.equal(f.logins(), 0); assert.equal(f.sessions().length, 0);
});

test('email codes issued before logout-all or password reset fail despite Redis cleanup failure', async t => {
  for (const revocation of ['logout-all', 'password-reset']) await t.test(revocation, async () => {
    const f = fixture(), code = await f.request();
    f.redis.scanStrict = async () => { throw new Error('synthetic cleanup outage'); };
    if (revocation === 'logout-all') await f.auth.logoutAllDevices(f.user.id);
    else assert.equal(await f.auth.confirmPasswordReset('synthetic-reset-token', 'synthetic-new-password'), true);
    assert.ok(f.values.has(f.otpKey));
    await assert.rejects(f.auth.loginWithEmailOtp({ email: f.user.email, code }), EmailOtpInvalidError);
    assert.equal(f.logins(), 0); assert.equal(f.sessions().length, 0);
  });
});

test('credential revocation between OTP consumption and conditional session persistence cannot create a session', async () => {
  const f = fixture(), code = await f.request(), consume = f.redis.consumeValueStrict;
  f.redis.consumeValueStrict = async (key, expected, expiresAt) => {
    const won = await consume(key, expected, expiresAt);
    if (won && key === f.otpKey) await f.users.revokeAllCredentials();
    return won;
  };
  await assert.rejects(f.auth.loginWithEmailOtp({ email: f.user.email, code }));
  assert.equal(f.logins(), 0); assert.equal(f.sessions().length, 0);
});

test('email-code device approval remains MFA-bound and cannot redeem the same code twice', async () => {
  const f = fixture(true), code = await f.request();
  const challenges: NonNullable<TwoFactorRequiredError['challenge']>[] = [];
  for (let index = 0; index < 2; index++) await assert.rejects(f.auth.loginWithEmailOtp({ email: f.user.email, code }), error => {
    assert.ok(error instanceof TwoFactorRequiredError); assert.ok(error.challenge); challenges.push(error.challenge); return true;
  });
  assert.equal(f.logins(), 0);
  for (const challenge of challenges) assert.equal(await f.auth.approveTwoFactorChallenge(f.user.id, challenge.challengeId, challenge.matchingNumber), true);
  const results = await Promise.all(challenges.map(challenge => f.service().completeTwoFactorLogin(challenge.challengeId)));
  assert.equal(results.filter(Boolean).length, 1); assert.equal(f.logins(), 1); assert.equal(f.sessions().length, 1);
});

test('an approved challenge for an older email code cannot redeem or remove its replacement', async () => {
  const f = fixture(true), code = await f.request();
  let challenge: NonNullable<TwoFactorRequiredError['challenge']>;
  await assert.rejects(f.auth.loginWithEmailOtp({ email: f.user.email, code }), error => {
    assert.ok(error instanceof TwoFactorRequiredError); assert.ok(error.challenge); challenge = error.challenge; return true;
  });
  assert.equal(await f.auth.approveTwoFactorChallenge(f.user.id, challenge!.challengeId, challenge!.matchingNumber), true);
  f.values.delete(f.otpKey); await f.request();
  const replacement = f.values.get(f.otpKey);
  assert.equal(await f.auth.completeTwoFactorLogin(challenge!.challengeId), undefined);
  assert.equal(f.values.get(f.otpKey), replacement); assert.equal(f.logins(), 0);
});

test('valid authenticator codes still require single-use email proof and invalid MFA does not consume it', async t => {
  const previous = authenticator.options; authenticator.options = { epoch: Date.UTC(2026, 9, 7, 0, 0, 15) };
  t.after(() => { authenticator.resetOptions(); authenticator.options = previous; });
  const f = fixture(true), code = await f.request(), validTotp = authenticator.generate(f.secret);
  await assert.rejects(f.auth.loginWithEmailOtp({ email: f.user.email, code, totpCode: 'invalid' }), EmailOtpInvalidError);
  assert.ok(f.values.has(f.otpKey)); assert.equal(f.logins(), 0);
  const results = await Promise.allSettled(Array.from({ length: 12 }, () => f.service().loginWithEmailOtp({ email: f.user.email, code, totpCode: validTotp })));
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1); assert.equal(f.logins(), 1);
});

test('legacy unversioned or malformed email-code state cannot establish a session', async t => {
  for (const malformed of [false, true]) await t.test(String(malformed), async () => {
    const f = fixture(), code = await f.request(), state = JSON.parse(f.values.get(f.otpKey)!);
    delete state.authVersion;
    f.values.set(f.otpKey, malformed ? '{malformed' : JSON.stringify(state));
    await assert.rejects(f.auth.loginWithEmailOtp({ email: f.user.email, code }), EmailOtpInvalidError);
    assert.equal(f.logins(), 0);
  });
});

test('a delayed email delivery failure cannot remove a newer code reservation', async () => {
  const f = fixture();
  let replacement = '';
  f.email.sendEmailLoginCode = async () => {
    const state = JSON.parse(f.values.get(f.otpKey)!);
    replacement = JSON.stringify({ ...state, id: randomUUID(), codeHash: createHash('sha256').update('replacement-code').digest('hex') });
    f.values.set(f.otpKey, replacement);
    throw new Error('synthetic delayed delivery failure');
  };
  await assert.rejects(f.auth.requestEmailOtp(f.user.email), /synthetic delayed delivery failure/);
  assert.equal(f.values.get(f.otpKey), replacement); assert.equal(f.logins(), 0);
});

test('a stale incorrect submission cannot restore or debit a consumed code replacement', async () => {
  const f = fixture(), code = await f.request(), update = f.redis.rotateValueStrict;
  let replacement = '', changed = false;
  f.redis.rotateValueStrict = async (key, expected, next) => {
    if (!changed && key === f.otpKey) {
      changed = true;
      const state = JSON.parse(expected);
      replacement = JSON.stringify({ ...state, id: randomUUID(), attempts: 0 });
      f.values.set(key, replacement);
    }
    return update(key, expected, next);
  };
  const wrong = code === '000000' ? '000001' : '000000';
  await assert.rejects(f.auth.loginWithEmailOtp({ email: f.user.email, code: wrong }), EmailOtpInvalidError);
  assert.equal(f.values.get(f.otpKey), replacement); assert.equal(f.logins(), 0);
});
