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

export async function getLifecycleWorkerStatus(): Promise<LifecycleWorkerStatus> {
  try {
    const result = await pool.query(
      `SELECT worker_id, heartbeat_at, details FROM runtime_heartbeats WHERE kind = 'lifecycle' ORDER BY heartbeat_at DESC LIMIT 20`,
    );
    const rows = result.rows as Array<{ worker_id: string; heartbeat_at: string; details?: Record<string, unknown> }>;
    if (!rows.length) {
      return { healthy: false, missing: true, stale: false };
    }
    const now = Date.now();
    const mostRecent = rows[0];
    const mostRecentTimestamp = Date.parse(mostRecent.heartbeat_at);
    const overdueSeconds = Number.isFinite(mostRecentTimestamp) ? (now - mostRecentTimestamp) / 1000 : null;
    const stalledJob = rows.some((row) => {
      if (typeof row.details?.activeJob !== "string") return false;
      const startedAt = typeof row.details.activeJobStartedAt === "string"
        ? Date.parse(row.details.activeJobStartedAt)
        : Number.NaN;
      return !Number.isFinite(startedAt) || (now - startedAt) / 1000 > lifecycleJobStallSeconds;
    });
    const healthy = Number.isFinite(mostRecentTimestamp)
      && (overdueSeconds ?? Number.POSITIVE_INFINITY) <= lifecycleHeartbeatGraceSeconds
      && !stalledJob;
    return {
      healthy,
      missing: false,
      stale: !healthy,
      workerId: mostRecent.worker_id,
      lastHeartbeat: mostRecent.heartbeat_at,
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
