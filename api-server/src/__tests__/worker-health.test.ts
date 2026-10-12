import assert from "node:assert/strict";
import { test } from "node:test";
import { isNotificationWorkerHealthy, setNotificationWorkerHealthy, lifecycleHeartbeatHealthy } from "../lib/worker-health.js";

test("required notification worker is unhealthy until it is explicitly ready", () => {
  setNotificationWorkerHealthy(false);
  assert.equal(isNotificationWorkerHealthy(), false);
  setNotificationWorkerHealthy(true);
  assert.equal(isNotificationWorkerHealthy(), true);
  setNotificationWorkerHealthy(false);
});

test('lifecycle readiness rejects stopped, stale, malformed and stalled workers despite fresh lease heartbeats', () => {
  const now = Date.now();
  const heartbeat = (details: Record<string, unknown>, age = 0) => ({ heartbeat_at: new Date(now - age), details });
  assert.equal(lifecycleHeartbeatHealthy(heartbeat({ healthy: true }), now, 45, 60), true);
  assert.equal(lifecycleHeartbeatHealthy(heartbeat({ healthy: false }), now, 45, 60), false);
  assert.equal(lifecycleHeartbeatHealthy(heartbeat({ healthy: true }, 45000), now, 45, 60), false);
  assert.equal(lifecycleHeartbeatHealthy(heartbeat({ healthy: true, activeJob: 'synthetic', activeStartedAt: now - 59999 }), now, 45, 60), true);
  assert.equal(lifecycleHeartbeatHealthy(heartbeat({ healthy: true, activeJob: 'synthetic', activeStartedAt: now - 60000 }), now, 45, 60), false);
  assert.equal(lifecycleHeartbeatHealthy(heartbeat({ healthy: true, activeJob: 'synthetic' }), now, 45, 60), false);
  assert.equal(lifecycleHeartbeatHealthy(heartbeat({ healthy: true, activeJob: 'synthetic', activeStartedAt: now + 10000 }), now, 45, 60), false);
});
