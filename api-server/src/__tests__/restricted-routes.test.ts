import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isRestrictedRouteAllowed, normalizeRequestPath } from '../eligibility/restricted-routes.js';

test('normalizeRequestPath handles normal paths, query strings and prefix stripping', () => {
  assert.equal(normalizeRequestPath('/users/me'), '/users/me');
  assert.equal(normalizeRequestPath('/api/v1/users/me'), '/users/me');
  assert.equal(normalizeRequestPath('/api/users/me'), '/users/me');
  assert.equal(normalizeRequestPath('/fixture/users/me/eligibility'), '/users/me/eligibility');
  assert.equal(normalizeRequestPath('/default/users/me/eligibility'), '/users/me/eligibility');
  assert.equal(normalizeRequestPath('/users/me?param=value&foo=bar'), '/users/me');
  assert.equal(normalizeRequestPath('/users/me/#fragment'), '/users/me');
  assert.equal(normalizeRequestPath('/users/me/'), '/users/me');
});

test('normalizeRequestPath rejects path traversal and malicious characters', () => {
  assert.equal(normalizeRequestPath('/api/v1/users/me/../posts'), null);
  assert.equal(normalizeRequestPath('/api/v1/users/%2e%2e/posts'), null);
  assert.equal(normalizeRequestPath('/api/v1/users/%2E%2E/posts'), null);
  assert.equal(normalizeRequestPath('/users/me/..'), null);
  assert.equal(normalizeRequestPath('/users/me/.'), null);
  assert.equal(normalizeRequestPath('/users\\me'), null);
  assert.equal(normalizeRequestPath(''), null);
  assert.equal(normalizeRequestPath(null as unknown as string), null);
  assert.equal(normalizeRequestPath(undefined as unknown as string), null);
});

test('isRestrictedRouteAllowed allows verified owner rights and security endpoints', () => {
  const allowed = [
    ['GET', '/users/me'],
    ['GET', '/api/users/me'],
    ['GET', '/api/v1/users/me'],
    ['DELETE', '/users/me'],
    ['GET', '/users/me/export'],
    ['POST', '/users/me/consent'],
    ['GET', '/users/me/security'],
    ['POST', '/auth/logout'],
    ['POST', '/auth/logout-all'],
    ['POST', '/auth/verify-email/resend'],
    ['GET', '/auth/devices'],
    ['POST', '/auth/2fa/setup'],
    ['POST', '/auth/2fa/confirm'],
    ['POST', '/auth/2fa/disable'],
    ['GET', '/auth/2fa/challenges'],
    ['GET', '/auth/2fa/challenges/00000000-0000-4000-8000-000000000001'],
    ['POST', '/auth/2fa/challenges/00000000-0000-4000-8000-000000000001/approve'],
    ['POST', '/auth/2fa/challenges/00000000-0000-4000-8000-000000000001/deny'],
    ['POST', '/auth/2fa/challenges/00000000-0000-4000-8000-000000000001/complete'],
  ];

  for (const [method, path] of allowed) {
    assert.equal(isRestrictedRouteAllowed(method, path), true, `${method} ${path} must be allowed`);
  }
});

test('isRestrictedRouteAllowed allows eligibility and guardian authorization journeys', () => {
  const validChallengeId = '00000000-0000-4000-8000-000000000002';
  const validAuthId = '00000000-0000-4000-8000-000000000003';
  const allowed = [
    ['GET', '/users/me/eligibility'],
    ['POST', '/users/me/eligibility/challenges'],
    ['GET', `/users/me/eligibility/challenges/${validChallengeId}`],
    ['GET', '/fixture/users/me/eligibility'],
    ['GET', '/users/me/guardian-authorizations'],
    ['POST', '/users/me/guardian-authorizations'],
    ['POST', `/users/me/guardian-authorizations/${validAuthId}/withdraw`],
    ['GET', '/users/me/guardian/authorizations'],
    ['POST', '/users/me/guardian/authorizations'],
    ['POST', `/users/me/guardian/authorizations/${validAuthId}/withdraw`],
  ];

  for (const [method, path] of allowed) {
    assert.equal(isRestrictedRouteAllowed(method, path), true, `${method} ${path} must be allowed`);
  }
});

test('isRestrictedRouteAllowed allows harm-reporting, grievance and health diagnostics', () => {
  const allowed = [
    ['POST', '/reports'],
    ['POST', '/reports/'],
    ['POST', '/api/reports'],
    ['POST', '/reports/grievance'],
    ['GET', '/reports/grievance/YT-GRV-ABCDE12345'],
    ['GET', '/reports/grievance/00000000-0000-4000-8000-000000000004'],
    ['GET', '/health'],
    ['GET', '/health/live'],
    ['GET', '/health/ready'],
    ['GET', '/diagnostics'],
    ['GET', '/docs'],
  ];

  for (const [method, path] of allowed) {
    assert.equal(isRestrictedRouteAllowed(method, path), true, `${method} ${path} must be allowed`);
  }
});

test('isRestrictedRouteAllowed denies social, content, publication, messaging and discovery routes', () => {
  const denied = [
    ['PUT', '/users/me'], // Profile update
    ['PUT', '/users/me/privacy'],
    ['PUT', '/users/me/settings'],
    ['POST', '/users/me/avatar'],
    ['GET', '/users/search'],
    ['GET', '/users/some-user-id'],
    ['POST', '/users/some-user-id/follow'],
    ['DELETE', '/users/some-user-id/unfollow'],
    ['GET', '/posts'],
    ['POST', '/posts'],
    ['GET', '/posts/123/comments'],
    ['POST', '/posts/123/comments'],
    ['POST', '/posts/123/like'],
    ['GET', '/messages'],
    ['POST', '/messages'],
    ['POST', '/media/presign'],
    ['POST', '/media/upload'],
    ['GET', '/stories'],
    ['POST', '/stories'],
    ['GET', '/videos'],
    ['POST', '/videos'],
    ['GET', '/communities'],
    ['POST', '/communities'],
    ['GET', '/broadcast-channels'],
    ['POST', '/economy/orders'],
    ['POST', '/subscriptions/subscribe'],
    ['POST', '/streams'],
  ];

  for (const [method, path] of denied) {
    assert.equal(isRestrictedRouteAllowed(method, path), false, `${method} ${path} must be denied`);
  }
});

test('isRestrictedRouteAllowed rejects invalid UUIDs in parameterized routes', () => {
  assert.equal(isRestrictedRouteAllowed('GET', '/users/me/eligibility/challenges/not-a-uuid'), false);
  assert.equal(isRestrictedRouteAllowed('POST', '/users/me/guardian-authorizations/not-a-uuid/withdraw'), false);
  assert.equal(isRestrictedRouteAllowed('GET', '/auth/2fa/challenges/not-a-uuid'), false);
  assert.equal(isRestrictedRouteAllowed('POST', '/auth/2fa/challenges/not-a-uuid/approve'), false);
});
