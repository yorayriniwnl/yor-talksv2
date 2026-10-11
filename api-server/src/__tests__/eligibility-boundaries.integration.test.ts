import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { test, type TestContext } from 'node:test';
import express from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { authenticate, requireRole } from '../middlewares/auth.js';
import { RedisRepository } from '../repositories/redis-repository.js';
import { UserRepository } from '../repositories/user-repository.js';
import { EligibilityService } from '../services/eligibility-service.js';
import type { EligibilityDecision } from '../eligibility/types.js';

const userId = '10000000-0000-4000-8000-000000000099';
const deviceId = 'eligibility-boundary-device';
const activatedTeen: EligibilityDecision = {
  experience: 'teen_13_17', activated: true,
  capabilities: { social: true, publish: false, messaging: true, payments: false, seller: false,
    memberships: false, live: false, rtc: false, ai: false, analytics: false, profiling: false },
  maximumContentRating: 'regular', policyVersions: ['fixture:1'], revision: '2', reason: null,
  publicBrowsingAllowed: true,
};
const restrictedDecision: EligibilityDecision = {
  ...activatedTeen, experience: 'unknown', activated: false,
  capabilities: { social: false, publish: false, messaging: false, payments: false, seller: false,
    memberships: false, live: false, rtc: false, ai: false, analytics: false, profiling: false },
  reason: 'verification_required',
};

function productionEnvironment(t: TestContext) {
  const previous = { publicBeta: env.PUBLIC_BETA, nodeEnv: env.NODE_ENV };
  env.PUBLIC_BETA = false;
  env.NODE_ENV = 'production';
  t.after(() => { env.PUBLIC_BETA = previous.publicBeta; env.NODE_ENV = previous.nodeEnv; });
}

async function startFixture(t: TestContext, decision: EligibilityDecision, role = 'user') {
  const user = {
    id: userId, username: 'boundary_user', email: 'boundary@example.test', fullName: 'Boundary User',
    role, permissions: role === 'moderator' ? ['moderation:reports'] : [], accountStatus: 'active', authVersion: 0,
    termsVersion: env.TERMS_VERSION, termsAcceptedAt: '2026-08-31T00:00:00.000Z', ageConfirmedAt: '2026-08-31T00:00:00.000Z',
  };
  t.mock.method(RedisRepository.prototype, 'getStrict', async (key: string) => key === `session:${userId}:${deviceId}` ? 'active' : null);
  t.mock.method(UserRepository.prototype, 'findById', async (id: string) => id === userId ? user : null);
  t.mock.method(EligibilityService.prototype, 'decisionFor', async () => decision);

  const app = express();
  app.use(express.json());
  app.get('/api/v1/achievements/me', authenticate, (_req, res) => res.status(200).json({ ok: true }));
  app.post('/api/v1/posts', authenticate, (_req, res) => res.status(201).json({ ok: true }));
  app.get('/api/v1/unmapped', authenticate, (_req, res) => res.status(200).json({ ok: true }));
  app.get('/api/v1/reports/queue', authenticate, requireRole('admin', 'moderator'), (_req, res) => res.status(200).json({ ok: true }));
  app.post('/api/v1/reports', authenticate, (_req, res) => res.status(201).json({ ok: true }));

  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise<void>((resolve) => server.close(() => resolve())));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const token = jwt.sign({ sub: userId, role: 'forged-admin', permissions: ['moderation:reports'], deviceId,
    authVersion: 0, type: 'access' }, env.JWT_SECRET, { expiresIn: '1h' });
  return { base: `http://127.0.0.1:${address.port}`, headers: { Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json' } };
}

test('production HTTP routes enforce the current capability and deny unmapped operations', async (t) => {
  productionEnvironment(t);
  const { base, headers } = await startFixture(t, activatedTeen);
  const social = await fetch(`${base}/api/v1/achievements/me`, { headers, signal: AbortSignal.timeout(3000) });
  const publish = await fetch(`${base}/api/v1/posts`, { method: 'POST', headers, body: JSON.stringify({ content: 'denied' }), signal: AbortSignal.timeout(3000) });
  const unmapped = await fetch(`${base}/api/v1/unmapped`, { headers, signal: AbortSignal.timeout(3000) });
  assert.deepEqual({ social: social.status, publish: publish.status, unmapped: unmapped.status },
    { social: 200, publish: 403, unmapped: 403 });
});

test('moderator role does not bypass current eligibility authority', async (t) => {
  productionEnvironment(t);
  const { base, headers } = await startFixture(t, restrictedDecision, 'moderator');
  const response = await fetch(`${base}/api/v1/reports/queue`, { headers, signal: AbortSignal.timeout(3000) });
  assert.equal(response.status, 403, 'staff role is checked in addition to current account and eligibility authority');
});

test('restricted sessions retain the exact safety reporting route', async (t) => {
  productionEnvironment(t);
  const { base, headers } = await startFixture(t, restrictedDecision);
  const response = await fetch(`${base}/api/v1/reports`, { method: 'POST', headers,
    body: JSON.stringify({ reason: 'safety' }), signal: AbortSignal.timeout(3000) });
  assert.equal(response.status, 201);
});
