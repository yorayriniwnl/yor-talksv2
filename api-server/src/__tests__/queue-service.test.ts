import assert from "node:assert/strict";
import { test } from "node:test";
import { QueueService } from "../services/queue-service.js";

test("queue service handles job enqueue and dequeue", async () => {
  const queueService = new QueueService();
  const job = await queueService.enqueue("email", { to: "user@example.com" });
  const dequeued = await queueService.dequeue();

  assert.equal(await queueService.size(), 0);
  assert.equal(job.name, "email");
  assert.equal(dequeued?.name, "email");
  await queueService.getQueue().close();
});
