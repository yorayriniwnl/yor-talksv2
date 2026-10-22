import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { pool } from "@workspace/db";
import { OperationalMetricsService } from "../services/operational-metrics-service.js";
import { inspectLifecycleHealth } from "../lib/lifecycle-health.js";

test("operational metrics use route templates instead of raw identifiers", async () => {
  const metrics = new OperationalMetricsService();
  metrics.startRequest();
  await metrics.finishRequest("GET", "/api/posts/4df86d9f-c91d-4d8d-80a2-83175b4cc171?preview=true", 200, 0.125);

  const output = await metrics.renderPrometheus();
  assert.match(output, /route="\/posts\/\{postId\}"/);
  assert.doesNotMatch(output, /4df86d9f-c91d-4d8d-80a2-83175b4cc171/);
  assert.match(output, /yor_http_requests_in_flight 0/);
  assert.match(output, /yor_lifecycle_metrics_up 1/);
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
  await pool.query("DELETE FROM product_analytics_job_runs");
  const metrics = new OperationalMetricsService();
  const output = await metrics.renderPrometheus();
  assert.match(output, /yor_analytics_rollup_last_success_timestamp_seconds 0/);
  assert.match(output, /yor_analytics_rollup_last_run_failed 1/);
});

test("lifecycle health exposes stale workers and overdue or dead cleanup jobs", async t => {
  const healthIndex = await pool.query("SELECT to_regclass('public.background_jobs_cleanup_health_idx') AS name");
  assert.equal(healthIndex.rows[0]?.name, "background_jobs_cleanup_health_idx");
  const workerId = `lifecycle:test:${randomUUID()}`;
  const overdueJobId = randomUUID();
  const deadJobId = randomUUID();
  const suffix = randomUUID();
  t.after(async () => {
    await pool.query('DELETE FROM background_jobs WHERE id=ANY($1::uuid[])', [[overdueJobId,deadJobId]]);
    await pool.query('DELETE FROM runtime_heartbeats WHERE worker_id=$1', [workerId]);
  });

  await pool.query(`INSERT INTO runtime_heartbeats(worker_id,kind,heartbeat_at,details)
    VALUES($1,'lifecycle',now(),$2::jsonb)`, [workerId, JSON.stringify({handlers:['account_cleanup']})]);
  await pool.query(`INSERT INTO background_jobs(id,kind,dedup_key,payload,status,attempts,available_at)
    VALUES($1,'account_cleanup',$2,'{}','pending',1,now()-interval '6 minutes'),
          ($3,'media_cleanup',$4,'{}','dead',8,now())`,
  [overdueJobId,`lifecycle-test:overdue:${suffix}`,deadJobId,`lifecycle-test:dead:${suffix}`]);

  const lifecycle = await inspectLifecycleHealth();
  assert.equal(lifecycle.workerUp, true);
  assert.ok(lifecycle.overdueCleanupJobs >= 1);
  assert.ok(lifecycle.deadCleanupJobs >= 1);
  const output = await new OperationalMetricsService().renderPrometheus();
  assert.match(output, /yor_lifecycle_worker_up 1/);
  assert.match(output, /yor_lifecycle_cleanup_jobs_overdue [1-9][0-9]*/);
  assert.match(output, /yor_lifecycle_cleanup_jobs_dead [1-9][0-9]*/);
});
