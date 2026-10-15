import assert from "node:assert/strict";
import { test } from "node:test";
import { QueueService } from "../services/queue-service.js";

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
