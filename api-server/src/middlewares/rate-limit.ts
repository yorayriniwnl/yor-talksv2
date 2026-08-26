import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import Redis from "ioredis";
import type { Request, Response } from "express";
import { env } from "../config/env.js";

const redisClient = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 1,
  enableOfflineQueue: false,
});
const healthPaths = new Set([
  "/api/livez",
  "/api/healthz",
  "/api/readyz",
  "/livez",
  "/healthz",
  "/readyz",
]);

function createLimiter(prefix: string, windowMs: number, max: number) {
  const config = {
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: Request) => ipKeyGenerator(req.ip || "unknown"),
    skip: (req: Request) => healthPaths.has(req.path),
    handler: (_req: Request, res: Response) => {
      res.status(429).json({
        success: false,
        message: "Too many requests. Please try again later.",
        data: null,
        errors: ["rate_limit_exceeded"],
      });
    },
  };

  // Local development and tests should remain usable with the lightweight
  // Redis versions commonly installed on developer machines. Production uses
  // Redis 7 through the deployed stack for shared limits across instances.
  if (env.NODE_ENV !== "production") return rateLimit(config);

  return rateLimit({
    ...config,
    store: new RedisStore({
      prefix,
      sendCommand: (...args: string[]) => redisClient.call(args[0], ...args.slice(1)) as any,
    }),
  });
}

export const apiRateLimiter = createLimiter("yor:rate:api:", 15 * 60 * 1000, 300);
export const authRateLimiter = createLimiter("yor:rate:auth:", 15 * 60 * 1000, 40);
export const aiRateLimiter = createLimiter("yor:rate:ai:", 15 * 60 * 1000, 20);
