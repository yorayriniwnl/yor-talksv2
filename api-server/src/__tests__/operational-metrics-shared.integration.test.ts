import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, test } from "node:test";
import { RedisRepository } from "../repositories/redis-repository.js";
import { OperationalMetricsService } from "../services/operational-metrics-service.js";

const key = `yor:test:metrics:${randomUUID()}`;
const firstRedis = new RedisRepository();
const secondRedis = new RedisRepository();

after(async () => {
  await firstRedis.del(key);
  await Promise.all([firstRedis.disconnect(), secondRedis.disconnect()]);
});

test("shared Prometheus counters are visible across API instances with bounded labels", async () => {
  const firstInstance = new OperationalMetricsService(firstRedis, key);
  const secondInstance = new OperationalMetricsService(secondRedis, key);
  firstInstance.startRequest();
  await firstInstance.finishRequest("GET", "/api/posts/secret-user-content-id", 200, 0.25);
  await firstInstance.recordWorkerFailure("notifications");

  const output = await secondInstance.renderPrometheus();
  assert.match(output, /yor_cluster_http_requests_total\{method="GET",route="\/posts\/\{postId\}",status="200"\} 1/);
  assert.match(output, /yor_cluster_http_request_duration_seconds_sum\{method="GET",route="\/posts\/\{postId\}",status="200"\} 0\.250000/);
  assert.match(output, /yor_http_metrics_shared_store_up 1/);
  assert.match(output, /yor_worker_failed_jobs_total\{worker="notifications",source="redis"\} 1/);
  assert.doesNotMatch(output, /secret-user-content-id/);
});

test("Redis metric failure preserves local counters and reports shared storage unavailable", async () => {
  const unavailable = {
    async incrementHashStrict() { throw new Error("redis unavailable"); },
    async getHashStrict() { throw new Error("redis unavailable"); },
  };
  const metrics = new OperationalMetricsService(unavailable);
  metrics.startRequest();
  await metrics.finishRequest("GET", "/api/users/me", 200, 0.5);
  await metrics.recordWorkerFailure("notifications");
  const output = await metrics.renderPrometheus();
  assert.match(output, /yor_http_requests_total\{method="GET",route="\/users\/me",status="200"\} 1/);
  assert.match(output, /yor_http_metrics_shared_store_up 0/);
  assert.match(output, /yor_worker_failed_jobs_total\{worker="notifications",source="process_fallback"\} 1/);
});