import assert from 'node:assert/strict';
import { after, test, type TestContext } from 'node:test';
import { randomUUID } from 'node:crypto';
import { pool } from '@workspace/db';
import { authenticator } from 'otplib';
import { AuthService, EmailOtpInvalidError, TwoFactorRequiredError } from '../services/auth-service.js';
import { RedisRepository } from '../repositories/redis-repository.js';
import { UserRepository } from '../repositories/user-repository.js';
import { EmailService } from '../services/email-service.js';
import { encryptSecret } from '../lib/secret-box.js';
import { env } from '../config/env.js';
import type { UserRecord } from '../types/index.js';

after(() => pool.end());

/** Exercise the actual NX/Lua operations through separate Redis connections;
 * accounts and email delivery are synthetic, and no database is accessed. */
async function fixture(t: TestContext, twoFactor = false) {
  const redis = [new RedisRepository(), new RedisRepository()];
  const id = randomUUID(), secret = authenticator.generateSecret();
  const user: UserRecord = {
    id, username: `otp-${id}`, email: `${id}@kiit.ac.in`, passwordHash: 'unused', authVersion: 0,
    fullName: 'Synthetic Redis OTP account', bio: '', avatarUrl: null, role: 'user', permissions: [],
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), emailVerified: true,
    settings: { theme: 'light', notificationsEnabled: false, privateAccount: true },
    totpSecret: twoFactor ? encryptSecret(secret, env.TOTP_ENCRYPTION_KEY) : null,
  };
  let code = '', deliveries = 0, sessions = 0;
  const users = {
    findByEmail: async () => ({ ...user }), findById: async () => ({ ...user }),
    recordLogin: async (expected: UserRecord) => {
      if (expected.authVersion !== user.authVersion) return undefined;
      sessions++; return { ...user };
    },
    getOwnRelationships: async () => ({}),
  } as unknown as UserRepository;
  const email = { sendEmailLoginCode: async (_address: string, value: string) => { code = value; deliveries++; } } as unknown as EmailService;
  const services = redis.map(connection => new AuthService(users, connection, undefined, email));
  const key = `email-login-otp:${await redis[0].hashToken(user.email)}`;
  t.after(async () => {
    for (const challenge of await redis[0].getSetStrict(`login-approvals:user:${id}`)) await redis[0].delStrict(`login-approval:${challenge}`);
    await redis[0].delStrict(`login-approvals:user:${id}`);
    await redis[0].delStrict(key);
    for (const session of await redis[0].scanStrict(`session:${id}:*`)) await redis[0].delStrict(session);
    await Promise.all(redis.map(connection => connection.disconnect()));
  });
  const request = async () => { await services[0].requestEmailOtp(user.email); return code; };
  return { services, redis, user, key, request, code: () => code, deliveries: () => deliveries, sessions: () => sessions };
}

test('real Redis reserves and consumes one email code across API connections', async t => {
  const f = await fixture(t);
  const requests = await Promise.allSettled(Array.from({ length: 12 }, (_, index) => f.services[index % 2].requestEmailOtp(f.user.email)));
  assert.equal(requests.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal(f.deliveries(), 1);
  const results = await Promise.allSettled(Array.from({ length: 20 }, (_, index) => f.services[index % 2].loginWithEmailOtp({ email: f.user.email, code: f.code() })));
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal(f.sessions(), 1);
  assert.equal((await f.redis[0].scanStrict(`session:${f.user.id}:*`)).length, 1);
});

test('real Redis preserves concurrent failed-attempt accounting and rejects the locked code', async t => {
  const f = await fixture(t), code = await f.request(), wrong = code === '000000' ? '000001' : '000000';
  const fail = (count: number) => Promise.allSettled(Array.from({ length: count }, (_, index) => f.services[index % 2].loginWithEmailOtp({ email: f.user.email, code: wrong })));
  assert.equal((await fail(4)).every(result => result.status === 'rejected'), true);
  assert.equal(JSON.parse((await f.redis[0].getStrict(f.key))!).attempts, 4);
  assert.equal((await fail(12)).every(result => result.status === 'rejected'), true);
  assert.equal(JSON.parse((await f.redis[0].getStrict(f.key))!).attempts, 5);
  await assert.rejects(f.services[0].loginWithEmailOtp({ email: f.user.email, code }), EmailOtpInvalidError);
  assert.equal(f.sessions(), 0);
});

test('real Redis permits only one approved MFA challenge to consume the shared email proof', async t => {
  const f = await fixture(t, true), code = await f.request();
  const challenges: NonNullable<TwoFactorRequiredError['challenge']>[] = [];
  for (const service of f.services) await assert.rejects(service.loginWithEmailOtp({ email: f.user.email, code }), error => {
    assert.ok(error instanceof TwoFactorRequiredError); assert.ok(error.challenge); challenges.push(error.challenge); return true;
  });
  for (const challenge of challenges) assert.equal(await f.services[0].approveTwoFactorChallenge(f.user.id, challenge.challengeId, challenge.matchingNumber), true);
  const results = await Promise.all(challenges.map((challenge, index) => f.services[index].completeTwoFactorLogin(challenge.challengeId)));
  assert.equal(results.filter(Boolean).length, 1); assert.equal(f.sessions(), 1);
});

test('real Redis cannot redeem code state retained across credential epoch revocation', async t => {
  const f = await fixture(t), code = await f.request();
  f.user.authVersion = 1;
  await assert.rejects(f.services[1].loginWithEmailOtp({ email: f.user.email, code }), EmailOtpInvalidError);
  assert.ok(await f.redis[0].getStrict(f.key)); assert.equal(f.sessions(), 0);
});

test('actual atomic consumption rejects an expired proof even while its Redis TTL remains live', async t => {
  const f = await fixture(t), code = await f.request();
  const raw = (await f.redis[0].getStrict(f.key))!;
  assert.equal(await f.redis[1].consumeValueStrict(f.key, raw, Date.now() - 1000), false);
  assert.equal(await f.redis[0].getStrict(f.key), raw);
  const session = await f.services[0].loginWithEmailOtp({ email: f.user.email, code });
  assert.equal(session.user.id, f.user.id); assert.equal(f.sessions(), 1);
});
