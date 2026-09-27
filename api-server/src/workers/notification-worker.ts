import { Queue, Worker, type Job } from "bullmq";
import { and, asc, eq, gt, isNull, or } from "drizzle-orm";
import { db } from "@workspace/db";
import { notificationsTable } from "@workspace/db/schema";
import { env } from "../config/env.js";
import { logger } from "../lib/logger.js";
import { inspectRedisCompatibility } from "../lib/redis-compat.js";
import { UserRepository } from "../repositories/user-repository.js";
import { NotificationDeliveryService } from "../services/notification-delivery-service.js";
import { NotificationRepository } from "../repositories/notification-repository.js";
import type { NotificationRecord } from "../types/index.js";
import { isNotificationWorkerHealthy, publishNotificationWorkerHeartbeat, setNotificationWorkerHealthy } from "../lib/worker-health.js";

export type NotificationWorkerHandle = {
  close: () => Promise<void>;
  isHealthy: () => boolean;
};

const RETRY_DELAY_MS = 30_000;
const RECOVERY_INTERVAL_MS = 30_000;
const RECOVERY_PAGE_SIZE = 250;
const notificationJobOptions = (notification: Pick<NotificationRecord, "id">) => ({
  jobId: notification.id,
  removeOnComplete: false,
  attempts: 5,
  backoff: { type: "exponential" as const, delay: 30_000 },
});

/**
 * Keeps the notification worker recoverable when Redis is temporarily down
 * during process startup. The readiness probe still stays unhealthy until the
 * dependency is usable, while the worker can attach without an API restart.
 */
class NotificationWorkerSupervisor implements NotificationWorkerHandle {
  private worker: Worker | null = null;
  private recoveryQueue: Queue | null = null;
  private retryTimer: ReturnType<typeof setInterval> | null = null;
  private recoveryTimer: ReturnType<typeof setInterval> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private closed = false;
  private initializing: Promise<void> | null = null;
  private recovering: Promise<void> | null = null;

