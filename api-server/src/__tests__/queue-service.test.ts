import assert from "node:assert/strict";
import { test } from "node:test";
import { QueueService } from "../services/queue-service.js";
import { boundedQueueRetention, notificationJobOptions } from "../lib/queue-job-retention.js";
import { randomUUID } from 'node:crypto';

test('notification queue entries contain only the persisted ID, including legacy caller payloads', async () => {
  const service = new QueueService('redis://127.0.0.1:6399');
  const entries: unknown[][] = [];
  // Isolate serialization from Redis availability; exercise the production
  // enqueue path without relying on a shared queue or an external service.
  (service as unknown as { queue: unknown }).queue = {
    add: async (...args: unknown[]) => { entries.push(args); return { id: 'captured' }; },
  };
  const id = randomUUID();
  await service.enqueue('notification:deliver', { id, recipientId: randomUUID(), title: 'Private actor name', message: 'Private body', metadata: { actorId: randomUUID() } });
  await service.enqueue('notification:deliver', { notificationId: id });
  assert.deepEqual(entries, Array.from({ length: 2 }, () => ['notification:deliver', { notificationId: id }, notificationJobOptions(id)]));
  await assert.rejects(service.enqueue('notification:deliver', { message: 'No persisted row' }), /persisted notification ID/);
  await assert.rejects(service.enqueue('notification:deliver', null), /persisted notification ID/);
  await service.enqueue('unrelated:job', { id: 'other', content: 'Retained non-notification payload' });
  assert.deepEqual(entries[2], ['unrelated:job', { id: 'other', content: 'Retained non-notification payload' }, { ...boundedQueueRetention(), jobId: 'other' }]);
});

test("queue payloads use bounded retention while notification retries retain stable ids", () => {
  assert.deepEqual(boundedQueueRetention(), {
    removeOnComplete: { age: 7 * 24 * 60 * 60, count: 1_000 },
    removeOnFail: { age: 30 * 24 * 60 * 60, count: 5_000 },
  });
  assert.deepEqual(notificationJobOptions("notification-1"), {
    ...boundedQueueRetention(),
    jobId: "notification-1",
    attempts: 5,
    backoff: { type: "exponential", delay: 30_000 },
  });
});

test("queue service handles job enqueue and dequeue", async () => {
  const queueService = new QueueService("redis://127.0.0.1:6399");
  const job = await queueService.enqueue("email", { to: "user@example.com" });

  if (!job) {
    assert.equal(await queueService.size(), 0);
    assert.equal(queueService.getPendingJobCount(), 0);
    await queueService.close();
    return;
  }

  const dequeued = await queueService.dequeue();
  assert.equal(await queueService.size(), 0);
  assert.equal(job.name, "email");
  assert.equal(dequeued?.name, "email");
  await queueService.close();
});

test("queue retention is bounded without pruning operator-review jobs", async () => {
  const calls: Array<{ name: string; options: Record<string, unknown> }> = [];
  const queueService = new QueueService("redis://127.0.0.1:6399");
  const mockQueue = {
    add: async (name: string, data: unknown, options: Record<string, unknown>) => {
      calls.push({ name, options });
      return { name, data } as never;
    },
    close: async () => undefined,
  };
  (queueService as unknown as { queue: unknown }).queue = mockQueue;
  await queueService.enqueue("notification:deliver", { id: "retention-test" });
  await queueService.enqueue("moderation:review", { id: "review-test" });
  assert.deepEqual(calls[0]?.options.removeOnComplete, { age: 7 * 24 * 60 * 60, count: 1_000 });
  assert.deepEqual(calls[0]?.options.removeOnFail, { age: 30 * 24 * 60 * 60, count: 5_000 });
  assert.equal(calls[1]?.options.removeOnComplete, false);
  assert.equal(calls[1]?.options.removeOnFail, false);
  await queueService.close();
});

test("queue service does not retain jobs in memory while Redis is unavailable", async () => {
  const queueService = new QueueService("redis://127.0.0.1:6399");

  try {
    await queueService.enqueue("email", { to: "queued@example.com" });
    assert.equal(queueService.getPendingJobCount(), 0);
    assert.equal(await queueService.size(), 0);
  } finally {
    await queueService.close();
  }
});
