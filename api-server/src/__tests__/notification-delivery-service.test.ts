import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { pool } from '@workspace/db';
import webpush from 'web-push';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';
import { PushSubscriptionRepository } from '../repositories/push-subscription-repository.js';
import { NotificationDeliveryService } from '../services/notification-delivery-service.js';
import type { NotificationRecord, PushSubscriptionRecord } from '../types/index.js';

const notification: NotificationRecord = { id: '11111111-1111-4111-8111-111111111111', recipientId: '22222222-2222-4222-8222-222222222222',
  type: 'follow', title: 'private synthetic title', message: 'private synthetic content', relatedId: null, createdAt: new Date().toISOString(), readAt: null };
after(async () => { await pool.end(); });

test('optional push sends use supported socket timeout and provider failures retain only safe machine diagnostics', async () => {
  const previous = { enabled: env.WEB_PUSH_ENABLED, publicKey: env.WEB_PUSH_VAPID_PUBLIC_KEY, privateKey: env.WEB_PUSH_VAPID_PRIVATE_KEY };
  const originalSend = webpush.sendNotification; const originalWarn = logger.warn;
  const keys = webpush.generateVAPIDKeys();
  env.WEB_PUSH_ENABLED = true; env.WEB_PUSH_VAPID_PUBLIC_KEY = keys.publicKey; env.WEB_PUSH_VAPID_PRIVATE_KEY = keys.privateKey;
  const logs: unknown[] = []; const options: unknown[] = []; const removed: string[] = [];
  const subscriptions = ['expired', 'retry'].map((kind, index) => ({ id: `synthetic-${index}`,
    endpoint: `https://push.invalid/private-${kind}?token=synthetic-secret`, p256dh: 'synthetic-key', auth: 'synthetic-auth' }) as PushSubscriptionRecord);
  class Repository extends PushSubscriptionRepository {
    override async listForUser() { return subscriptions; }
    override async removeByEndpoint(endpoint: string) { removed.push(endpoint); return true; }
    override async markUsed() { assert.fail('failed requests cannot be marked delivered'); }
  }
  logger.warn = ((fields: unknown) => { logs.push(fields); }) as typeof logger.warn;
  webpush.sendNotification = (async (subscription, _payload, requestOptions) => {
    options.push(requestOptions);
    throw Object.assign(new Error(`private response for ${subscription.endpoint}`), {
      statusCode: subscription.endpoint.includes('expired') ? 410 : 503,
      body: 'private provider response', endpoint: subscription.endpoint,
    });
  }) as typeof webpush.sendNotification;
  try {
    await assert.rejects(new NotificationDeliveryService(new Repository()).deliver(notification), /^Error: web_push_delivery_failed$/);
    assert.equal(removed.length, 1); assert.equal(removed[0], subscriptions[0].endpoint);
    assert.deepEqual(options, [{ timeout: 15000 }, { timeout: 15000 }]);
    assert.equal(logs.length, 1);
    assert.deepEqual(logs[0], { code: 'web_push_delivery_failed', statusCode: 503, subscriptionId: 'synthetic-1', notificationId: notification.id });
    assert.equal(JSON.stringify(logs).includes('private'), false); assert.equal(JSON.stringify(logs).includes('token='), false);
  } finally {
    webpush.sendNotification = originalSend; logger.warn = originalWarn;
    env.WEB_PUSH_ENABLED = previous.enabled; env.WEB_PUSH_VAPID_PUBLIC_KEY = previous.publicKey; env.WEB_PUSH_VAPID_PRIVATE_KEY = previous.privateKey;
  }
});
