import { createHash } from "node:crypto";
import { Redis } from "ioredis";
import { env } from "../config/env.js";
import { logger } from "../lib/logger.js";

export class RedisRepository {
  private readonly client: Redis;
  private connectPromise: Promise<void> | null = null;
  private disconnected = false;

  constructor() {
    this.client = new Redis(env.REDIS_URL, {
      // Commands are issued only after ensureReady() below. This keeps
      // construction side-effect free for tests and avoids a startup race
      // when Redis is still accepting connections.
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      connectTimeout: 5_000,
      commandTimeout: 5_000,
      retryStrategy(times) {
        if (times > 3) return null;
        return Math.min(times * 50, 500);
      },
    });

    this.client.on("error", (error) => {
      logger.warn({ error: error?.message || error }, "Redis connection warning");
    });
  }

  private async ensureReady(): Promise<void> {
    if (this.disconnected) throw new Error("Redis repository is disconnected");
    if (this.client.status === "ready") return;
    if (!this.connectPromise) {
      this.connectPromise = this.client.connect().then(() => undefined).finally(() => {
        this.connectPromise = null;
      });
    }
    await this.connectPromise;
  }

  async get(key: string): Promise<string | null> {
    try {
      await this.ensureReady();
      return await this.client.get(key);
    } catch {
      return null;
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    try {
      await this.ensureReady();
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
      await this.ensureReady();
      await this.client.del(key);
    } catch {}
  }

  async keys(pattern: string): Promise<string[]> {
    try {
      return await this.scan(pattern);
    } catch {
      return [];
    }
  }

  async addToSet(key: string, value: string): Promise<void> {
    try {
      await this.ensureReady();
      await this.client.sadd(key, value);
    } catch {}
  }

  async removeFromSet(key: string, value: string): Promise<void> {
    try {
      await this.ensureReady();
      await this.client.srem(key, value);
    } catch {}
  }

  async getSet(key: string): Promise<string[]> {
    try {
      await this.ensureReady();
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
    this.disconnected = true;
    this.client.disconnect();
  }

  /** Authentication flows use these strict variants so a Redis outage cannot
   * silently turn a one-time token into an unusable or unverifiable token. */
  async getStrict(key: string): Promise<string | null> {
    await this.ensureReady();
    return this.client.get(key);
  }

  async setStrict(key: string, value: string, ttlSeconds?: number): Promise<void> {
    await this.ensureReady();
    if (ttlSeconds) {
      await this.client.set(key, value, "EX", ttlSeconds);
    } else {
      await this.client.set(key, value);
    }
  }

  async delStrict(key: string): Promise<void> {
    await this.ensureReady();
    await this.client.del(key);
  }

  /** Account-scoped socket budgets survive reconnects and work across API replicas. */
  async consumeBudgetStrict(key: string, limit: number, windowSeconds: number): Promise<boolean> {
    await this.ensureReady();
    const count = await this.client.eval(
      `local count = redis.call('INCR', KEYS[1])
       if count == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end
       return count`,
      1, key, windowSeconds,
    );
    return typeof count === "number" && count <= limit;
  }

  async addToSetStrict(key: string, value: string): Promise<void> {
    await this.ensureReady();
    await this.client.sadd(key, value);
  }

  async removeFromSetStrict(key: string, value: string): Promise<void> {
    await this.ensureReady();
    await this.client.srem(key, value);
  }

  async getSetStrict(key: string): Promise<string[]> {
    await this.ensureReady();
    return this.client.smembers(key);
  }

  async scan(pattern: string): Promise<string[]> {
    await this.ensureReady();
    const keys: string[] = [];
    let cursor = "0";
    do {
      const [nextCursor, batch] = await this.client.scan(cursor, "MATCH", pattern, "COUNT", 200);
      cursor = nextCursor;
      keys.push(...batch);
    } while (cursor !== "0");
    return keys;
  }

  async scanStrict(pattern: string): Promise<string[]> {
    return this.scan(pattern);
  }

  // --- Sorted-set operations used by SecurityService for audit/abuse detection ---

  async zadd(key: string, score: number, member: string): Promise<void> {
    await this.ensureReady();
    await this.client.zadd(key, score, member);
  }

  async zremrangebyscore(key: string, min: string, max: string): Promise<void> {
    await this.ensureReady();
    await this.client.zremrangebyscore(key, min, max);
  }

  async zcount(key: string, min: string, max: string): Promise<number> {
    await this.ensureReady();
    return this.client.zcount(key, min, max);
  }

  /** Atomically rotates a refresh token only when the caller still owns the current value. */
  async rotateValueStrict(key: string, expected: string, replacement: string, ttlSeconds: number): Promise<boolean> {
    await this.ensureReady();
    const result = await this.client.eval(
      `
        if redis.call('GET', KEYS[1]) ~= ARGV[1] then return 0 end
        redis.call('SET', KEYS[1], ARGV[2], 'EX', ARGV[3])
        return 1
      `,
      1,
      key,
      expected,
      replacement,
      ttlSeconds,
    );
    return result === 1;
  }

  /** Atomically consumes a challenge only when its JSON state is approved. */
  async consumeApprovedStrict(key: string, nowIso: string): Promise<string | null> {
    await this.ensureReady();
    const result = await this.client.eval(
      `
        local raw = redis.call('GET', KEYS[1])
        if not raw then return false end
        local state = cjson.decode(raw)
        if state.status ~= 'approved' then return false end
        if state.expiresAt <= ARGV[1] then
          redis.call('DEL', KEYS[1])
          return false
        end
        redis.call('DEL', KEYS[1])
        return raw
      `,
      1,
      key,
      nowIso,
    );
    return typeof result === "string" ? result : null;
  }
}
