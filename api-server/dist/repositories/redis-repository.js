import { createHash } from "node:crypto";
import { Redis } from "ioredis";
import { env } from "../config/env.js";
import { logger } from "../lib/logger.js";
export class RedisRepository {
    client;
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
    async get(key) {
        return this.client.get(key);
    }
    async set(key, value, ttlSeconds) {
        if (ttlSeconds) {
            await this.client.set(key, value, "EX", ttlSeconds);
        }
        else {
            await this.client.set(key, value);
        }
    }
    async del(key) {
        await this.client.del(key);
    }
    async addToSet(key, value) {
        await this.client.sadd(key, value);
    }
    async removeFromSet(key, value) {
        await this.client.srem(key, value);
    }
    async getSet(key) {
        return this.client.smembers(key);
    }
    async hashToken(token) {
        return createHash("sha256").update(token).digest("hex");
    }
}
//# sourceMappingURL=redis-repository.js.map