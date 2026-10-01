import { RedisRepository } from "../repositories/redis-repository.js";

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
