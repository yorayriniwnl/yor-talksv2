import { RedisRepository } from "../repositories/redis-repository.js";
import { pool } from '@workspace/db';
import { env } from '../config/env.js';

export type LifecycleHeartbeat = { heartbeat_at: Date | string; details: Record<string, unknown> };

export function lifecycleHeartbeatHealthy(row: LifecycleHeartbeat, now = Date.now(), staleSeconds = env.LIFECYCLE_WORKER_STALE_SECONDS,
  stallSeconds = env.LIFECYCLE_JOB_STALL_SECONDS): boolean {
  const heartbeatAt = new Date(row.heartbeat_at).getTime();
  if (!Number.isFinite(heartbeatAt) || heartbeatAt > now + 5000 || now - heartbeatAt >= staleSeconds * 1000 || row.details.healthy !== true) return false;
  if (row.details.activeJob) {
    const startedAt = row.details.activeStartedAt;
    if (typeof startedAt !== 'number' || !Number.isFinite(startedAt) || startedAt > now + 5000 || now - startedAt >= stallSeconds * 1000) return false;
  }
  return true;
}

export async function hasHealthyLifecycleWorker(): Promise<boolean> {
  try {
    const result = await pool.query<LifecycleHeartbeat>(`SELECT heartbeat_at,details FROM runtime_heartbeats
      WHERE kind='lifecycle' AND heartbeat_at>now()-$1*interval '1 second'`, [env.LIFECYCLE_WORKER_STALE_SECONDS]);
    return result.rows.some(row => lifecycleHeartbeatHealthy(row));
  } catch { return false; }
}

let notificationWorkerHealthy = false;
const workerHeartbeatKey = "worker:notification:heartbeat";
const heartbeatTtlSeconds = 45;
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
