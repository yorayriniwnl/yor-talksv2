import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import express from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import notificationRoutes from '../routes/notifications.js';
import { env } from '../config/env.js';
import { closeAuthenticationDependencies } from '../middlewares/auth.js';
import { RedisRepository } from '../repositories/redis-repository.js';
import { UserRepository } from '../repositories/user-repository.js';
import { PushSubscriptionRepository } from '../repositories/push-subscription-repository.js';
import { EligibilityService } from '../services/eligibility-service.js';

test('authenticated push registration rejects internal endpoints before persistence and accepts supported browser subscriptions', async t => {
  const userId = randomUUID(), deviceId = randomUUID();
  const original = env.WEB_PUSH_ENABLED;
  env.WEB_PUSH_ENABLED = true;
  t.after(async () => { env.WEB_PUSH_ENABLED = original; await closeAuthenticationDependencies(); });
  t.mock.method(RedisRepository.prototype, 'getStrict', async () => 'active');
  t.mock.method(UserRepository.prototype, 'findById', async () => ({ id: userId, role: 'user', permissions: [],
    accountStatus: 'active', authVersion: 0, settings: { notificationsEnabled: true } }) as any);
  t.mock.method(EligibilityService.prototype, 'decisionFor', async () => ({ activated: true,
    experience: 'adult_18_plus', capabilities: { social: true } }) as any);
  const writes = t.mock.method(PushSubscriptionRepository.prototype, 'upsert', async () => ({ id: randomUUID() }) as any);
  const app = express();
  app.use(express.json());
  app.use('/api', notificationRoutes);
  app.use('/api/v1', notificationRoutes);
  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    res.status(error instanceof z.ZodError ? 400 : 500).json({ success: false });
  });
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  t.after(() => new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const token = jwt.sign({ sub: userId, deviceId, authVersion: 0, type: 'access' }, env.JWT_SECRET, { expiresIn: '5m' });
  for (const mount of ['/api', '/api/v1']) {
    const subscribe = (endpoint: string, authenticated = true): Promise<Response> => fetch(`http://127.0.0.1:${address.port}${mount}/notifications/push/subscribe`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...(authenticated ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ endpoint, keys: { p256dh: 'synthetic-public-key', auth: 'synthetic-auth-key' } }),
    });
    assert.equal((await subscribe('https://fcm.googleapis.com/wp/synthetic', false)).status, 401);
    for (const endpoint of ['https://127.0.0.1/private', 'https://169.254.169.254/latest/meta-data/', 'https://unrelated.example/push']) {
      const before = writes.mock.callCount();
      assert.equal((await subscribe(endpoint)).status, 400);
      assert.equal(writes.mock.callCount(), before);
    }
    assert.equal((await subscribe('https://fcm.googleapis.com/wp/synthetic')).status, 201);
  }
  assert.equal(writes.mock.callCount(), 2);
});
