import assert from "node:assert/strict";
import { after, test } from "node:test";
import { pool } from "@workspace/db";
import { isNotificationWorkerHealthy } from "../lib/worker-health.js";
import { startNotificationWorker } from "../workers/notification-worker.js";

const handles: Array<Awaited<ReturnType<typeof startNotificationWorker>>> = [];

after(async () => {
  await Promise.all(handles.map((handle) => handle.close()));
  await pool.end();
});

test("notification workers report readiness through start, stop, and restart", async () => {
  const first = await startNotificationWorker();
  handles.push(first);
  assert.equal(first.isHealthy(), true);
  assert.equal(isNotificationWorkerHealthy(), true);

  await first.close();
  assert.equal(first.isHealthy(), false);
  assert.equal(isNotificationWorkerHealthy(), false);

  const second = await startNotificationWorker();
  handles.push(second);
  assert.equal(second.isHealthy(), true);
  await second.close();
  assert.equal(isNotificationWorkerHealthy(), false);
});