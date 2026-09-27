import { RedisRepository } from "../repositories/redis-repository.js";

let notificationWorkerHealthy = false;
const workerHeartbeatKey = "worker:notification:heartbeat";
const heartbeatTtlSeconds = 45;
const redisRepository = new RedisRepository();

export function setNotificationWorkerHealthy(healthy: boolean): void {
  notificationWorkerHealthy = healthy;
}

export function isNotificationWorkerHealthy(): boolean {
  return notificationWorkerHealthy;
}

export async function publishNotificationWorkerHeartbeat(): Promise<void> {
  await redisRepository.setStrict(workerHeartbeatKey, "ready", heartbeatTtlSeconds);
}

export async function hasHealthyNotificationWorker(): Promise<boolean> {
  try {
    return (await redisRepository.getStrict(workerHeartbeatKey)) === "ready";
  } catch {
    return false;
  }
}