  async start(): Promise<void> {
    setNotificationWorkerHealthy(false);
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
      let recoveryQueue: Queue | null = null;
      let worker: Worker | null = null;
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
        const notificationRepository = new NotificationRepository();
        recoveryQueue = new Queue("defaultQueue", { connection: { url: env.REDIS_URL } });
        worker = new Worker(
          "defaultQueue",
          async (job: Job) => {
            if (job.name !== "notification:deliver") {
              // Not ours — other job types may be added to this queue later.
              return;
            }
            const notification = job.data as NotificationRecord;
            const recipient = await userRepository.findById(notification.recipientId);
            await deliveryService.deliver(notification, recipient);
            await notificationRepository.markPushDelivered(notification.id);
          },
          { connection: { url: env.REDIS_URL } },
        );

        worker.on("failed", (job, err) => {
          logger.error({ jobId: job?.id, err }, "Notification delivery job failed");
        });
        worker.on("error", (error) => {
          setNotificationWorkerHealthy(false);
          this.stopHeartbeat();
          logger.warn({ error }, "Notification worker connection error; BullMQ will retry");
        });
        const activeQueue = recoveryQueue;
        worker.on("ready", () => {
          if (this.closed) return;
          setNotificationWorkerHealthy(true);
          this.startHeartbeat();
          void this.recoverPendingNotifications(activeQueue);
        });

        await worker.waitUntilReady();

        if (this.closed) {
          await worker.close();
          await recoveryQueue.close();
          return;
        }
        this.worker = worker;
        this.recoveryQueue = recoveryQueue;
        setNotificationWorkerHealthy(true);
        this.startHeartbeat();
        this.recoveryTimer = setInterval(() => {
          void this.recoverPendingNotifications(activeQueue);
        }, RECOVERY_INTERVAL_MS);
        this.recoveryTimer.unref?.();
        void this.recoverPendingNotifications(activeQueue);
        if (this.retryTimer) {
          clearInterval(this.retryTimer);
          this.retryTimer = null;
        }
        logger.info({ redisVersion: compatibility.version }, "Notification worker started");
      } catch (error) {
        if (worker && this.worker !== worker) await worker.close().catch(() => undefined);
        if (recoveryQueue && this.recoveryQueue !== recoveryQueue) await recoveryQueue.close().catch(() => undefined);
        setNotificationWorkerHealthy(false);
        this.stopHeartbeat();
        logger.warn({ error }, "Notification worker initialization failed; retrying later");
      }
    })().finally(() => {
      this.initializing = null;
    });

    await this.initializing;
  }

  async close(): Promise<void> {
    this.closed = true;
    setNotificationWorkerHealthy(false);
    if (this.retryTimer) {
      clearInterval(this.retryTimer);
      this.retryTimer = null;
    }
    if (this.recoveryTimer) {
      clearInterval(this.recoveryTimer);
      this.recoveryTimer = null;
    }
    this.stopHeartbeat();
    await this.initializing;
    if (this.worker) {
      try {
        await this.worker.close();
      } finally {
        this.worker = null;
      }
    }
    if (this.recoveryQueue) {
      await this.recoveryQueue.close();
      this.recoveryQueue = null;
    }
  }

  isHealthy(): boolean {
    return this.worker !== null && isNotificationWorkerHealthy();
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    void publishNotificationWorkerHeartbeat().catch((error) => {
      setNotificationWorkerHealthy(false);
      logger.warn({ error }, "Notification worker heartbeat could not be published");
    });
    this.heartbeatTimer = setInterval(() => {
      void publishNotificationWorkerHeartbeat().catch((error) => {
        setNotificationWorkerHealthy(false);
        this.stopHeartbeat();
        logger.warn({ error }, "Notification worker heartbeat could not be refreshed");
      });
    }, 15_000);
    this.heartbeatTimer.unref?.();
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private async recoverPendingNotifications(queue: Queue): Promise<void> {
    if (this.closed) return;
    if (this.recovering) return this.recovering;
    const recovery = (async () => {
      let cursor: { createdAt: string; id: string } | null = null;
      while (!this.closed) {
        const conditions = [isNull(notificationsTable.pushDeliveredAt)];
        if (cursor) {
          conditions.push(or(
            gt(notificationsTable.createdAt, cursor.createdAt),
            and(eq(notificationsTable.createdAt, cursor.createdAt), gt(notificationsTable.id, cursor.id)),
          )!);
        }
        const pending = await db.select().from(notificationsTable)
          .where(and(...conditions))
          .orderBy(asc(notificationsTable.createdAt), asc(notificationsTable.id))
          .limit(RECOVERY_PAGE_SIZE);
        if (pending.length === 0) return;

        for (const notification of pending) {
          const existing = await queue.getJob(notification.id);
          if (existing) {
            const current = await db.select({ pushDeliveredAt: notificationsTable.pushDeliveredAt })
              .from(notificationsTable).where(eq(notificationsTable.id, notification.id)).limit(1);
            if (current[0]?.pushDeliveredAt) continue;
            const state = await existing.getState();
            if (state === "failed" || state === "completed") await existing.remove();
            else continue;
          }
          await queue.add("notification:deliver", notification, notificationJobOptions(notification));
        }

        const last = pending[pending.length - 1];
        cursor = { createdAt: last.createdAt, id: last.id };
        if (pending.length < RECOVERY_PAGE_SIZE) return;
      }
    })().catch((error) => {
      logger.warn({ error }, "Notification outbox recovery will retry");
    }).finally(() => {
      this.recovering = null;
    });
    this.recovering = recovery;
    return recovery;
  }
}

export async function startNotificationWorker(): Promise<NotificationWorkerHandle> {
  const supervisor = new NotificationWorkerSupervisor();
  await supervisor.start();
  return supervisor;
}
