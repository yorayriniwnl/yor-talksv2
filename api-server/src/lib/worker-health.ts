import { pool } from "@workspace/db";
import { RedisRepository } from "../repositories/redis-repository.js";

let notificationWorkerHealthy = false;
const workerHeartbeatKey = "worker:notification:heartbeat";
const heartbeatTtlSeconds = 45;
const lifecycleHeartbeatGraceSeconds = 90;
const lifecycleJobStallSeconds = 300;
let redisRepository: RedisRepository | null = null;

function getRedisRepository(): RedisRepository {
  if (!redisRepository) redisRepository = new RedisRepository();
  return redisRepository;
}

export async function closeNotificationWorkerHealthDependencies(): Promise<void> {
  if (!redisRepository) return;
  const current = redisRepository;
  redisRepository = null;
  await current.disconnect();
}

export function setNotificationWorkerHealthy(healthy: boolean): void {
  notificationWorkerHealthy = healthy;
}

export function isNotificationWorkerHealthy(): boolean {
  return notificationWorkerHealthy;
}

export async function publishNotificationWorkerHeartbeat(): Promise<void> {
  await getRedisRepository().setStrict(workerHeartbeatKey, "ready", heartbeatTtlSeconds);
}

export async function hasHealthyNotificationWorker(): Promise<boolean> {
  try {
    return (await getRedisRepository().getStrict(workerHeartbeatKey)) === "ready";
  } catch {
    return false;
  }
}

export type LifecycleWorkerStatus = {
  healthy: boolean;
  missing: boolean;
  stale: boolean;
  workerId?: string;
  lastHeartbeat?: string;
  overdueSeconds?: number | null;
  stalledJob?: boolean;
};

export async function getLifecycleWorkerStatus({
  heartbeatGraceSeconds = lifecycleHeartbeatGraceSeconds,
  requiredHandler,
}: { heartbeatGraceSeconds?: number; requiredHandler?: string } = {}): Promise<LifecycleWorkerStatus> {
  try {
    const result = await pool.query(
      `SELECT worker_id, heartbeat_at, details, clock_timestamp() AS observed_at
       FROM runtime_heartbeats WHERE kind = 'lifecycle'
         AND ($1::text IS NULL OR details->'handlers' ? $1::text)
       ORDER BY heartbeat_at DESC`, [requiredHandler ?? null],
    );
    const rows = result.rows as Array<{ worker_id: string; heartbeat_at: Date | string;
      observed_at: Date | string; details?: Record<string, unknown> }>;
    if (!rows.length) {
      return { healthy: false, missing: true, stale: false };
    }
    const mostRecent = rows[0];
    const now = new Date(mostRecent.observed_at).getTime();
    const mostRecentTimestamp = new Date(mostRecent.heartbeat_at).getTime();
    const overdueSeconds = Number.isFinite(mostRecentTimestamp) ? (now - mostRecentTimestamp) / 1000 : null;
    const stalledJob = rows.some((row) => {
      const heartbeatAge = (now - new Date(row.heartbeat_at).getTime()) / 1000;
      // A crashed worker's durable row must not poison a recovered worker.
      // A still-renewed lease with a stuck handler must not hide behind a
      // second healthy worker, even when it is outside the newest 20 rows.
      if (!Number.isFinite(heartbeatAge) || heartbeatAge > heartbeatGraceSeconds) return false;
      if (typeof row.details?.activeJob !== "string") return false;
      const startedAt = typeof row.details.activeJobStartedAt === "string"
        ? Date.parse(row.details.activeJobStartedAt)
        : Number.NaN;
      return !Number.isFinite(startedAt) || (now - startedAt) / 1000 > lifecycleJobStallSeconds;
    });
    const healthy = Number.isFinite(mostRecentTimestamp)
      && (overdueSeconds ?? Number.POSITIVE_INFINITY) <= heartbeatGraceSeconds
      && !stalledJob;
    return {
      healthy,
      missing: false,
      stale: !healthy,
      workerId: mostRecent.worker_id,
      lastHeartbeat: Number.isFinite(mostRecentTimestamp) ? new Date(mostRecentTimestamp).toISOString() : undefined,
      overdueSeconds,
      stalledJob,
    };
  } catch {
    return { healthy: false, missing: true, stale: false };
  }
}

export async function hasHealthyLifecycleWorker(): Promise<boolean> {
  return (await getLifecycleWorkerStatus()).healthy;
}
