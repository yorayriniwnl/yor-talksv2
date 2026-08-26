import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import Redis from "ioredis";
import { env } from "../config/env.js";

const redisClient = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 1,
  enableOfflineQueue: false,
});

function createLimiter(prefix: string, windowMs: number, max: number) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.ip || "unknown",
    handler: (_req, res) => {
      res.status(429).json({
        success: false,
        message: "Too many requests. Please try again later.",
        data: null,
        errors: ["rate_limit_exceeded"],
      });
    },
    store: new RedisStore({
      prefix,
      sendCommand: (...args: string[]) => redisClient.call(args[0], ...args.slice(1)) as any,
    }),
  });
}

export const apiRateLimiter = createLimiter("yor:rate:api:", 15 * 60 * 1000, 300);
export const authRateLimiter = createLimiter("yor:rate:auth:", 15 * 60 * 1000, 40);
export const aiRateLimiter = createLimiter("yor:rate:ai:", 15 * 60 * 1000, 20);
