import { Redis } from "ioredis";
import { Queue, Job } from "bullmq";
import { env } from "../config/env.js";
import { logger } from "../lib/logger.js";

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

export class QueueService {
  private queue: Queue | null = null;
  private initialization: Promise<Queue | null> | null = null;
  private disabled = false;

  private async initializeQueue(): Promise<Queue | null> {
    if (this.queue) {
      return this.queue;
    }

    if (this.disabled) {
      return null;
    }

    if (!this.initialization) {
      this.initialization = (async () => {
        const client = new Redis(env.REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 1 });

        try {
          await client.connect();
          const info = await client.info("server");
          const versionLine = info.split("\n").find((line) => line.startsWith("redis_version:"));
          const redisVersion = versionLine?.split(":")[1]?.trim();

          if (!redisVersion || !isRedisCompatibleVersion(redisVersion)) {
            this.disabled = true;
            logger.warn({ redisUrl: env.REDIS_URL, redisVersion }, "BullMQ queue disabled because Redis is older than BullMQ supports");
            return null;
          }

          this.queue = new Queue("defaultQueue", {
            connection: {
              url: env.REDIS_URL,
            },
          });
          return this.queue;
        } catch (error) {
          this.disabled = true;
          logger.warn({ error, redisUrl: env.REDIS_URL }, "BullMQ queue disabled because Redis could not be initialized");
          return null;
        } finally {
          client.disconnect();
        }
      })();
    }

    return this.initialization;
  }

  async enqueue(type: string, payload: unknown): Promise<Job | undefined> {
    const queue = await this.initializeQueue();
    if (!queue) {
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
  }
}
