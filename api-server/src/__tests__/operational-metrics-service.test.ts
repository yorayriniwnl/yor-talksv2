import assert from "node:assert/strict";
import test from "node:test";
import { OperationalMetricsService } from "../services/operational-metrics-service.js";

test("operational metrics use route templates instead of raw identifiers", async () => {
  const metrics = new OperationalMetricsService();
  metrics.startRequest();
  await metrics.finishRequest("GET", "/api/posts/4df86d9f-c91d-4d8d-80a2-83175b4cc171?preview=true", 200, 0.125);

  const output = await metrics.renderPrometheus();
  assert.match(output, /route="\/posts\/\{postId\}"/);
  assert.doesNotMatch(output, /4df86d9f-c91d-4d8d-80a2-83175b4cc171/);
  assert.match(output, /yor_http_requests_in_flight 0/);
});

test("operational metrics keep unknown paths in one bounded bucket", async () => {
  const metrics = new OperationalMetricsService();
  metrics.startRequest();
  await metrics.finishRequest("GET", "/api/not-a-real-resource/secret-value", 404, 0.01);

  const output = await metrics.renderPrometheus();
  assert.match(output, /route="unmatched",status="404"/);
  assert.doesNotMatch(output, /secret-value/);
});

test("rollup status metrics stay alertable before the first successful scheduled run", async () => {
  const metrics = new OperationalMetricsService();
  const output = await metrics.renderPrometheus();
  assert.match(output, /yor_analytics_rollup_last_success_timestamp_seconds 0/);
  assert.match(output, /yor_analytics_rollup_last_run_failed 1/);
});
