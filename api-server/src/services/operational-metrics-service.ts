import { apiRouteCatalog } from "../docs/routes.generated.js";
import { RedisRepository } from "../repositories/redis-repository.js";
import { desc, eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { productAnalyticsJobsTable } from "@workspace/db/schema";

type RequestMetric = {
  count: number;
  durationSeconds: number;
};

export type MonitoredWorker = "notifications" | "feed";

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function compileRoutePath(routePath: string): RegExp {
  const pattern = routePath
    .split("/")
    .map((segment) => /^\{[^}]+\}$/.test(segment) ? "[^/]+" : escapeRegex(segment))
    .join("/");
  return new RegExp(`^${pattern}/?$`);
}

const routeMatchers = apiRouteCatalog
  .map((route) => ({
    method: route.method.toUpperCase(),
    path: route.path,
    matcher: compileRoutePath(route.path),
    parameterCount: (route.path.match(/\{/g) ?? []).length,
  }))
  .sort((left, right) => left.parameterCount - right.parameterCount || right.path.length - left.path.length);

function normalizeApiPath(rawPath: string): string {
  const pathOnly = rawPath.split("?")[0] || "/";
  const withoutApiPrefix = pathOnly.replace(/^\/api(?:\/v1)?(?=\/|$)/, "");
  return withoutApiPrefix || "/";
}

function prometheusLabel(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");
}

export class OperationalMetricsService {
  private readonly startedAt = Date.now();
  private readonly requests = new Map<string, RequestMetric>();
  private readonly localWorkerFailures = new Map<MonitoredWorker, number>();
  private inFlight = 0;
  private sharedStoreAvailable = true;

  constructor(
    private readonly sharedStore?: Pick<RedisRepository, "incrementHashStrict" | "getHashStrict">,
    private readonly sharedKey = "yor:metrics:http:v1",
  ) {}

  startRequest(): void {
    this.inFlight += 1;
  }

  async finishRequest(method: string, rawPath: string, statusCode: number, durationSeconds: number): Promise<void> {
    this.inFlight = Math.max(0, this.inFlight - 1);
    const normalizedMethod = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"].includes(method.toUpperCase())
      ? method.toUpperCase() : "OTHER";
    const normalizedPath = normalizeApiPath(rawPath);
    const route = routeMatchers.find((candidate) => candidate.method === normalizedMethod && candidate.matcher.test(normalizedPath));
    const routeLabel = route?.path ?? "unmatched";
    const boundedStatus = Number.isInteger(statusCode) && statusCode >= 100 && statusCode <= 599 ? statusCode : 500;
    const key = JSON.stringify([normalizedMethod, routeLabel, String(boundedStatus)]);
    const current = this.requests.get(key) ?? { count: 0, durationSeconds: 0 };
    current.count += 1;
    const boundedDuration = Number.isFinite(durationSeconds) ? Math.max(0, durationSeconds) : 0;
    current.durationSeconds += boundedDuration;
    this.requests.set(key, current);
    if (!this.sharedStore) return;
    try {
      await this.sharedStore.incrementHashStrict(this.sharedKey, {
        [`count:${key}`]: 1,
      }, {
        [`duration:${key}`]: boundedDuration,
      });
      this.sharedStoreAvailable = true;
    } catch {
      this.sharedStoreAvailable = false;
    }
  }

  async recordWorkerFailure(worker: MonitoredWorker): Promise<void> {
    if (!this.sharedStore) {
      this.localWorkerFailures.set(worker, (this.localWorkerFailures.get(worker) ?? 0) + 1);
      return;
    }
    try {
      await this.sharedStore.incrementHashStrict(this.sharedKey, { [`worker_failures:${worker}`]: 1 }, {});
      this.sharedStoreAvailable = true;
    } catch {
      this.sharedStoreAvailable = false;
      this.localWorkerFailures.set(worker, (this.localWorkerFailures.get(worker) ?? 0) + 1);
    }
  }

  async renderPrometheus(): Promise<string> {
    const lines = [
      "# HELP yor_http_requests_total Total HTTP requests completed by method, route, and status.",
      "# TYPE yor_http_requests_total counter",
    ];

    for (const [key, metric] of [...this.requests.entries()].sort(([left], [right]) => left.localeCompare(right))) {
      const [method, route, status] = JSON.parse(key) as [string, string, string];
      const labels = `method="${prometheusLabel(method)}",route="${prometheusLabel(route)}",status="${prometheusLabel(status)}"`;
      lines.push(`yor_http_requests_total{${labels}} ${metric.count}`);
    }

    lines.push(
      "# HELP yor_http_request_duration_seconds_sum Total request duration in seconds by method, route, and status.",
      "# TYPE yor_http_request_duration_seconds_sum counter",
    );
    for (const [key, metric] of [...this.requests.entries()].sort(([left], [right]) => left.localeCompare(right))) {
      const [method, route, status] = JSON.parse(key) as [string, string, string];
      const labels = `method="${prometheusLabel(method)}",route="${prometheusLabel(route)}",status="${prometheusLabel(status)}"`;
      lines.push(`yor_http_request_duration_seconds_sum{${labels}} ${metric.durationSeconds.toFixed(6)}`);
    }

    if (this.sharedStore) {
      try {
        const shared = await this.sharedStore.getHashStrict(this.sharedKey);
        this.sharedStoreAvailable = true;
        lines.push(
          "# HELP yor_cluster_http_requests_total Durable shared HTTP request counter across API replicas; identical snapshots require max aggregation.",
          "# TYPE yor_cluster_http_requests_total counter",
        );
        for (const [field, value] of Object.entries(shared).filter(([field]) => field.startsWith("count:")).sort(([left], [right]) => left.localeCompare(right))) {
          const dimensions = JSON.parse(field.slice("count:".length)) as [string, string, string];
          const [method, route, status] = dimensions;
          const labels = `method="${prometheusLabel(method)}",route="${prometheusLabel(route)}",status="${prometheusLabel(status)}"`;
          lines.push(`yor_cluster_http_requests_total{${labels}} ${Number(value) || 0}`);
        }
        lines.push(
          "# HELP yor_cluster_http_request_duration_seconds_sum Durable shared HTTP request duration across API replicas; identical snapshots require max aggregation.",
          "# TYPE yor_cluster_http_request_duration_seconds_sum counter",
        );
        for (const [field, value] of Object.entries(shared).filter(([field]) => field.startsWith("duration:")).sort(([left], [right]) => left.localeCompare(right))) {
          const dimensions = JSON.parse(field.slice("duration:".length)) as [string, string, string];
          const [method, route, status] = dimensions;
          const labels = `method="${prometheusLabel(method)}",route="${prometheusLabel(route)}",status="${prometheusLabel(status)}"`;
          lines.push(`yor_cluster_http_request_duration_seconds_sum{${labels}} ${Number(value).toFixed(6)}`);
        }
        lines.push(
          "# HELP yor_worker_failed_jobs_total Failed background jobs observed across API replicas and local Redis-outage fallbacks.",
          "# TYPE yor_worker_failed_jobs_total counter",
        );
        for (const worker of ["notifications", "feed"] as const) {
          lines.push(`yor_worker_failed_jobs_total{worker="${worker}",source="redis"} ${Number(shared[`worker_failures:${worker}`] ?? 0)}`);
          lines.push(`yor_worker_failed_jobs_total{worker="${worker}",source="process_fallback"} ${this.localWorkerFailures.get(worker) ?? 0}`);
        }
      } catch {
        this.sharedStoreAvailable = false;
        lines.push(
          "# HELP yor_worker_failed_jobs_total Failed background jobs observed on this process while shared storage is unavailable.",
          "# TYPE yor_worker_failed_jobs_total counter",
        );
        for (const worker of ["notifications", "feed"] as const) {
          lines.push(`yor_worker_failed_jobs_total{worker="${worker}",source="process_fallback"} ${this.localWorkerFailures.get(worker) ?? 0}`);
        }
      }
    }

    try {
      const [latestSuccess] = await db.select({ finishedAt: productAnalyticsJobsTable.finishedAt })
        .from(productAnalyticsJobsTable)
        .where(eq(productAnalyticsJobsTable.status, "succeeded"))
        .orderBy(desc(productAnalyticsJobsTable.startedAt))
        .limit(1);
      const [latestRun] = await db.select({ status: productAnalyticsJobsTable.status })
        .from(productAnalyticsJobsTable)
        .orderBy(desc(productAnalyticsJobsTable.startedAt))
        .limit(1);
      lines.push(
        "# HELP yor_analytics_rollup_last_success_timestamp_seconds Unix timestamp of the latest successful analytics rollup.",
        "# TYPE yor_analytics_rollup_last_success_timestamp_seconds gauge",
        `yor_analytics_rollup_last_success_timestamp_seconds ${latestSuccess?.finishedAt ? Math.floor(Date.parse(latestSuccess.finishedAt) / 1000) : 0}`,
        "# HELP yor_analytics_rollup_last_run_failed Whether the latest analytics rollup failed or has never run.",
        "# TYPE yor_analytics_rollup_last_run_failed gauge",
        `yor_analytics_rollup_last_run_failed ${latestRun?.status === "failed" || !latestRun ? 1 : 0}`,
      );
    } catch {
      lines.push(
        "# HELP yor_analytics_rollup_metrics_up Whether analytics pipeline status is queryable.",
        "# TYPE yor_analytics_rollup_metrics_up gauge",
        "yor_analytics_rollup_metrics_up 0",
        "# HELP yor_analytics_rollup_last_success_timestamp_seconds Unix timestamp of the latest successful analytics rollup.",
        "# TYPE yor_analytics_rollup_last_success_timestamp_seconds gauge",
        "yor_analytics_rollup_last_success_timestamp_seconds 0",
        "# HELP yor_analytics_rollup_last_run_failed Whether the latest analytics rollup failed or has never run.",
        "# TYPE yor_analytics_rollup_last_run_failed gauge",
        "yor_analytics_rollup_last_run_failed 1",
      );
    }

    const memory = process.memoryUsage();
    lines.push(
      "# HELP yor_http_metrics_shared_store_up Whether shared Redis HTTP counters are available.",
      "# TYPE yor_http_metrics_shared_store_up gauge",
      `yor_http_metrics_shared_store_up ${this.sharedStoreAvailable ? 1 : 0}`,
      "# HELP yor_http_requests_in_flight Current requests being handled.",
      "# TYPE yor_http_requests_in_flight gauge",
      `yor_http_requests_in_flight ${this.inFlight}`,
      "# HELP yor_process_uptime_seconds Process uptime in seconds.",
      "# TYPE yor_process_uptime_seconds gauge",
      `yor_process_uptime_seconds ${((Date.now() - this.startedAt) / 1000).toFixed(3)}`,
      "# HELP yor_process_resident_memory_bytes Resident process memory in bytes.",
      "# TYPE yor_process_resident_memory_bytes gauge",
      `yor_process_resident_memory_bytes ${memory.rss}`,
      "# HELP yor_process_heap_used_bytes Used JavaScript heap in bytes.",
      "# TYPE yor_process_heap_used_bytes gauge",
      `yor_process_heap_used_bytes ${memory.heapUsed}`,
    );
    return `${lines.join("\n")}\n`;
  }

  async close(): Promise<void> {
    if (this.sharedStore instanceof RedisRepository) await this.sharedStore.disconnect();
  }
}

const sharedMetricsRepository = new RedisRepository();
export const operationalMetrics = new OperationalMetricsService(sharedMetricsRepository);
