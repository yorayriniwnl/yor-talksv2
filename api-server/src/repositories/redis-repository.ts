import { createHash } from "node:crypto";
import { Redis } from "ioredis";
import { env } from "../config/env.js";
import { logger } from "../lib/logger.js";

export class RedisRepository {
  private readonly client: Redis;

  constructor() {
    this.client = new Redis(env.REDIS_URL, {
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    this.client.on("error", (error) => {
      logger.error({ error }, "Redis connection error");
    });
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.client.set(key, value, "EX", ttlSeconds);
    } else {
      await this.client.set(key, value);
    }
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async keys(pattern: string): Promise<string[]> {
    return this.client.keys(pattern);
  }

  async addToSet(key: string, value: string): Promise<void> {
    await this.client.sadd(key, value);
  }

  async removeFromSet(key: string, value: string): Promise<void> {
    await this.client.srem(key, value);
  }

  async getSet(key: string): Promise<string[]> {
    return this.client.smembers(key);
  }

  async hashToken(token: string): Promise<string> {
    return createHash("sha256").update(token).digest("hex");
  }

  /** Closes the underlying connection. Callers (tests, graceful shutdown) must invoke this or the process/event loop stays alive. */
  async disconnect(): Promise<void> {
    await this.client.quit();
  }
}
