import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { deliverNotificationJob } from '../workers/notification-job.js';
import type { NotificationRecord, UserRecord } from '../types/index.js';

function fixture() {
  const canonical: NotificationRecord = {
    id: randomUUID(), recipientId: randomUUID(), type: 'follow', title: 'Current title',
    message: 'Current content', channel: 'push', relatedId: null, createdAt: new Date().toISOString(), readAt: null,
  };
  let stored: NotificationRecord | undefined = canonical;
  const delivered: NotificationRecord[] = [], marked: string[] = [], recipients: string[] = [];
  const notifications = {
    findById: async (id: string) => id === canonical.id ? stored : undefined,
    markPushDelivered: async (id: string) => { marked.push(id); },
  };
  const users = { findById: async (id: string) => { recipients.push(id); return { id } as UserRecord; } };
  const delivery = { deliver: async (value: NotificationRecord) => { delivered.push(value); return value; } };
  return { canonical, notifications, users, delivery, delivered, marked, recipients, setStored: (value?: NotificationRecord) => { stored = value; } };
}

test('legacy job payloads identify canonical rows and cannot override recipient or content', async () => {
  const f = fixture();
  await deliverNotificationJob({ ...f.canonical, title: 'Stale deleted actor', message: 'Stale body', recipientId: randomUUID() }, f.notifications, f.users, f.delivery);
  assert.deepEqual(f.delivered, [f.canonical]);
  assert.deepEqual(f.recipients, [f.canonical.recipientId]);
  assert.deepEqual(f.marked, [f.canonical.id]);
});

test('deleted, already delivered and malformed jobs never dispatch a stale payload', async () => {
  const f = fixture();
  f.setStored();
  await deliverNotificationJob(f.canonical, f.notifications, f.users, f.delivery);
  f.setStored({ ...f.canonical, pushDeliveredAt: new Date().toISOString() });
  await deliverNotificationJob({ notificationId: f.canonical.id }, f.notifications, f.users, f.delivery);
  for (const invalid of [null, 'invalid', {}, { id: 'malformed' }, { notificationId: 42, id: f.canonical.id }]) {
    await deliverNotificationJob(invalid, f.notifications, f.users, f.delivery);
  }
  assert.deepEqual(f.delivered, []);
  assert.deepEqual(f.marked, []);
  assert.deepEqual(f.recipients, []);
});

test('deletion while recipient lookup is pending suppresses delivery', async () => {
  const f = fixture();
  f.users.findById = async (id) => { f.setStored(); return { id } as UserRecord; };
  await deliverNotificationJob({ notificationId: f.canonical.id }, f.notifications, f.users, f.delivery);
  assert.deepEqual(f.delivered, []);
  assert.deepEqual(f.marked, []);
});

test('content changes while recipient lookup is pending use the latest persisted content', async () => {
  const f = fixture(), updated = { ...f.canonical, message: 'Revised content' };
  f.users.findById = async (id) => { f.setStored(updated); return { id } as UserRecord; };
  await deliverNotificationJob({ notificationId: f.canonical.id }, f.notifications, f.users, f.delivery);
  assert.deepEqual(f.delivered, [updated]);
});

test('failed delivery remains retryable and an unrelated subsequent notice still dispatches', async () => {
  const f = fixture();
  await assert.rejects(deliverNotificationJob({ notificationId: f.canonical.id }, f.notifications, f.users, {
    deliver: async () => { throw new Error('Provider unavailable'); },
  }), /Provider unavailable/);
  assert.deepEqual(f.marked, []);
  await deliverNotificationJob({ notificationId: f.canonical.id }, f.notifications, f.users, f.delivery);
  assert.deepEqual(f.marked, [f.canonical.id]);
});

test('canonical row lookup failure is retried instead of treated as successful delivery', async () => {
  const f = fixture();
  f.notifications.findById = async () => { throw new Error('Database unavailable'); };
  await assert.rejects(deliverNotificationJob({ notificationId: f.canonical.id }, f.notifications, f.users, f.delivery), /Database unavailable/);
  assert.deepEqual(f.delivered, []);
  assert.deepEqual(f.marked, []);
});
