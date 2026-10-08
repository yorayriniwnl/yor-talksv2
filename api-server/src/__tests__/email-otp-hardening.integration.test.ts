import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { randomUUID } from 'node:crypto';
import express from 'express';
import { Redis } from 'ioredis';
import { authenticator } from 'otplib';
import jwt from 'jsonwebtoken';
import { pool } from '@workspace/db';
import { AuthService, EmailOtpInvalidError, TooManyAttemptsError, TwoFactorRequiredError } from '../services/auth-service.js';
import { AuthController } from '../controllers/auth-controller.js';
import { UserRepository } from '../repositories/user-repository.js';
import { RedisRepository } from '../repositories/redis-repository.js';
import type { EmailService } from '../services/email-service.js';
import { authenticate, closeAuthDependencies } from '../middlewares/auth.js';
import { validateBody } from '../middlewares/validation.js';
import { emailOtpVerifySchema } from '../validators/auth.js';
import { assertIsolatedPostgres } from '../../../ops/test-infrastructure-guard.mjs';

// Never fall through to the repository's development database/Redis defaults.
assertIsolatedPostgres(process.env);
const redisUrl = new URL(process.env.REDIS_URL ?? 'http://missing');
const isLoopback = (host: string) => ['127.0.0.1', 'localhost', '[::1]', '::1'].includes(host);
assert.ok(redisUrl.protocol === 'redis:' && isLoopback(redisUrl.hostname), 'OTP integration requires an explicit isolated local REDIS_URL');

const users = new UserRepository();
const redis = new RedisRepository();
const inspector = new Redis(process.env.REDIS_URL!, { lazyConnect: true, maxRetriesPerRequest: 1 });
const ids: string[] = [];
const keys = new Set<string>();
const codes = new Map<string, string>();
const dispatches = new Map<string, number>();
const email = {
  sendEmailLoginCode: async (address: string, code: string) => {
    codes.set(address.toLowerCase(), code);
    dispatches.set(address.toLowerCase(), (dispatches.get(address.toLowerCase()) ?? 0) + 1);
  },
  sendPasswordResetEmail: async () => undefined,
} as unknown as EmailService;
const auth = new AuthService(users, redis, undefined, email);

before(async () => {
  assert.equal(process.env.NODE_ENV, 'test');
  const identity = (await pool.query('SELECT current_database() AS database,inet_server_port() AS port')).rows[0];
  assertIsolatedPostgres(process.env, identity);
  await inspector.connect();
  assert.equal(await inspector.ping(), 'PONG');
  assert.ok(Number((await inspector.info('server')).match(/^redis_version:(\d+)/m)?.[1]) >= 7,
    'OTP integration requires the production Redis 7 feature set');
});

after(async () => {
  for (const id of ids) {
    for (const key of await redis.scanStrict(`session:${id}:*`)) await redis.delStrict(key);
    for (const challengeId of await redis.getSetStrict(`login-approvals:user:${id}`)) {
      await redis.delStrict(`login-approval:${challengeId}`);
    }
    await redis.delStrict(`login-approvals:user:${id}`);
    await users.deleteById(id);
  }
  for (const key of keys) await redis.delStrict(key);
  inspector.disconnect();
  await redis.disconnect();
  await closeAuthDependencies();
  await pool.end();
});

async function fixture(twoFactor = false) {
  const id = randomUUID(); ids.push(id);
  const address = `otp-${id}@kiit.ac.in`;
  const secret = twoFactor ? authenticator.generateSecret() : null;
  await pool.query(`INSERT INTO users(id,username,email,password_hash,full_name,email_verified,totp_secret)
    VALUES($1,$2,$3,'synthetic-unused-password','Synthetic OTP account',true,$4)`,
  [id, `otp-${id}`, address, secret]);
  const key = `email-login-otp:${await redis.hashToken(address)}`;
  keys.add(key);
  return { id, address, key, secret };
}

