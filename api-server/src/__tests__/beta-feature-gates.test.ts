import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import express from 'express';
import jwt from 'jsonwebtoken';
import { db, pool } from '@workspace/db';
import { env } from '../config/env.js';
import { PaymentService } from '../services/payment-service.js';
import { SubscriptionService } from '../services/subscription-service.js';
import { PaymentsNotConfiguredError } from '../services/razorpay-service.js';
import { RedisRepository } from '../repositories/redis-repository.js';
import { UserRepository } from '../repositories/user-repository.js';
import { economyRoutes } from '../routes/economy-routes.js';
import { subscriptionRoutes } from '../routes/subscriptions.js';
import streams from '../routes/streams.js';
import notifications from '../routes/notifications.js';

after(() => pool.end());
const actorId = '10000000-0000-4000-8000-000000000071';
const targetId = '10000000-0000-4000-8000-000000000072';

test('disabled payments reject creation, cached order reuse and verification before database access', async (t) => {
  const original = env.PAYMENTS_ENABLED;
  env.PAYMENTS_ENABLED = false;
  t.after(() => { env.PAYMENTS_ENABLED = original; });
  t.mock.method(db, 'select', () => { throw new Error('Disabled payments must not inspect or reuse existing orders'); });
  const payments = new PaymentService();
  const subscriptions = new SubscriptionService();
  await assert.rejects(() => payments.createTipOrder({ payerId: actorId, creatorId: targetId, amountMinor: 100 }), PaymentsNotConfiguredError);
  await assert.rejects(() => payments.verifyTipPayment({ payerId: actorId, orderId: 'existing', paymentId: 'old', signature: 'old' }), PaymentsNotConfiguredError);
  await assert.rejects(() => subscriptions.createOrder({ subscriberId: actorId, creatorId: targetId, tier: 'chai' }), PaymentsNotConfiguredError);
  await assert.rejects(() => subscriptions.verifyPayment({ subscriberId: actorId, subscriptionId: targetId, orderId: 'existing', paymentId: 'old', signature: 'old' }), PaymentsNotConfiguredError);
});

test('disabled beta features stay closed through both HTTP API prefixes without contacting providers', async (t) => {
  const original = { PUBLIC_BETA: env.PUBLIC_BETA, PAYMENTS_ENABLED: env.PAYMENTS_ENABLED, LIVE_ROOMS_ENABLED: env.LIVE_ROOMS_ENABLED, WEB_PUSH_ENABLED: env.WEB_PUSH_ENABLED };
  Object.assign(env, { PUBLIC_BETA: true, PAYMENTS_ENABLED: false, LIVE_ROOMS_ENABLED: false, WEB_PUSH_ENABLED: false });
  t.after(() => Object.assign(env, original));
  t.mock.method(RedisRepository.prototype, 'get', async () => 'fixture-session');
  t.mock.method(UserRepository.prototype, 'findById', async () => ({ id: actorId, role: 'user', permissions: [], accountStatus: 'active', termsVersion: env.TERMS_VERSION, termsAcceptedAt: '2026-08-31', ageConfirmedAt: '2026-08-31' }));
  const routes = express.Router();
  routes.use('/economy', economyRoutes);
  routes.use('/subscriptions', subscriptionRoutes);
  routes.use(streams);
  routes.use(notifications);
  const app = express();
  app.use(express.json());
  app.use('/api/v1', routes);
  app.use('/api', routes);
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  t.after(() => new Promise<void>((resolve) => { server.closeAllConnections(); server.close(() => resolve()); }));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}`;
  const originalFetch = globalThis.fetch;
  let providerRequests = 0;
  t.mock.method(globalThis, 'fetch', (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
    if (!String(input).startsWith(`${base}/`)) { providerRequests++; throw new Error('A disabled provider was contacted'); }
    return originalFetch(input, init);
  });
  const token = jwt.sign({ sub: actorId, deviceId: 'fixture-device' }, env.JWT_SECRET, { expiresIn: '5m' });
  const verification = { orderId: 'existing', paymentId: 'old', signature: 'old' };
  const cases: Array<[string, string, unknown?, number?]> = [
    ['POST', '/economy/orders', { creatorId: targetId, amountMinor: 100 }],
    ['POST', '/economy/superchat', { creatorId: targetId, amountMinor: 100 }],
    ['POST', '/economy/orders/existing/verify', verification],
    ['POST', '/subscriptions/subscribe', { creatorId: targetId, tier: 'chai' }],
    ['POST', `/subscriptions/${targetId}/verify`, verification],
    ['POST', '/streams', { title: 'Fixture stream', coverUrl: 'https://example.invalid/cover.png', kind: 'video', startsAt: '2026-09-01T00:00:00Z', category: 'technology', contentRating: 'regular' }],
    ['GET', `/streams/${targetId}/token`],
    ['PUT', `/streams/${targetId}/status`, { status: 'live' }],
    ['GET', '/notifications/push/public-key'],
    ['POST', '/notifications/push/subscribe', {}],
    ['DELETE', '/notifications/push/subscribe', {}],
    ['GET', '/streams', undefined, 200],
    ['GET', `/streams/${targetId}`, undefined, 404],
  ];
  for (const prefix of ['/api', '/api/v1']) {
    for (const [method, path, body, expected = 503] of cases) {
      const response = await fetch(`${base}${prefix}${path}`, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
      assert.equal(response.status, expected, `${method} ${prefix}${path}`);
      const payload = await response.json() as { data?: unknown };
      if (path === '/streams' && method === 'GET') assert.deepEqual(payload.data, []);
    }
  }
  assert.equal(providerRequests, 0);
});
