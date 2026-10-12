import assert from 'node:assert/strict';
import { test } from 'node:test';
import { processNotificationDelivery, pruneCompletedNotifications } from '../workers/notification-worker.js';
import type { NotificationRecord, UserRecord } from '../types/index.js';

test('completed-job pruning never removes retry states; database acknowledgement prevents redelivery after Redis pruning', async () => {
  const calls: unknown[][] = [];
  await pruneCompletedNotifications({ clean: async (...args) => { calls.push(args); return []; } });
  assert.equal(calls.length, 1);
  assert.equal(calls[0]![2], 'completed');
  assert.ok(Number(calls[0]![0]) >= 60000);
  let current: NotificationRecord | undefined = { id: 'synthetic-id', recipientId: 'recipient', type: 'post', title: 'Current title', message: 'Current data', relatedId: null,
    createdAt: new Date().toISOString(), readAt: null, pushDeliveredAt: null };
  let sent = 0, marked = 0;
  const notifications = {
    async findById() { return current; },
    async markPushDelivered() { marked++; current!.pushDeliveredAt = new Date().toISOString(); },
  };
  const users = { async findById() { return { id: 'recipient' } as UserRecord; } };
  const delivery = { async deliver(notification: NotificationRecord) { assert.equal(notification.message, 'Current data'); sent++; return notification; } };
  await processNotificationDelivery('synthetic-id', notifications, users, delivery);
  await processNotificationDelivery('synthetic-id', notifications, users, delivery);
  assert.equal(sent, 1); assert.equal(marked, 1);
  current = undefined;
  await processNotificationDelivery('deleted-id', notifications, users, delivery);
  assert.equal(sent, 1, 'account-deleted outbox records cannot send stale Redis data');
});

test('failed notification delivery retains its durable unacknowledged outbox for retry', async () => {
  let marked = false;
  const current = { id: 'synthetic-id', recipientId: 'recipient', pushDeliveredAt: null } as NotificationRecord;
  await assert.rejects(processNotificationDelivery(current.id, {
    async findById() { return current; }, async markPushDelivered() { marked = true; },
  }, { async findById() { return { id: 'recipient' } as UserRecord; } }, {
    async deliver() { throw new Error('synthetic temporary failure'); },
  }), /synthetic temporary failure/);
  assert.equal(marked, false);
});
