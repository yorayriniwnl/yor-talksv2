import assert from 'node:assert/strict';
import { after, test, type TestContext } from 'node:test';
import { randomUUID } from 'node:crypto';
import http from 'node:http';
import express from 'express';
import jwt from 'jsonwebtoken';
import { pool } from '@workspace/db';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';
import { closeAuthenticationDependencies } from '../middlewares/auth.js';
import { closeRateLimitRedis } from '../middlewares/rate-limit.js';
import { UserController } from '../controllers/user-controller.js';
import { AccountService } from '../services/account-service.js';
import type { AuthService } from '../services/auth-service.js';
import type { UserService } from '../services/user-service.js';
import { UserRepository } from '../repositories/user-repository.js';
import { RedisRepository } from '../repositories/redis-repository.js';
import userRoutes from '../routes/users.js';
import { createTestUser } from './test-helpers.js';

after(async () => { await closeAuthenticationDependencies(); await closeRateLimitRedis(); await pool.end(); });

async function listen(t: TestContext, app: express.Express) {
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  t.after(() => new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  return `http://127.0.0.1:${address.port}`;
}

test('a post-header export source failure is logged without private error details and closes the download', async t => {
  const warnings: unknown[][] = [];
  t.mock.method(logger, 'warn', (...args: unknown[]) => { warnings.push(args); });
  let released = false;
  const accounts = {
    async *streamAccountExport() {
      try {
        yield '{"version":2,"account":{}}';
        throw new Error('private-provider-credential-marker');
      } finally { released = true; }
    },
  } as unknown as AccountService;
  const controller = new UserController({} as UserService, {} as AuthService, accounts);
  const app = express();
  app.get('/export', (req, res) => { req.user = { id: randomUUID(), role: 'user', permissions: [] }; void controller.exportAccount(req, res); });
  const base = await listen(t, app);
  await assert.rejects(async () => { const response = await fetch(`${base}/export`); await response.text(); });
  assert.equal(released, true);
  assert.equal(warnings.length, 1);
  assert.deepEqual(warnings[0], [{ errorName: 'Error' }, 'Account export stream failed']);
  assert.doesNotMatch(JSON.stringify(warnings), /private-provider-credential-marker/);
});

test('a client disconnect closes its export generator without logging a source failure', async t => {
  const warnings: unknown[][] = [];
  t.mock.method(logger, 'warn', (...args: unknown[]) => { warnings.push(args); });
  let release!: () => void;
  const released = new Promise<void>(resolve => { release = resolve; });
  const accounts = {
    async *streamAccountExport(_userId: string, options: { signal: AbortSignal }) {
      try {
        yield '{"version":2,"content":[';
        for (;;) {
          await new Promise<void>(resolve => setImmediate(resolve));
          options.signal.throwIfAborted();
          yield JSON.stringify('synthetic row');
        }
      } finally { release(); }
    },
  } as unknown as AccountService;
  const controller = new UserController({} as UserService, {} as AuthService, accounts);
  const app = express();
  app.get('/export', (req, res) => { req.user = { id: randomUUID(), role: 'user', permissions: [] }; void controller.exportAccount(req, res); });
  const base = await listen(t, app);
  await new Promise<void>((resolve, reject) => {
    const request = http.get(`${base}/export`, response => {
      response.once('data', () => { request.destroy(); resolve(); });
      response.on('error', () => {});
    });
    request.once('error', reject);
  });
  await released;
  await new Promise<void>(resolve => setImmediate(resolve));
  assert.deepEqual(warnings, []);
});

test('the actual export route verifies current sessions and applies the per-account four-download limit', async t => {
  const users = new UserRepository(), redis = new RedisRepository();
  const owner = await createTestUser(users), other = await createTestUser(users);
  const device = randomUUID(), otherDevice = randomUUID();
  const sessionKey = `session:${owner.id}:${device}`, otherSessionKey = `session:${other.id}:${otherDevice}`;
  t.after(async () => {
    try {
      await redis.delStrict(sessionKey); await redis.delStrict(otherSessionKey);
      await pool.query('DELETE FROM users WHERE id=ANY($1::uuid[])', [[owner.id, other.id]]);
    } finally { await redis.disconnect(); }
  });
  const token = (id: string, deviceId: string, authVersion = 0) => jwt.sign({ sub: id, deviceId, authVersion, type: 'access' }, env.JWT_SECRET, { expiresIn: '15m' });
  t.mock.method(AccountService.prototype, 'streamAccountExport', async function* (userId: string) {
    yield JSON.stringify({ version: 2, account: { id: userId } });
  });
  const app = express();
  app.use('/api', userRoutes);
  const base = await listen(t, app), url = `${base}/api/users/me/export`;
  assert.equal((await fetch(url)).status, 401);
  const headers = { Authorization: `Bearer ${token(owner.id, device)}` };
  assert.equal((await fetch(url, { headers })).status, 401, 'a signed token without a live device session cannot export');
  await redis.setStrict(sessionKey, 'synthetic-active-session', 120);
  const stale = await fetch(url, { headers: { Authorization: `Bearer ${token(owner.id, device, (owner.authVersion ?? 0) + 1)}` } });
  assert.equal(stale.status, 401, 'authVersion is checked before export');
  for (let i = 0; i < 4; i++) {
    const response = await fetch(url, { headers });
    assert.equal(response.status, 200);
    const body = await response.json() as { data: { account: { id: string } } };
    assert.equal(body.data.account.id, owner.id);
  }
  const limited = await fetch(url, { headers });
  assert.equal(limited.status, 429);
  assert.equal(limited.headers.get('content-disposition'), null);
  await redis.setStrict(otherSessionKey, 'synthetic-other-session', 120);
  assert.equal((await fetch(url, { headers: { Authorization: `Bearer ${token(other.id, otherDevice)}` } })).status, 200, 'the limit is scoped to the authenticated account');
  await redis.delStrict(otherSessionKey);
  const revoked = await fetch(url, { headers: { Authorization: `Bearer ${token(other.id, otherDevice)}` } });
  assert.equal(revoked.status, 401);
  assert.equal(revoked.headers.get('content-disposition'), null);
});
