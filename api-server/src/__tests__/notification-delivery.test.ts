import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import webpush from 'web-push';
import { NotificationDeliveryService } from '../services/notification-delivery-service.js';
import { env } from '../config/env.js';
import type { NotificationRecord, UserRecord } from '../types/index.js';

for (const scenario of ['deleted', 'edited', 'recipient_changed', 'already_delivered', 'in_app', 'database_unavailable', 'unsafe_endpoint'] as const) {
  test(`push delivery resolves canonical content after subscription lookup: ${scenario}`, async (t) => {
    const original = { enabled: env.WEB_PUSH_ENABLED, publicKey: env.WEB_PUSH_VAPID_PUBLIC_KEY, privateKey: env.WEB_PUSH_VAPID_PRIVATE_KEY };
    env.WEB_PUSH_ENABLED = true;
    env.WEB_PUSH_VAPID_PUBLIC_KEY = 'synthetic-public-key';
    env.WEB_PUSH_VAPID_PRIVATE_KEY = 'synthetic-private-key';
    t.after(() => {
      env.WEB_PUSH_ENABLED = original.enabled;
      env.WEB_PUSH_VAPID_PUBLIC_KEY = original.publicKey;
      env.WEB_PUSH_VAPID_PRIVATE_KEY = original.privateKey;
    });
    t.mock.method(webpush, 'setVapidDetails', () => undefined);
    const sends = t.mock.method(webpush, 'sendNotification', async () => ({ statusCode: 201, body: '', headers: {} }));
    const canonical: NotificationRecord = { id: randomUUID(), recipientId: randomUUID(), type: 'follow', channel: 'push',
      title: 'Original title', message: 'Original actor name', relatedId: null, createdAt: new Date().toISOString(), readAt: null };
    const recipient = { id: canonical.recipientId, settings: { notificationsEnabled: true } } as UserRecord;
    let current: NotificationRecord | undefined = canonical;
    let marked = 0, lookups = 0;
    const service = new NotificationDeliveryService({
      listForUser: async () => {
        current = scenario === 'deleted' ? undefined : {
          ...canonical, title: 'Current title', message: 'Current actor name',
          ...(scenario === 'recipient_changed' ? { recipientId: randomUUID() } : {}),
          ...(scenario === 'already_delivered' ? { pushDeliveredAt: new Date().toISOString() } : {}),
          ...(scenario === 'in_app' ? { channel: 'in_app' as const } : {}),
        };
        return [{ id: randomUUID(), endpoint: scenario === 'unsafe_endpoint' ? 'https://127.0.0.1/private'
          : 'https://fcm.googleapis.com/fcm/send/synthetic', p256dh: 'synthetic', auth: 'synthetic' }];
      },
      markUsed: async () => { marked++; },
    } as any, {
      decisionFor: async () => ({ activated: true, capabilities: { social: true }, experience: 'adult_18_plus' }),
    } as any, { findById: async () => recipient } as any, {
      findById: async (id) => {
        lookups++;
        assert.equal(id, canonical.id);
        if (scenario === 'database_unavailable') throw new Error('Database unavailable');
        return current;
      },
    });
    if (scenario === 'database_unavailable') await assert.rejects(service.deliver(canonical, recipient), /Database unavailable/);
    else await service.deliver(canonical, recipient);
    assert.equal(lookups, scenario === 'unsafe_endpoint' ? 0 : 1,
      'unsafe destinations are rejected before loading or sending private content');
    assert.equal(sends.mock.callCount(), scenario === 'edited' ? 1 : 0);
    assert.equal(marked, scenario === 'edited' ? 1 : 0);
    if (scenario === 'edited') {
      const payload = JSON.parse(String(sends.mock.calls[0].arguments[1]));
      assert.equal(payload.title, 'Current title');
      assert.equal(payload.body, 'Current actor name');
    }
  });
}

for (const scenario of ['preference', 'eligibility', 'account_status', 'authority_unavailable'] as const) {
  test(`push delivery rechecks recipient authority after canonical hydration: ${scenario}`, async t => {
    const original = { enabled: env.WEB_PUSH_ENABLED, publicKey: env.WEB_PUSH_VAPID_PUBLIC_KEY, privateKey: env.WEB_PUSH_VAPID_PRIVATE_KEY };
    Object.assign(env, { WEB_PUSH_ENABLED: true, WEB_PUSH_VAPID_PUBLIC_KEY: 'synthetic-public-key', WEB_PUSH_VAPID_PRIVATE_KEY: 'synthetic-private-key' });
    t.after(() => Object.assign(env, { WEB_PUSH_ENABLED: original.enabled,
      WEB_PUSH_VAPID_PUBLIC_KEY: original.publicKey, WEB_PUSH_VAPID_PRIVATE_KEY: original.privateKey }));
    t.mock.method(webpush, 'setVapidDetails', () => undefined);
    const sends = t.mock.method(webpush, 'sendNotification', async () => ({ statusCode: 201, body: '', headers: {} }));
    const notification = { id: randomUUID(), recipientId: randomUUID(), type: 'follow', channel: 'push',
      title: 'Private notice', message: 'Current body', createdAt: new Date().toISOString(), readAt: null } as NotificationRecord;
    const recipient = { id: notification.recipientId, accountStatus: 'active', settings: { notificationsEnabled: true } } as UserRecord;
    let hydrated = false;
    const service = new NotificationDeliveryService({
      listForUser: async () => [{ id: randomUUID(), endpoint: 'https://fcm.googleapis.com/fcm/send/synthetic', p256dh: 'synthetic', auth: 'synthetic' }],
      markUsed: async () => assert.fail('suppressed pushes must not mark a subscription used'),
    } as any, {
      decisionFor: async () => {
        if (hydrated && scenario === 'authority_unavailable') throw new Error('Authority unavailable');
        return { activated: true, capabilities: { social: true },
          experience: hydrated && scenario === 'eligibility' ? 'teen_13_17' : 'adult_18_plus' };
      },
    } as any, { findById: async () => ({ ...recipient,
      accountStatus: hydrated && scenario === 'account_status' ? 'suspended' : 'active',
      settings: { notificationsEnabled: !(hydrated && scenario === 'preference') } }) } as any,
    { findById: async () => { hydrated = true; return notification; } });
    await service.deliver(notification, recipient);
    assert.equal(hydrated, true);
    assert.equal(sends.mock.callCount(), 0);
  });
}
