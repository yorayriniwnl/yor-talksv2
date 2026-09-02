import { Queue, type Job } from "bullmq";
import { env } from "../config/env.js";
import { logger } from "../lib/logger.js";
import { inspectRedisCompatibility } from "../lib/redis-compat.js";

export type QueuedJobEnvelope = {
  type: string;
  payload: unknown;
  queuedAt: number;
};

export class QueueService {
  private queue: Queue | null = null;
  private initialization: Promise<Queue | null> | null = null;
  private nextRetryAt = 0;
  private readonly retryDelayMs = 30_000;
  private pendingJobs: QueuedJobEnvelope[] = [];

  constructor(private readonly redisUrl = env.REDIS_URL) {}

  private async initializeQueue(): Promise<Queue | null> {
    if (this.queue) {
      return this.queue;
    }

    if (Date.now() < this.nextRetryAt) {
      return null;
    }

    if (!this.initialization) {
      this.initialization = (async () => {
        try {
          const compatibility = await inspectRedisCompatibility(this.redisUrl);
          if (!compatibility.compatible) {
            this.nextRetryAt = Date.now() + this.retryDelayMs;
            logger.warn(
              { redisVersion: compatibility.version, reason: compatibility.reason },
              "BullMQ queue temporarily unavailable",
            );
            return null;
          }

          this.queue = new Queue("defaultQueue", {
            connection: {
              url: env.REDIS_URL,
            },
          });
          await this.flushPendingJobs();
          return this.queue;
        } catch (error) {
          this.nextRetryAt = Date.now() + this.retryDelayMs;
          logger.warn({ error }, "BullMQ queue disabled because Redis could not be initialized");
          return null;
        }
      })();
    }

    try {
      return await this.initialization;
    } finally {
      this.initialization = null;
    }
  }

  private async flushPendingJobs(): Promise<void> {
    if (!this.queue || this.pendingJobs.length === 0) {
      return;
    }

    const jobsToQueue = [...this.pendingJobs];
    this.pendingJobs = [];

    for (const job of jobsToQueue) {
      try {
        await this.queue.add(job.type, job.payload);
      } catch (error) {
        logger.warn({ error, job }, "Retry-queue flush failed; job kept in memory for later retry");
        this.pendingJobs.push(job);
      }
    }
  }

  getPendingJobCount(): number {
    return this.pendingJobs.length;
  }

  async enqueue(type: string, payload: unknown): Promise<Job | undefined> {
    const queue = await this.initializeQueue();
    if (!queue) {
      this.pendingJobs.push({ type, payload, queuedAt: Date.now() });
      logger.warn({ type, pendingJobs: this.pendingJobs.length }, "BullMQ queue unavailable; job kept in memory until Redis recovers");
      return undefined;
    }

    return queue.add(type, payload);
  }

  /** Removes and returns the next waiting job for administrative/manual processing. */
  async dequeue(): Promise<Job | undefined> {
    const queue = await this.initializeQueue();
    if (!queue) {
      return undefined;
    }

    const [job] = await queue.getJobs(["waiting"], 0, 0, true);
    if (!job) {
      return undefined;
    }
    await job.remove();
    return job;
  }

  async size(): Promise<number> {
    const queue = await this.initializeQueue();
    if (!queue) {
      return this.pendingJobs.length;
    }

    return queue.count();
  }

  getQueue(): Queue | null {
    return this.queue;
  }

  /** Closes the underlying BullMQ/Redis connection. Callers (tests, graceful shutdown) must invoke this or the process/event loop stays alive. */
  async close(): Promise<void> {
    if (this.queue) {
      await this.queue.close();
      this.queue = null;
    }
    this.pendingJobs = [];
    this.nextRetryAt = 0;
  }
}
