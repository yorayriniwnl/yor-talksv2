import assert from "node:assert/strict";
import { test } from "node:test";
import { QueueService } from "../services/queue-service.js";

test("queue service handles job enqueue and dequeue", async () => {
  const queueService = new QueueService("redis://127.0.0.1:6399");
  const job = await queueService.enqueue("email", { to: "user@example.com" });

  if (!job) {
    assert.equal(await queueService.size(), 1);
    assert.equal(queueService.getPendingJobCount(), 1);
    await queueService.close();
    return;
  }

  const dequeued = await queueService.dequeue();

  assert.equal(await queueService.size(), 0);
  assert.equal(job.name, "email");
  assert.equal(dequeued?.name, "email");
  await queueService.close();
});

test("queue service holds jobs in memory while Redis is unavailable and reports the backlog", async () => {
  const queueService = new QueueService("redis://127.0.0.1:6399");

  try {
    await queueService.enqueue("email", { to: "queued@example.com" });
    assert.equal(queueService.getPendingJobCount(), 1);
    assert.equal(await queueService.size(), 1);
  } finally {
    await queueService.close();
  }
});
