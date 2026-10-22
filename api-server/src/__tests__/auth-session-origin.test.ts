import assert from 'node:assert/strict';
import { test } from 'node:test';
import express from 'express';
import cors from 'cors';
import { randomUUID } from 'node:crypto';
import authRouter from '../routes/auth.js';
import { AuthService, type AuthenticatedSession } from '../services/auth-service.js';
import { env, corsOrigins } from '../config/env.js';

test('session-establishing routes reject foreign form origins before issuing browser cookies', async t => {
  let sessionRequests = 0;
  const session = {
    user: { id: randomUUID(), accountStatus: 'active', createdAt: new Date().toISOString(), emailVerified: true },
    tokens: { accessToken: 'isolated-access', refreshToken: 'isolated-refresh', expiresAt: new Date().toISOString() },
    eligibility: { activated: false, experience: 'unknown', maximumContentRating: 'child_safe',
      reason: 'verification_required', policyVersions: [] },
  } as unknown as AuthenticatedSession;
  for (const method of ['login', 'loginWithGoogle', 'loginWithEmailOtp', 'completeTwoFactorLogin'] as const) {
    t.mock.method(AuthService.prototype, method, async () => { sessionRequests++; return session; });
  }
  const app = express();
  // Exercise the same form parser and CORS behavior as the production app.
  app.use(cors({ origin: (origin, callback) => callback(null, !origin || corsOrigins.includes(origin)), credentials: true }));
  app.use(express.urlencoded({ extended: true }));
  app.use('/api', authRouter);
  app.use('/api/v1', authRouter);
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  t.after(() => new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const cases = [
    { path: '/auth/login', body: { identifier: 'attacker@example.test', password: 'AttackerPassword1!' } },
    { path: '/auth/google', body: { credential: 'isolated-google-credential' } },
    { path: '/auth/email-otp/verify', body: { email: '1234567@kiit.ac.in', code: '123456' } },
    { path: `/auth/2fa/challenges/${randomUUID()}/complete`, body: {} },
  ];
  for (const mount of ['/api', '/api/v1']) {
    for (const { path, body } of cases) {
      const post = (origin?: string): Promise<Response> => fetch(`http://127.0.0.1:${address.port}${mount}${path}`, {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', ...(origin ? { Origin: origin } : {}) },
        body: new URLSearchParams(body as Record<string, string>),
      });
      const requestsBefore = sessionRequests;
      const foreign: Response = await post('https://attacker.example');
      assert.equal(foreign.status, 403, `${mount}${path} must reject a foreign form POST`);
      assert.equal(foreign.headers.get('set-cookie'), null);
      assert.equal(sessionRequests, requestsBefore);
      const trusted: Response = await post(corsOrigins[0] || env.CLIENT_ORIGIN);
      assert.equal(trusted.status, 200, `${mount}${path} must retain configured-origin sign-in`);
      assert.match(trusted.headers.get('set-cookie') ?? '', /^refreshToken=isolated-refresh;/);
      const native: Response = await post();
      assert.equal(native.status, 200, `${mount}${path} must retain callers without a browser Origin`);
      assert.match(native.headers.get('set-cookie') ?? '', /^refreshToken=isolated-refresh;/);
    }
  }
  assert.equal(sessionRequests, 16);
});
