import assert from 'node:assert/strict';
import test from 'node:test';
import { isAllowedPushEndpoint } from '../utils/push-endpoint.js';

test('push endpoints accept documented vendor destinations without permitting arbitrary outbound requests', () => {
  for (const endpoint of [
    'https://fcm.googleapis.com/wp/synthetic-browser-capability',
    'https://fcm.googleapis.com/fcm/send/synthetic-browser-capability',
    'https://updates.push.services.mozilla.com/wpush/v2/synthetic-browser-capability',
    'https://web.push.apple.com/synthetic-browser-capability?token=synthetic',
  ]) assert.equal(isAllowedPushEndpoint(endpoint), true, endpoint);

  for (const endpoint of [
    'https://127.0.0.1/private', 'https://[::1]/private', 'https://169.254.169.254/latest/meta-data/',
    'https://redis/private', 'https://example.com/push', 'http://fcm.googleapis.com/wp/test',
    'https://fcm.googleapis.com:8443/wp/test', 'https://user:password@fcm.googleapis.com/wp/test',
    'https://fcm.googleapis.com.evil.test/wp/test', 'https://notpush.apple.com/test',
    'https://web.push.apple.com.evil.test/test', 'https://fcm.googleapis.com/wp/test#fragment',
    'https://fcm.googleapis.com/', 'https://fcm.googleapis.com./wp/test',
    'https://FCM.GOOGLEAPIS.COM/wp/test', ' https://fcm.googleapis.com/wp/test',
    'https://fcm.googleapis.com/wp/\ntest', 'https://fcm.googleapis.com/wp/../test',
    'https://fcm.googleapis.com:443/wp/test', 'not a URL', '',
  ]) assert.equal(isAllowedPushEndpoint(endpoint), false, endpoint);
});
