import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { pool } from '@workspace/db';
import { AuthService, TwoFactorRequiredError } from '../services/auth-service.js';
import { UserRepository } from '../repositories/user-repository.js';
import { RedisRepository } from '../repositories/redis-repository.js';
import { EmailService } from '../services/email-service.js';
import { authenticator } from 'otplib';
import express from 'express';
import { authenticate, closeAuthDependencies } from '../middlewares/auth.js';

const users = new UserRepository();
const redis = new RedisRepository();
const ids: string[] = [];
const email = { sendPasswordResetEmail: async () => undefined } as unknown as EmailService;
const auth = new AuthService(users, redis, undefined, email);

async function fixture(twoFactor = false) {
  const id = randomUUID(); ids.push(id);
  const identifier = `${id.slice(0, 8)}@kiit.ac.in`;
  await pool.query(`INSERT INTO users(id, username, email, password_hash, full_name, email_verified, totp_secret)
    VALUES($1, $2, $3, $4, 'Synthetic lifecycle account', true, $5)`,
  [id, `session-${id.slice(0, 8)}`, identifier, await bcrypt.hash('synthetic-password-1', 10), twoFactor ? authenticator.generateSecret() : null]);
  return { id, identifier, user: (await users.findById(id))! };
}

after(async () => {
  for (const id of ids) {
    for (const key of await redis.scanStrict(`session:${id}:*`)) await redis.delStrict(key);
    await users.deleteById(id);
  }
  await redis.disconnect();
  await closeAuthDependencies();
  await pool.end();
});

test('same-second rotation has unique jti and concurrent replay has exactly one winner', async () => {
  const f = await fixture();
  const first = await auth.login({ identifier: f.identifier, password: 'synthetic-password-1' });
  const results = await Promise.all(Array.from({ length: 20 }, () => auth.refreshAccessToken(first.tokens.refreshToken)));
  const winners = results.filter(Boolean);
  assert.equal(winners.length, 1);
  const winner = winners[0]!;
  assert.notEqual(winner.refreshToken, first.tokens.refreshToken);
  assert.notEqual((jwt.decode(winner.refreshToken) as jwt.JwtPayload).jti, (jwt.decode(first.tokens.refreshToken) as jwt.JwtPayload).jti);
  assert.equal(await auth.refreshAccessToken(first.tokens.refreshToken), undefined);
  const next = await auth.refreshAccessToken(winner.refreshToken);
  assert.ok(next);
  assert.notEqual(next.refreshToken, winner.refreshToken);
});

test('logout-all rejects old refresh and approved challenges even when Redis cleanup fails', async t => {
  // Exercise real token generation/checking at one deterministic TOTP epoch.
  // Database reads and bcrypt may cross a 30-second wall-clock boundary; JWT,
  // challenge and Redis clocks continue to use their real time.
  const previousOptions = authenticator.options;
  authenticator.options = { epoch: Date.UTC(2026, 9, 6, 0, 0, 15) };
  t.after(() => { authenticator.resetOptions(); authenticator.options = previousOptions; });
  const f = await fixture(true);
  const login = await auth.login({ identifier: f.identifier, password: 'synthetic-password-1', totpCode: authenticator.generate(f.user.totpSecret!) });
  let challenge: TwoFactorRequiredError['challenge'];
  await assert.rejects(auth.login({ identifier: f.identifier, password: 'synthetic-password-1' }), error => {
    assert.ok(error instanceof TwoFactorRequiredError); challenge = error.challenge; return true;
  });
  assert.equal(await auth.approveTwoFactorChallenge(f.id, challenge!.challengeId, challenge!.matchingNumber), true);
  const failingRedis = Object.create(redis) as RedisRepository;
  failingRedis.scanStrict = async () => { throw new Error('injected Redis cleanup outage'); };
  await new AuthService(users, failingRedis).logoutAllDevices(f.id);
  assert.equal((await users.findById(f.id))!.authVersion, 1);
  assert.equal(await auth.refreshAccessToken(login.tokens.refreshToken), undefined);
  assert.equal(await auth.completeTwoFactorLogin(challenge!.challengeId), undefined);
  const unavailable = Object.create(redis) as RedisRepository;
  unavailable.getStrict = async () => { throw new Error('injected Redis command outage'); };
  const fresh = await auth.login({ identifier: f.identifier, password: 'synthetic-password-1', totpCode: authenticator.generate(f.user.totpSecret!) });
  await assert.rejects(new AuthService(users, unavailable).refreshAccessToken(fresh.tokens.refreshToken), /injected Redis/);
});

