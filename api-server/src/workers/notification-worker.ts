import { Worker, type Job } from "bullmq";
import { env } from "../config/env.js";
import { logger } from "../lib/logger.js";
import { inspectRedisCompatibility } from "../lib/redis-compat.js";
import { UserRepository } from "../repositories/user-repository.js";
import { NotificationDeliveryService } from "../services/notification-delivery-service.js";
import type { NotificationRecord } from "../types/index.js";

async function canStartNotificationWorker(): Promise<boolean> {
  return (await inspectRedisCompatibility(env.REDIS_URL)).compatible;
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
