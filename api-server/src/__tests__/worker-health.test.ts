import assert from "node:assert/strict";
import { after, test } from "node:test";
import { pool } from "@workspace/db";
import { getLifecycleWorkerStatus, hasHealthyLifecycleWorker, isNotificationWorkerHealthy, setNotificationWorkerHealthy } from "../lib/worker-health.js";

after(async () => {
  await pool.query("DELETE FROM runtime_heartbeats WHERE worker_id LIKE 'test:%'");
  await pool.end();
});

test("required notification worker is unhealthy until it is explicitly ready", () => {
  setNotificationWorkerHealthy(false);
  assert.equal(isNotificationWorkerHealthy(), false);
  setNotificationWorkerHealthy(true);
  assert.equal(isNotificationWorkerHealthy(), true);
  setNotificationWorkerHealthy(false);
});

test("required lifecycle worker reports healthy, missing, stale, and recovered heartbeat states", async () => {
  await pool.query("DELETE FROM runtime_heartbeats WHERE worker_id LIKE 'test:%'");
  assert.equal((await getLifecycleWorkerStatus()).missing, true);
  assert.equal((await hasHealthyLifecycleWorker()), false);

  await pool.query(`INSERT INTO runtime_heartbeats(worker_id, kind, heartbeat_at, details)
    VALUES('test:healthy', 'lifecycle', now(), '{}'::jsonb)
    ON CONFLICT(worker_id) DO UPDATE SET heartbeat_at=EXCLUDED.heartbeat_at, details=EXCLUDED.details`);
  assert.equal((await hasHealthyLifecycleWorker()), true);

  await pool.query("UPDATE runtime_heartbeats SET heartbeat_at = now() - interval '3 minutes' WHERE worker_id = 'test:healthy'");
  const stale = await getLifecycleWorkerStatus();
  assert.equal(stale.healthy, false);
  assert.equal(stale.stale, true);
  assert.ok((stale.overdueSeconds ?? 0) >= 180);

  await pool.query("UPDATE runtime_heartbeats SET heartbeat_at = now() WHERE worker_id = 'test:healthy'");
  assert.equal((await hasHealthyLifecycleWorker()), true);
});