test('password reset is single-use, transactionally revokes all sessions, and preserves the token after database rollback', async () => {
  const f = await fixture();
  const session = await auth.login({ identifier: f.identifier, password: 'synthetic-password-1' });
  const token = (await auth.requestPasswordReset(f.identifier))!;
  assert.ok(token);
  const results = await Promise.all([
    auth.confirmPasswordReset(token, 'first-new-password'), auth.confirmPasswordReset(token, 'second-new-password'),
  ]);
  assert.equal(results.filter(Boolean).length, 1);
  const current = (await users.findById(f.id))!;
  assert.equal(current.authVersion, 1);
  assert.ok(await bcrypt.compare(results[0] ? 'first-new-password' : 'second-new-password', current.passwordHash));
  assert.equal(await auth.refreshAccessToken(session.tokens.refreshToken), undefined);
  assert.equal(await auth.confirmPasswordReset(token, 'replay-password'), false);
  const nextHash = await redis.hashToken(randomUUID());
  await users.savePasswordReset(nextHash, current);
  await assert.rejects(users.redeemPasswordReset(nextHash, null as unknown as string), error => {
    assert.equal((error as Error & { cause: { code: string } }).cause.code, '23502'); return true;
  });
  assert.equal((await pool.query('SELECT consumed_at FROM password_reset_tokens WHERE token_hash=$1', [nextHash])).rows[0].consumed_at, null);
  assert.equal(await users.redeemPasswordReset(nextHash, await bcrypt.hash('after-rollback', 10)), f.id);
  assert.equal((await users.findById(f.id))!.authVersion, 2);
});

test('expired reset credentials never change a password', async () => {
  const f = await fixture();
  const hash = await redis.hashToken(randomUUID());
  await users.savePasswordReset(hash, f.user);
  await pool.query(`UPDATE password_reset_tokens SET expires_at=now()-interval '1 second' WHERE token_hash=$1`, [hash]);
  assert.equal(await users.redeemPasswordReset(hash, 'not-a-real-hash'), undefined);
  assert.equal((await users.findById(f.id))!.passwordHash, f.user.passwordHash);
});

test('HTTP rejects revoked epochs with a stale Redis key and reports dependency outages without expiring the cookie', async t => {
  const f = await fixture();
  const loggedIn = await auth.login({ identifier: f.identifier, password: 'synthetic-password-1' });
  const app = express();
  app.get('/api/users/me', authenticate, (_req, res) => res.json({ ok: true }));
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  t.after(() => new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())));
  const address = server.address(); assert.ok(address && typeof address !== 'string');
  const get = () => fetch(`http://127.0.0.1:${address.port}/api/users/me`, { headers: { Authorization: `Bearer ${loggedIn.tokens.accessToken}` } });
  assert.equal((await get()).status, 200);
  const unavailable = t.mock.method(RedisRepository.prototype, 'getStrict', async () => { throw new Error('injected HTTP Redis outage'); });
  const response = await get();
  assert.equal(response.status, 503);
  assert.equal(response.headers.get('set-cookie'), null);
  unavailable.mock.restore();
  await users.revokeAllCredentials(f.id);
  const claims = jwt.decode(loggedIn.tokens.accessToken) as jwt.JwtPayload;
  assert.ok(await redis.getStrict(`session:${f.id}:${claims.deviceId}`));
  assert.equal((await get()).status, 401);
});

test('call cleanup atomically releases both participants so they can place another call', async () => {
  const first = randomUUID(), callerId = randomUUID(), recipientId = randomUUID();
  const call = { id: first, callerId, recipientId, createdAt: Date.now(), status: 'ringing' as const };
  assert.equal(await redis.reserveSocketCallStrict(call, 30), true);
  assert.equal(JSON.parse((await redis.releaseSocketCallStrict(first))!).id, first);
  assert.equal(await redis.releaseSocketCallStrict(first), null);
  const second = { ...call, id: randomUUID() };
  assert.equal(await redis.reserveSocketCallStrict(second, 30), true);
  await redis.releaseSocketCallStrict(second.id);
});
