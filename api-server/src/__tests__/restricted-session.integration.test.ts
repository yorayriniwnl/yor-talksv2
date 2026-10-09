import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { test, type TestContext } from 'node:test';
import express from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { authenticate } from '../middlewares/auth.js';
import { RedisRepository } from '../repositories/redis-repository.js';
import { UserRepository } from '../repositories/user-repository.js';
import { EligibilityRepository } from '../repositories/eligibility-repository.js';
import { toRestrictedUser } from '../utils/user-view.js';
import { createResponse } from '../utils/response.js';

const userId = '10000000-0000-4000-8000-000000000099';
const deviceId = 'restricted-device-1';

function createRestrictedFixture(t: TestContext) {
  const user = {
    id: userId,
    username: 'restricted_user',
    email: 'restricted@example.test',
    fullName: 'Restricted User',
    bio: 'Secret Bio',
    avatarUrl: 'https://example.test/avatar.jpg',
    role: 'user',
    permissions: ['read:profile'],
    accountStatus: 'active',
    termsVersion: env.TERMS_VERSION,
    termsAcceptedAt: '2026-08-31T00:00:00.000Z',
    ageConfirmedAt: '2026-08-31T00:00:00.000Z',
    createdAt: '2026-08-31T00:00:00.000Z',
    updatedAt: '2026-08-31T00:00:00.000Z',
    followerCount: 42,
    followingCount: 17,
    settings: {
      theme: 'light' as const,
      notificationsEnabled: true,
      privateAccount: true,
      contentFilter: 'child_safe' as const,
    },
    privacy: {
      profileVisibility: 'private' as const,
      messageRequests: false,
      allowDmFromStrangers: false,
    },
  };

  t.mock.method(RedisRepository.prototype, 'getStrict', async (key: string) => {
    if (key === `session:${userId}:${deviceId}`) return 'active';
    return null;
  });

  t.mock.method(UserRepository.prototype, 'findById', async (id: string) => {
    if (id === userId) return user;
    return null;
  });

  // Return unverified facts -> evaluates to activated: false, reason: 'verification_required'
  t.mock.method(EligibilityRepository.prototype, 'readFacts', async (id: string) => {
    if (id === userId) {
      return {
        account: {
          id: userId,
          status: 'active',
          termsVersion: env.TERMS_VERSION,
          termsAcceptedAt: '2026-08-31T00:00:00.000Z',
          contentPreference: 'child_safe' as const,
        },
        revision: '1',
        assessment: undefined,
        guardianAuthorizations: [],
      };
    }
    return undefined;
  });

  const app = express();
  app.use(express.json());

  // Mount dummy routes mimicking app endpoints
  app.get('/api/v1/users/me', authenticate, (req, res) => {
    if (req.eligibility && !req.eligibility.activated) {
      return res.status(200).json(createResponse('Profile loaded', toRestrictedUser(user as any, req.eligibility.reason)));
    }
    return res.status(200).json(createResponse('Profile loaded', user));
  });

  app.put('/api/v1/users/me', authenticate, (_req, res) => {
    res.status(200).json(createResponse('Profile updated', user));
  });

  app.post('/api/v1/users/me/avatar', authenticate, (_req, res) => {
    res.status(200).json(createResponse('Avatar updated', user));
  });

  app.post('/api/v1/users/me/consent', authenticate, (_req, res) => {
    res.status(200).json(createResponse('Terms accepted', null));
  });

  app.get('/api/v1/users/me/eligibility', authenticate, (req, res) => {
    res.status(200).json(createResponse('Eligibility status', req.eligibility));
  });

  app.get('/api/v1/users/me/guardian-authorizations', authenticate, (_req, res) => {
    res.status(200).json(createResponse('Guardian authorizations', []));
  });

  app.post('/api/v1/posts', authenticate, (_req, res) => {
    res.status(201).json(createResponse('Post created', { id: 'p1' }));
  });

  app.get('/api/v1/posts', authenticate, (_req, res) => {
    res.status(200).json(createResponse('Posts loaded', []));
  });

  app.post('/api/v1/messages', authenticate, (_req, res) => {
    res.status(201).json(createResponse('Message sent', { id: 'm1' }));
  });

  app.get('/api/v1/messages', authenticate, (_req, res) => {
    res.status(200).json(createResponse('Messages loaded', []));
  });

  app.post('/api/v1/media/presign', authenticate, (_req, res) => {
    res.status(200).json(createResponse('Media presigned', { reservationId: 'r1' }));
  });

  app.post('/api/v1/media/upload', authenticate, (_req, res) => {
    res.status(200).json(createResponse('Media uploaded', { id: 'med1' }));
  });

  app.post('/api/v1/reports', authenticate, (_req, res) => {
    res.status(201).json(createResponse('Report filed', null));
  });

  app.post('/api/v1/auth/logout', authenticate, (_req, res) => {
    res.status(200).json(createResponse('Logged out', null));
  });

  return app;
}

