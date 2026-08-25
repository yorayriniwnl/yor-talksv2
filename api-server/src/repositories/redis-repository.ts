import { createHash } from "node:crypto";
import { Redis } from "ioredis";
import { env } from "../config/env.js";
import { logger } from "../lib/logger.js";

export class RedisRepository {
  private readonly client: Redis;

  constructor() {
    this.client = new Redis(env.REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      retryStrategy(times) {
        if (times > 3) return null;
        return Math.min(times * 50, 500);
      },
    });

    this.client.on("error", (error) => {
      logger.warn({ error: error?.message || error }, "Redis connection warning");
    });
  }

  async get(key: string): Promise<string | null> {
    try {
      return await this.client.get(key);
    } catch {
      return null;
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    try {
      if (ttlSeconds) {
        await this.client.set(key, value, "EX", ttlSeconds);
      } else {
        await this.client.set(key, value);
      }
    } catch {
      // Safe fallback if Redis is unavailable
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch {}
  }

  async keys(pattern: string): Promise<string[]> {
    try {
      return await this.client.keys(pattern);
    } catch {
      return [];
    }
  }

  async addToSet(key: string, value: string): Promise<void> {
    try {
      await this.client.sadd(key, value);
    } catch {}
  }

  async removeFromSet(key: string, value: string): Promise<void> {
    try {
      await this.client.srem(key, value);
    } catch {}
  }

  async getSet(key: string): Promise<string[]> {
    try {
      return await this.client.smembers(key);
    } catch {
      return [];
    }
  }

  async hashToken(token: string): Promise<string> {
    return createHash("sha256").update(token).digest("hex");
  }

  /** Closes the underlying connection. Callers (tests, graceful shutdown) must invoke this or the process/event loop stays alive. */
  async disconnect(): Promise<void> {
    this.client.disconnect();
  }
}