async function issue(f: Awaited<ReturnType<typeof fixture>>) {
  assert.equal(await auth.requestEmailOtp(f.address.toUpperCase()), true);
  return { code: codes.get(f.address)!, state: JSON.parse((await redis.getStrict(f.key))!) };
}

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>(done => { resolve = done; });
  return { promise, resolve };
}

async function challenge(f: Awaited<ReturnType<typeof fixture>>, code: string) {
  let result: TwoFactorRequiredError['challenge'];
  await assert.rejects(auth.loginWithEmailOtp({ email: f.address, code }), error => {
    assert.ok(error instanceof TwoFactorRequiredError); result = error.challenge; return true;
  });
  assert.ok(result);
  return result;
}

test('concurrent issuance reserves and dispatches exactly one account/epoch-bound code', async () => {
  const f = await fixture();
  const outcomes = await Promise.allSettled(Array.from({ length: 30 }, () => auth.requestEmailOtp(f.address)));
  assert.equal(outcomes.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal(dispatches.get(f.address), 1);
  for (const result of outcomes.filter(result => result.status === 'rejected')) assert.ok(result.reason instanceof TooManyAttemptsError);
  const state = JSON.parse((await redis.getStrict(f.key))!);
  assert.equal(state.schemaVersion, 1);
  assert.equal(state.userId, f.id);
  assert.equal(state.email, f.address);
  assert.equal(state.authVersion, 0);
  assert.match(state.challengeId, /^[0-9a-f-]{36}$/);
  assert.equal(await inspector.pexpiretime(f.key), state.expiresAt);
  assert.equal(state.codeHash, await redis.hashToken(codes.get(f.address)!));
});

test('30 simultaneous correct service submissions create exactly one usable session and reject replay', async () => {
  const f = await fixture(); const { code } = await issue(f);
  const results = await Promise.allSettled(Array.from({ length: 30 }, () => auth.loginWithEmailOtp({ email: f.address, code })));
  const winners = results.filter(result => result.status === 'fulfilled');
  assert.equal(winners.length, 1);
  assert.equal((await redis.scanStrict(`session:${f.id}:*`)).length, 1);
  assert.ok(await auth.refreshAccessToken(winners[0].value.tokens.refreshToken));
  await assert.rejects(auth.loginWithEmailOtp({ email: f.address, code }), EmailOtpInvalidError);
});

test('concurrent wrong attempts saturate at five and preserve the exact original expiry', async () => {
  const f = await fixture(); const { code, state } = await issue(f);
  const wrong = code === '000000' ? '000001' : '000000';
  await Promise.all(Array.from({ length: 3 }, () => assert.rejects(auth.loginWithEmailOtp({ email: f.address, code: wrong }), EmailOtpInvalidError)));
  assert.equal(JSON.parse((await redis.getStrict(f.key))!).attempts, 3);
  assert.equal(await inspector.pexpiretime(f.key), state.expiresAt);
  await Promise.all(Array.from({ length: 30 }, () => assert.rejects(auth.loginWithEmailOtp({ email: f.address, code: wrong }), EmailOtpInvalidError)));
  assert.equal(JSON.parse((await redis.getStrict(f.key))!).attempts, 5);
  assert.equal(await inspector.pexpiretime(f.key), state.expiresAt);
  await assert.rejects(auth.loginWithEmailOtp({ email: f.address, code }), EmailOtpInvalidError);
});

test('expiration and corrupt/unversioned state fail closed without creating a session', async t => {
  for (const corruption of ['json', 'epoch', 'schema', 'email', 'identity', 'attempts', 'expiry', 'boundary', 'redis-expiry']) {
    await t.test(corruption, async () => {
      const f = await fixture(); const { code, state } = await issue(f);
      const modified = { ...state };
      if (corruption === 'epoch') delete modified.authVersion;
      if (corruption === 'schema') delete modified.schemaVersion;
      if (corruption === 'email') modified.email = 'someone-else@kiit.ac.in';
      if (corruption === 'identity') modified.challengeId = null;
      if (corruption === 'attempts') modified.attempts = '0';
      if (corruption === 'expiry') modified.expiresAt = '2099-01-01';
      if (corruption === 'boundary') modified.expiresAt = Date.now();
      await redis.setStrict(f.key, corruption === 'json' ? '{broken' : JSON.stringify(modified), 300);
      if (corruption === 'redis-expiry') await inspector.pexpireat(f.key, Date.now() - 1);
      await assert.rejects(auth.loginWithEmailOtp({ email: f.address, code }), EmailOtpInvalidError);
      assert.equal((await redis.scanStrict(`session:${f.id}:*`)).length, 0);
    });
  }
});

test('logout-all and password reset reject codes from earlier epochs even if Redis cleanup fails', async () => {
  const staleRedis = Object.create(redis) as RedisRepository;
  staleRedis.scanStrict = async () => { throw new Error('injected cleanup outage'); };
  const noCleanupAuth = new AuthService(users, staleRedis, undefined, email);
  for (const revoke of ['logout', 'reset']) {
    const f = await fixture(); const { code } = await issue(f);
    if (revoke === 'logout') await noCleanupAuth.logoutAllDevices(f.id);
    else {
      const token = (await noCleanupAuth.requestPasswordReset(f.address))!;
      assert.equal(await noCleanupAuth.confirmPasswordReset(token, 'synthetic-new-password'), true);
    }
    assert.ok(await redis.getStrict(f.key));
    assert.equal((await users.findById(f.id))!.authVersion, 1);
    await assert.rejects(auth.loginWithEmailOtp({ email: f.address, code }), EmailOtpInvalidError);
  }
});

test('account deletion rejects retained codes', async () => {
  const f = await fixture(); const { code } = await issue(f);
  await users.deleteById(f.id);
  await assert.rejects(auth.loginWithEmailOtp({ email: f.address, code }), EmailOtpInvalidError);
});

test('revocation between first-factor consumption and recordLogin cannot mint authority at the new epoch', async () => {
  const f = await fixture(); const { code } = await issue(f);
  const reached = deferred(), release = deferred();
  const racingUsers = Object.create(users) as UserRepository;
  racingUsers.recordLogin = async (user, updates) => {
    reached.resolve(); await release.promise;
    return users.recordLogin(user, updates);
  };
  const attempt = new AuthService(racingUsers, redis, undefined, email).loginWithEmailOtp({ email: f.address, code });
  const outcome = attempt.then(value => ({ value, error: null }), error => ({ value: null, error }));
  await reached.promise;
  await auth.logoutAllDevices(f.id);
  release.resolve();
  assert.match((await outcome).error.message, /Credentials changed/);
  assert.equal((await redis.scanStrict(`session:${f.id}:*`)).length, 0);
  await assert.rejects(auth.loginWithEmailOtp({ email: f.address, code }), EmailOtpInvalidError);
});

test('revocation after recordLogin leaves any late session at the old, unusable epoch', async () => {
  const f = await fixture(); const { code } = await issue(f);
  const reached = deferred(), release = deferred();
  const racingRedis = Object.create(redis) as RedisRepository;
  racingRedis.setStrict = async (key, value, ttl) => {
    if (key.startsWith(`session:${f.id}:`)) { reached.resolve(); await release.promise; }
    await redis.setStrict(key, value, ttl);
  };
  const attempt = new AuthService(users, racingRedis, undefined, email).loginWithEmailOtp({ email: f.address, code });
  await reached.promise; await auth.logoutAllDevices(f.id); release.resolve();
  const result = await attempt;
  assert.equal((jwt.decode(result.tokens.accessToken) as jwt.JwtPayload).authVersion, 0);
  assert.equal((jwt.decode(result.tokens.refreshToken) as jwt.JwtPayload).authVersion, 0);
  assert.equal((await users.findById(f.id))!.authVersion, 1);
  assert.equal(await auth.refreshAccessToken(result.tokens.refreshToken), undefined);
});

test('a delayed issuance snapshot remains bound to its original epoch', async () => {
  const f = await fixture(); const reached = deferred(), release = deferred();
  const racingUsers = Object.create(users) as UserRepository;
  racingUsers.findByEmail = async address => {
    const user = await users.findByEmail(address); reached.resolve(); await release.promise; return user;
  };
  const request = new AuthService(racingUsers, redis, undefined, email).requestEmailOtp(f.address);
  await reached.promise; await auth.logoutAllDevices(f.id); release.resolve(); await request;
  assert.equal(JSON.parse((await redis.getStrict(f.key))!).authVersion, 0);
  await assert.rejects(auth.loginWithEmailOtp({ email: f.address, code: codes.get(f.address)! }), EmailOtpInvalidError);
});

test('stale correct and incorrect requests cannot consume or overwrite a replacement code', async () => {
  for (const correct of [true, false]) {
    const f = await fixture(); const first = await issue(f);
    const reached = deferred(), release = deferred();
    const staleRedis = Object.create(redis) as RedisRepository;
    staleRedis.getStrict = async key => {
      const raw = await redis.getStrict(key);
      if (key === f.key) { reached.resolve(); await release.promise; }
      return raw;
    };
    const attempt = new AuthService(users, staleRedis, undefined, email).loginWithEmailOtp({ email: f.address,
      code: correct ? first.code : first.code === '000000' ? '000001' : '000000' });
    const rejected = assert.rejects(attempt, EmailOtpInvalidError);
    await reached.promise;
    await redis.deleteChallengeStrict(f.key, first.state.challengeId);
    const second = await issue(f); const replacement = await redis.getStrict(f.key);
    release.resolve(); await rejected;
    assert.equal(await redis.getStrict(f.key), replacement);
    assert.ok(await auth.loginWithEmailOtp({ email: f.address, code: second.code }));
  }
});

test('late provider failure does not delete the replacement reservation', async () => {
  const f = await fixture(); const reached = deferred(), release = deferred();
  const failingEmail = { sendEmailLoginCode: async () => {
    reached.resolve(); await release.promise; throw new Error('injected email delivery failure');
  } } as unknown as EmailService;
  const request = new AuthService(users, redis, undefined, failingEmail).requestEmailOtp(f.address);
  const rejected = assert.rejects(request, /injected email delivery/);
  await reached.promise;
  const old = JSON.parse((await redis.getStrict(f.key))!);
  await redis.deleteChallengeStrict(f.key, old.challengeId);
  const second = await issue(f); const replacement = await redis.getStrict(f.key);
  release.resolve(); await rejected;
  assert.equal(await redis.getStrict(f.key), replacement);
  assert.ok(await auth.loginWithEmailOtp({ email: f.address, code: second.code }));
});

test('30 concurrent MFA first factors yield one linked authority; device completion is single use', async () => {
  const f = await fixture(true); const { code, state } = await issue(f);
  const results = await Promise.allSettled(Array.from({ length: 30 }, () => auth.loginWithEmailOtp({ email: f.address, code })));
  const authorities = new Set<string>();
  for (const result of results) {
    assert.equal(result.status, 'rejected');
    assert.ok(result.reason instanceof TwoFactorRequiredError);
    authorities.add(result.reason.challenge!.challengeId);
  }
  assert.equal(authorities.size, 1);
  const approvalId = [...authorities][0];
  const approval = JSON.parse((await redis.getStrict(`login-approval:${approvalId}`))!);
  assert.equal(approval.authVersion, state.authVersion);
  assert.equal(approval.emailOtpChallengeId, state.challengeId);
  assert.equal(await inspector.pexpiretime(`login-approval:${approvalId}`), state.expiresAt);
  assert.equal(await auth.completeTwoFactorLogin(approvalId), undefined);
  assert.equal(await auth.approveTwoFactorChallenge(randomUUID(), approvalId, approval.matchingNumber), false);
  assert.equal(await auth.approveTwoFactorChallenge(f.id, approvalId, approval.matchingNumber), true);
  const completions = await Promise.all(Array.from({ length: 30 }, () => auth.completeTwoFactorLogin(approvalId)));
  const winner = completions.filter(Boolean);
  assert.equal(winner.length, 1);
  assert.ok(await auth.refreshAccessToken(winner[0]!.tokens.refreshToken));
  await assert.rejects(auth.loginWithEmailOtp({ email: f.address, code }), EmailOtpInvalidError);
});

test('valid TOTP fallback races device completion for the same authority; invalid TOTP never authenticates', async t => {
  const previousOptions = authenticator.options;
  authenticator.options = { epoch: Date.UTC(2026, 9, 7, 0, 0, 15) };
  t.after(() => { authenticator.resetOptions(); authenticator.options = previousOptions; });
  const f = await fixture(true); const { code } = await issue(f);
  await assert.rejects(auth.loginWithEmailOtp({ email: f.address, code, totpCode: 'invalid' }), EmailOtpInvalidError);
  const approval = await challenge(f, code);
  assert.equal(await auth.approveTwoFactorChallenge(f.id, approval.challengeId, approval.matchingNumber), true);
  const outcomes = await Promise.allSettled([
    ...Array.from({ length: 15 }, () => auth.completeTwoFactorLogin(approval.challengeId)),
    ...Array.from({ length: 15 }, () => auth.loginWithEmailOtp({ email: f.address, code, totpCode: authenticator.generate(f.secret!) })),
  ]);
  assert.equal(outcomes.filter(result => result.status === 'fulfilled' && result.value).length, 1);
  assert.equal((await redis.scanStrict(`session:${f.id}:*`)).length, 1);
});

test('device number attempts are atomic and old-epoch approval cannot be completed', async () => {
  const f = await fixture(true); const { code, state } = await issue(f);
  const approval = await challenge(f, code);
  const wrong = approval.matchingNumber === 99 ? 1 : approval.matchingNumber + 1;
  await Promise.all(Array.from({ length: 20 }, () => auth.approveTwoFactorChallenge(f.id, approval.challengeId, wrong)));
  assert.equal(JSON.parse((await redis.getStrict(`login-approval:${approval.challengeId}`))!).attempts, 5);
  assert.equal(await inspector.pexpiretime(`login-approval:${approval.challengeId}`), state.expiresAt);
  assert.equal(await auth.approveTwoFactorChallenge(f.id, approval.challengeId, approval.matchingNumber), false);
  const other = await fixture(true); const second = await issue(other); const staged = await challenge(other, second.code);
  assert.equal(await auth.approveTwoFactorChallenge(other.id, staged.challengeId, staged.matchingNumber), true);
  await users.revokeAllCredentials(other.id); // Keep Redis state to prove database revocation is sufficient.
  assert.equal(await auth.completeTwoFactorLogin(staged.challengeId), undefined);
  await assert.rejects(auth.loginWithEmailOtp({ email: other.address, code: second.code }), EmailOtpInvalidError);
});

test('corrupt approval state cannot authenticate, and an old approval cannot delete a replacement code', async () => {
  for (const corruption of ['unversioned', 'epoch', 'expiry', 'json', 'replacement']) {
    const f = await fixture(true); const first = await issue(f); const staged = await challenge(f, first.code);
    assert.equal(await auth.approveTwoFactorChallenge(f.id, staged.challengeId, staged.matchingNumber), true);
    const key = `login-approval:${staged.challengeId}`;
    const state = JSON.parse((await redis.getStrict(key))!);
    let replacement: string | null = null;
    if (corruption === 'replacement') {
      await redis.deleteChallengeStrict(f.key, first.state.challengeId);
      await issue(f); replacement = await redis.getStrict(f.key);
    } else {
      if (corruption === 'unversioned') delete state.schemaVersion;
      if (corruption === 'epoch') delete state.authVersion;
      if (corruption === 'expiry') state.expiresAtMs = 1;
      await redis.setStrict(key, corruption === 'json' ? '{broken' : JSON.stringify(state), 300);
    }
    assert.equal(await auth.completeTwoFactorLogin(staged.challengeId), undefined);
    assert.equal((await redis.scanStrict(`session:${f.id}:*`)).length, 0);
    if (replacement) assert.equal(await redis.getStrict(f.key), replacement);
  }
});

test('consumption stays burned after session creation fails', async () => {
  for (const failure of ['database', 'redis']) {
    const f = await fixture(); const { code } = await issue(f);
    const failingUsers = Object.create(users) as UserRepository;
    const failingRedis = Object.create(redis) as RedisRepository;
    if (failure === 'database') failingUsers.recordLogin = async () => { throw new Error('injected session database failure'); };
    else failingRedis.setStrict = async () => { throw new Error('injected session redis failure'); };
    await assert.rejects(new AuthService(failingUsers, failingRedis, undefined, email).loginWithEmailOtp({ email: f.address, code }), /injected session/);
    await assert.rejects(auth.loginWithEmailOtp({ email: f.address, code }), EmailOtpInvalidError);
    assert.equal((await redis.scanStrict(`session:${f.id}:*`)).length, 0);
    const fresh = await issue(f);
    assert.ok(await auth.loginWithEmailOtp({ email: f.address, code: fresh.code }));
  }
});

test('HTTP controller verifies only once, returns no cookie on outage, and issued tokens respect epoch revocation', async t => {
  const f = await fixture(); const { code } = await issue(f);
  const controller = new AuthController(auth);
  const app = express(); app.use(express.json());
  app.post('/api/auth/email-otp/verify', validateBody(emailOtpVerifySchema), controller.verifyEmailOtp);
  app.get('/api/users/me', authenticate, (_req, res) => res.json({ ok: true }));
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  t.after(() => new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())));
  const address = server.address(); assert.ok(address && typeof address !== 'string');
  const origin = `http://127.0.0.1:${address.port}`;
  const verify = () => fetch(`${origin}/api/auth/email-otp/verify`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: f.address, code }) });
  const responses = await Promise.all(Array.from({ length: 20 }, verify));
  const successes = responses.filter(response => response.status === 200);
  assert.equal(successes.length, 1);
  assert.ok(successes[0].headers.get('set-cookie')?.includes('refreshToken='));
  for (const response of responses.filter(response => response.status !== 200)) {
    assert.equal(response.status, 401); assert.equal(response.headers.get('set-cookie'), null);
  }
  const body = await successes[0].json() as { data: { tokens: { accessToken: string } } };
  const get = () => fetch(`${origin}/api/users/me`, { headers: { Authorization: `Bearer ${body.data.tokens.accessToken}` } });
  assert.equal((await get()).status, 200);
  await users.revokeAllCredentials(f.id);
  assert.equal((jwt.decode(body.data.tokens.accessToken) as jwt.JwtPayload).authVersion, 0);
  assert.equal((await get()).status, 401);
  const unavailable = new RedisRepository('redis://127.0.0.1:1');
  t.after(() => unavailable.disconnect());
  const outageController = new AuthController(new AuthService(users, unavailable, undefined, email));
  app.post('/api/auth/email-otp/outage', validateBody(emailOtpVerifySchema), outageController.verifyEmailOtp);
  const outage = await fetch(`${origin}/api/auth/email-otp/outage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: f.address, code }) });
  assert.equal(outage.status, 500); assert.equal(outage.headers.get('set-cookie'), null);
  await assert.rejects(new AuthService(users, unavailable, undefined, email).requestEmailOtp(f.address), /connect|closed|disconnect|refused|ready/i);
});