test('restricted session cannot bypass policy on direct social, media, and feed endpoints', async (t) => {
  const previousPublicBeta = env.PUBLIC_BETA;
  const previousNodeEnv = env.NODE_ENV;
  env.PUBLIC_BETA = true;
  env.NODE_ENV = "production";
  t.after(() => { env.PUBLIC_BETA = previousPublicBeta; env.NODE_ENV = previousNodeEnv; });
  const app = createRestrictedFixture(t);
  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise<void>((resolve) => server.close(() => resolve())));

  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}`;

  const token = jwt.sign({ sub: userId, role: 'user', permissions: ['read:profile'], deviceId, authVersion: 0, type: 'access' }, env.JWT_SECRET, { expiresIn: '1h' });
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  // 1. Allowed: GET /users/me returns restricted view
  const meRes = await fetch(`${base}/api/v1/users/me`, { headers });
  assert.equal(meRes.status, 200);
  const meData = (await meRes.json() as any).data;
  assert.equal(meData.restricted, true);
  assert.equal(meData.eligibility.activated, false);
  assert.equal(meData.eligibility.reason, 'verification_required');
  assert.equal(meData.followerCount, undefined);
  assert.equal(meData.bio, undefined);
  assert.equal(meData.avatarUrl, undefined);

  // 2. Allowed: POST /users/me/consent, GET eligibility, GET guardian-authorizations, POST /reports, POST /auth/logout
  assert.equal((await fetch(`${base}/api/v1/users/me/consent`, { method: 'POST', headers, body: JSON.stringify({ termsVersion: env.TERMS_VERSION }) })).status, 200);
  assert.equal((await fetch(`${base}/api/v1/users/me/eligibility`, { headers })).status, 200);
  assert.equal((await fetch(`${base}/api/v1/users/me/guardian-authorizations`, { headers })).status, 200);
  assert.equal((await fetch(`${base}/api/v1/reports`, { method: 'POST', headers, body: JSON.stringify({ reason: 'spam' }) })).status, 201);
  assert.equal((await fetch(`${base}/api/v1/auth/logout`, { method: 'POST', headers })).status, 200);

  // 3. Denied with 403: PUT /users/me, POST avatar, posts, messages, media uploads
  const deniedEndpoints: Array<[string, string, unknown?]> = [
    ['PUT', '/api/v1/users/me', { bio: 'attempt' }],
    ['POST', '/api/v1/users/me/avatar', { avatarMediaId: '00000000-0000-4000-8000-000000000001' }],
    ['POST', '/api/v1/posts', { content: 'hello' }],
    ['GET', '/api/v1/posts'],
    ['POST', '/api/v1/messages', { content: 'hello' }],
    ['GET', '/api/v1/messages'],
    ['POST', '/api/v1/media/presign', { purpose: 'post_image' }],
    ['POST', '/api/v1/media/upload', { purpose: 'post_image' }],
  ];

  for (const [method, path, body] of deniedEndpoints) {
    const res = await fetch(`${base}${path}`, {
      method,
      headers,
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    assert.equal(res.status, 403, `${method} ${path} must return 403 for restricted user`);
    const payload = await res.json() as any;
    assert.equal(payload.meta.eligibilityRequired, true);
    assert.equal(payload.meta.reason, 'verification_required');
  }

  // 4. Encoded path traversal attempt: GET /api/v1/users/me/%2e%2e/posts
  const encodedTraversalRes = await fetch(`${base}/api/v1/users/me/%2e%2e/posts`, { headers });
  assert.ok([403, 404].includes(encodedTraversalRes.status), 'Encoded path traversal must never grant social access');
});
