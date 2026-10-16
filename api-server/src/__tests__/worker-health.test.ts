import assert from "node:assert/strict";
import { after, test } from "node:test";
import { pool } from "@workspace/db";
import { getLifecycleWorkerStatus, hasHealthyLifecycleWorker, isNotificationWorkerHealthy, setNotificationWorkerHealthy } from "../lib/worker-health.js";
import { inspectLifecycleHealth } from '../lib/lifecycle-health.js';

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

  await pool.query(`UPDATE runtime_heartbeats SET details = jsonb_build_object(
    'activeJob', 'test:stalled', 'activeJobStartedAt', now() - interval '6 minutes'
  ) WHERE worker_id = 'test:healthy'`);
  await pool.query(`INSERT INTO runtime_heartbeats(worker_id, kind, heartbeat_at, details)
    VALUES('test:other-healthy', 'lifecycle', now(), '{}'::jsonb)
    ON CONFLICT(worker_id) DO UPDATE SET heartbeat_at=EXCLUDED.heartbeat_at, details=EXCLUDED.details`);
  const stalled = await getLifecycleWorkerStatus();
  assert.equal(stalled.healthy, false);
  assert.equal(stalled.stalledJob, true);

  await pool.query(`UPDATE runtime_heartbeats SET details = jsonb_build_object(
    'activeJob', 'test:recovering', 'activeJobStartedAt', now()
  ) WHERE worker_id = 'test:healthy'`);
  assert.equal((await getLifecycleWorkerStatus()).healthy, true);
});

test('lifecycle readiness detects every current stalled handler and recovers after a crashed heartbeat expires', async () => {
  await pool.query("DELETE FROM runtime_heartbeats WHERE worker_id LIKE 'test:%'");
  await pool.query(`INSERT INTO runtime_heartbeats(worker_id,kind,heartbeat_at,details)
    VALUES('test:stalled','lifecycle',now()-interval '1 second',
      jsonb_build_object('handlers',jsonb_build_array('account_cleanup'),
        'activeJob','synthetic','activeJobStartedAt',now()-interval '6 minutes'))`);
  // More than 20 newer workers must not hide a continuously heartbeating
  // stuck handler from either the legacy helper or actual readyz/metrics.
  await pool.query(`INSERT INTO runtime_heartbeats(worker_id,kind,heartbeat_at,details)
    SELECT 'test:healthy:'||n,'lifecycle',now(),'{"handlers":["account_cleanup"]}'::jsonb
    FROM generate_series(1,21) n`);
  assert.equal((await getLifecycleWorkerStatus()).stalledJob, true);
  assert.equal((await inspectLifecycleHealth()).workerUp, false);

  await pool.query("UPDATE runtime_heartbeats SET heartbeat_at=now()-interval '3 minutes' WHERE worker_id='test:stalled'");
  assert.equal((await getLifecycleWorkerStatus()).healthy, true);
  assert.equal((await inspectLifecycleHealth()).workerUp, true);
});

test('lifecycle readiness requires the cleanup handler and uses database time rather than host clock skew', async () => {
  await pool.query("DELETE FROM runtime_heartbeats WHERE worker_id LIKE 'test:%'");
  await pool.query(`INSERT INTO runtime_heartbeats(worker_id,kind,heartbeat_at,details)
    VALUES('test:handler','lifecycle',now(),'{"handlers":["other_handler"]}'::jsonb)`);
  assert.equal((await inspectLifecycleHealth()).workerUp, false);
  await pool.query(`UPDATE runtime_heartbeats SET details='{"handlers":["account_cleanup"]}'::jsonb
    WHERE worker_id='test:handler'`);
  const realNow = Date.now;
  try {
    Date.now = () => realNow() + 24 * 60 * 60 * 1000;
    assert.equal((await getLifecycleWorkerStatus()).healthy, true);
    assert.equal((await inspectLifecycleHealth()).workerUp, true);
  } finally { Date.now = realNow; }
});
