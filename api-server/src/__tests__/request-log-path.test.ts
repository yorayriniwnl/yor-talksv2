import assert from 'node:assert/strict';
import { test } from 'node:test';
import { requestLogPath } from '../lib/request-log-path.js';

test('request logs omit credential paths and queries while retaining the endpoint', () => {
  for (const prefix of ['/api', '/api/v1']) {
    const path = requestLogPath(`${prefix}/auth/verify-email/private-verification-credential?token=private-query-credential`);
    assert.equal(path, `${prefix}/auth/verify-email/[redacted]`);
    assert.doesNotMatch(path!, /private-/);
  }
  assert.equal(requestLogPath('/api/AUTH/VERIFY-EMAIL/private%2Fcredential/'), '/api/AUTH/VERIFY-EMAIL/[redacted]/');
  assert.equal(requestLogPath('/api/media/id/content?token=private-media-grant'), '/api/media/id/content');
  assert.equal(requestLogPath('/api/posts?search=private-query'), '/api/posts');
  assert.equal(requestLogPath(undefined), undefined);
});
