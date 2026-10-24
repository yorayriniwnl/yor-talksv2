import assert from 'node:assert/strict';
import { test } from 'node:test';
import { classifyApiRoute } from '../eligibility/route-capabilities.js';

test('encrypted relay endpoints require messaging authority at both API mounts', () => {
  for (const mount of ['/api', '/api/v1']) {
    for (const [method, path] of [
      ['GET', '/private-messages/identity'], ['PUT', '/private-messages/identity'],
      ['GET', '/private-messages/threads'], ['POST', '/private-messages/threads'],
      ['GET', '/private-messages/threads/thread'],
      ['GET', '/private-messages/threads/thread/messages'], ['POST', '/private-messages/threads/thread/messages'],
    ]) assert.deepEqual(classifyApiRoute(method, `${mount}${path}`), { kind: 'capability', capability: 'messaging' });
  }
});

test('unsupported relay mutations and subpaths receive no authority', () => {
  for (const [method, path] of [
    ['DELETE', '/private-messages/identity'], ['POST', '/private-messages/identity'],
    ['PUT', '/private-messages/threads/thread/messages'],
    ['POST', '/private-messages/threads/thread/restore'],
    ['GET', '/private-messages/users/user/identity'],
    ['GET', '/private-messages//identity'], ['GET', '/private-messages/%69dentity'],
  ]) assert.equal(classifyApiRoute(method, `/api${path}`), undefined);
});
