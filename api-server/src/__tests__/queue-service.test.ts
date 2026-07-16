import assert from "node:assert/strict";
import { test } from "node:test";
import { QueueService } from "../services/queue-service.js";

test("queue service handles job enqueue and dequeue", () => {
  const queueService = new QueueService();
  const job = queueService.enqueue("email", { to: "user@example.com" });
  const dequeued = queueService.dequeue();

  assert.equal(queueService.size(), 0);
  assert.equal(job.type, "email");
  assert.equal(dequeued?.type, "email");
});
