import { Worker, type Job } from "bullmq";
import { env } from "../config/env.js";
import { logger } from "../lib/logger.js";
import { inspectRedisCompatibility } from "../lib/redis-compat.js";
import { UserRepository } from "../repositories/user-repository.js";
import { NotificationDeliveryService } from "../services/notification-delivery-service.js";
import type { NotificationRecord } from "../types/index.js";

export type NotificationWorkerHandle = {
  close: () => Promise<void>;
};

const RETRY_DELAY_MS = 30_000;

/**
 * Keeps the notification worker recoverable when Redis is temporarily down
 * during process startup. The readiness probe still stays unhealthy until the
 * dependency is usable, while the worker can attach without an API restart.
 */
class NotificationWorkerSupervisor implements NotificationWorkerHandle {
  private worker: Worker | null = null;
  private retryTimer: ReturnType<typeof setInterval> | null = null;
  private closed = false;
  private initializing: Promise<void> | null = null;

  async start(): Promise<void> {
    await this.ensureWorker();
    if (!this.worker) {
      this.retryTimer = setInterval(() => {
        void this.ensureWorker();
      }, RETRY_DELAY_MS);
      this.retryTimer.unref?.();
    }
  }

  private async ensureWorker(): Promise<void> {
    if (this.closed || this.worker || this.initializing) return;

    this.initializing = (async () => {
      try {
        const compatibility = await inspectRedisCompatibility(env.REDIS_URL);
        if (this.closed || !compatibility.compatible) {
          logger.warn(
            { redisVersion: compatibility.version, reason: compatibility.reason },
            "Notification worker temporarily unavailable",
          );
          return;
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
        worker.on("error", (error) => {
          logger.warn({ error }, "Notification worker connection error; BullMQ will retry");
        });

        if (this.closed) {
          await worker.close();
          return;
        }
        this.worker = worker;
        if (this.retryTimer) {
          clearInterval(this.retryTimer);
          this.retryTimer = null;
        }
        logger.info({ redisVersion: compatibility.version }, "Notification worker started");
      } catch (error) {
        logger.warn({ error }, "Notification worker initialization failed; retrying later");
      }
    })().finally(() => {
      this.initializing = null;
    });

    await this.initializing;
  }

  async close(): Promise<void> {
    this.closed = true;
    if (this.retryTimer) {
      clearInterval(this.retryTimer);
      this.retryTimer = null;
    }
    await this.initializing;
    if (this.worker) {
      await this.worker.close();
      this.worker = null;
    }
  }
}

export async function startNotificationWorker(): Promise<NotificationWorkerHandle> {
  const supervisor = new NotificationWorkerSupervisor();
  await supervisor.start();
  return supervisor;
}
