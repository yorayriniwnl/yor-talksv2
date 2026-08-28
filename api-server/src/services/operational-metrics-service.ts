import { apiRouteCatalog } from "../docs/routes.generated.js";

type RequestMetric = {
  count: number;
  durationSeconds: number;
};

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
  private inFlight = 0;

  startRequest(): void {
    this.inFlight += 1;
  }

  finishRequest(method: string, rawPath: string, statusCode: number, durationSeconds: number): void {
    this.inFlight = Math.max(0, this.inFlight - 1);
    const normalizedPath = normalizeApiPath(rawPath);
    const route = routeMatchers.find((candidate) => candidate.method === method.toUpperCase() && candidate.matcher.test(normalizedPath));
    const routeLabel = route?.path ?? "unmatched";
    const key = JSON.stringify([method.toUpperCase(), routeLabel, String(statusCode)]);
    const current = this.requests.get(key) ?? { count: 0, durationSeconds: 0 };
    current.count += 1;
    current.durationSeconds += Math.max(0, durationSeconds);
    this.requests.set(key, current);
  }

  renderPrometheus(): string {
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

    const memory = process.memoryUsage();
    lines.push(
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
}

export const operationalMetrics = new OperationalMetricsService();
