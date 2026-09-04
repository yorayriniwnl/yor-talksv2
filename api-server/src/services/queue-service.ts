import { Queue, type Job } from "bullmq";
import { env } from "../config/env.js";
import { logger } from "../lib/logger.js";
import { inspectRedisCompatibility } from "../lib/redis-compat.js";

export class QueueService {
  private queue: Queue | null = null;
  private initialization: Promise<Queue | null> | null = null;
  private nextRetryAt = 0;
  private readonly retryDelayMs = 30_000;

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
              url: this.redisUrl,
            },
          });
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

  getPendingJobCount(): number {
    return 0;
  }

  async enqueue(type: string, payload: unknown): Promise<Job | undefined> {
    const queue = await this.initializeQueue();
    if (!queue) {
      logger.warn({ type }, "BullMQ queue unavailable; durable caller record will be retried when Redis recovers");
      return undefined;
    }

    const jobId = typeof payload === "object" && payload !== null && "id" in payload
      ? String((payload as { id: unknown }).id)
      : undefined;
    return queue.add(type, payload, jobId ? { jobId, removeOnComplete: false } : undefined);
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
      return 0;
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
    this.nextRetryAt = 0;
  }
}
