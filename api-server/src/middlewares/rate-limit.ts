import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import Redis from "ioredis";
import type { Request, Response, RequestHandler } from "express";
import { env } from "../config/env.js";
import { logger } from "../lib/logger.js";

const healthPaths = new Set([
  "/api/livez",
  "/api/healthz",
  "/api/readyz",
  "/livez",
  "/healthz",
  "/readyz",
]);

let rateLimitRedisClient: Redis | null = null;
let rateLimitRedisConnectPromise: Promise<void> | null = null;

function getRateLimitRedisClient(): Redis {
  if (rateLimitRedisClient) return rateLimitRedisClient;

  rateLimitRedisClient = new Redis(env.REDIS_URL, {
    // RedisStore loads its Lua scripts while middleware modules are imported.
    // Connect explicitly before sending those commands so production startup
    // cannot race a socket while the offline queue is disabled.
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
  rateLimitRedisClient.on("error", (error) => {
    logger.warn({ error: error?.message || error }, "Rate-limit Redis connection warning");
  });
  return rateLimitRedisClient;
}

async function ensureRateLimitRedisReady(): Promise<Redis> {
  const client = getRateLimitRedisClient();
  if (client.status === "ready") return client;

  if (!rateLimitRedisConnectPromise) {
    if (client.status !== "wait" && client.status !== "end") {
      throw new Error(`Rate-limit Redis is not ready (${client.status})`);
    }
    rateLimitRedisConnectPromise = client.connect().then(() => undefined).finally(() => {
      rateLimitRedisConnectPromise = null;
    });
  }
  await rateLimitRedisConnectPromise;
  return client;
}

async function sendRateLimitRedisCommand(...args: string[]) {
  const [command, ...parameters] = args;
  if (!command) throw new Error("Redis command is required");
  const client = await ensureRateLimitRedisReady();
  return client.call(command, ...parameters) as any;
}

export async function closeRateLimitRedis(): Promise<void> {
  rateLimitRedisClient?.disconnect();
  rateLimitRedisClient = null;
  rateLimitRedisConnectPromise = null;
}

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
      sendCommand: sendRateLimitRedisCommand,
    }),
  });
}

export const apiRateLimiter = createLimiter("yor:rate:api:", 15 * 60 * 1000, 300);
export const authRateLimiter = createLimiter("yor:rate:auth:", 15 * 60 * 1000, 40);
export const scopedAuthRateLimiter: RequestHandler = (req, res, next) => {
  if (!req.path.startsWith('/auth/') || (req.method === 'GET' && /^\/auth\/2fa\/challenges(?:\/|$)/.test(req.path))) return next();
  return authRateLimiter(req, res, next);
};
export const aiRateLimiter = createLimiter("yor:rate:ai:", 15 * 60 * 1000, 20);
// Public grievance intake and media signatures can be abused for storage,
// email, or moderation-provider spend, so they need tighter limits than the
// broad API ceiling. These remain IP-based and are shared through Redis in
// production.
export const grievanceSubmitRateLimiter = createLimiter("yor:rate:grievance-submit:", 60 * 60 * 1000, 5);
export const grievanceStatusRateLimiter = createLimiter("yor:rate:grievance-status:", 15 * 60 * 1000, 30);
export const reportRateLimiter = createLimiter("yor:rate:report:", 15 * 60 * 1000, 20);
export const mediaRateLimiter = createLimiter("yor:rate:media:", 15 * 60 * 1000, 30);
