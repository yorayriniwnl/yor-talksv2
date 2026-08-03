import { Redis } from "ioredis";
import { Worker, type Job } from "bullmq";
import { env } from "../config/env.js";
import { logger } from "../lib/logger.js";
import { UserRepository } from "../repositories/user-repository.js";
import { NotificationDeliveryService } from "../services/notification-delivery-service.js";
import type { NotificationRecord } from "../types/index.js";

function isRedisCompatibleVersion(redisVersion: string): boolean {
  const [major = 0, minor = 0, patch = 0] = redisVersion.split(".").map((value) => Number(value));
  if (major !== 5) {
    return major > 5;
  }
  if (minor !== 0) {
    return minor > 0;
  }
  return patch >= 0;
}

async function canStartNotificationWorker(): Promise<boolean> {
  const client = new Redis(env.REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 1 });

  try {
    await client.connect();
    const info = await client.info("server");
    const versionLine = info
      .split("\n")
      .find((line) => line.startsWith("redis_version:"));
    const redisVersion = versionLine?.split(":")[1]?.trim();

    if (!redisVersion) {
      return false;
    }

    return isRedisCompatibleVersion(redisVersion);
  } catch {
    return false;
  } finally {
    client.disconnect();
  }
}

export async function startNotificationWorker(): Promise<Worker | null> {
  if (!(await canStartNotificationWorker())) {
    logger.warn({ redisUrl: env.REDIS_URL }, "Notification worker disabled because Redis is older than BullMQ supports");
    return null;
  }

  const userRepository = new UserRepository();
  const deliveryService = new NotificationDeliveryService();

  const worker = new Worker(
    "defaultQueue",
    async (job: Job) => {
      if (job.name !== "notification:deliver") {
        // Not ours — other job types may be added to this queue later.
        return;
      }
      const notification = job.data as NotificationRecord;
      const recipient = await userRepository.findById(notification.recipientId);
      await deliveryService.deliver(notification, recipient);
    },
    { connection: { url: env.REDIS_URL } },
  );

  worker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, err }, "Notification delivery job failed");
  });

  return worker;
}
