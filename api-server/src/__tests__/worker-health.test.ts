import assert from "node:assert/strict";
import { test } from "node:test";
import { isNotificationWorkerHealthy, setNotificationWorkerHealthy } from "../lib/worker-health.js";

test("required notification worker is unhealthy until it is explicitly ready", () => {
  setNotificationWorkerHealthy(false);
  assert.equal(isNotificationWorkerHealthy(), false);
  setNotificationWorkerHealthy(true);
  assert.equal(isNotificationWorkerHealthy(), true);
  setNotificationWorkerHealthy(false);
});