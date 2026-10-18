import { Router, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { env } from "../config/env.js";
import { inspectRedisCompatibility } from "../lib/redis-compat.js";
import { hasHealthyLifecycleWorker, hasHealthyNotificationWorker } from "../lib/worker-health.js";
import { hasHealthyNotificationWorker } from "../lib/worker-health.js";
import { inspectMediaReadiness } from '../services/media-readiness.js';

const router = Router();

// Phase 7: Platform Reliability & Operations
const liveHandler = (_req: Request, res: Response) => {
  res.status(200).json({ status: "live", timestamp: new Date().toISOString(), uptime: process.uptime() });
};

async function withHealthTimeout<T>(operation: Promise<T>, dependency: string, timeoutMs = 1_000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error(`${dependency} readiness check timed out`)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

const readinessHandler = async (_req: Request, res: Response) => {
  const production = env.NODE_ENV === "production";
  const services: Record<string, "up" | "down"> = {
    database: "down",
    redis: "down",
    api: "up",
    worker: "down",
    lifecycleWorker: "down",
  };

  const details: Record<string, unknown> = production
    ? {}
    : { environment: env.NODE_ENV, nodeVersion: process.version };

  try {
    await withHealthTimeout(db.execute(sql`SELECT 1`), "Database");
    details.media = await inspectMediaReadiness();
    await db.execute(sql`SELECT 1`);
    services.database = "up";

    const redis = await withHealthTimeout(inspectRedisCompatibility(env.REDIS_URL), "Redis");
    if (!redis.compatible) {
      throw new Error(`Redis is not ready (${redis.reason ?? "unsupported"})`);
    }
    services.redis = "up";
    if (redis.version && !production) {
      details.redisVersion = redis.version;
    }

    if (!(await withHealthTimeout(hasHealthyNotificationWorker(), "Notification worker"))) {
      throw new Error("Required notification worker is not ready");
    }
    services.worker = "up";

    if (!(await withHealthTimeout(hasHealthyLifecycleWorker(), "Lifecycle worker"))) {
      throw new Error("Required lifecycle worker is not ready");
    }
    services.lifecycleWorker = "up";

    res.status(200).json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      ...(production ? {} : { services, details }),
      uptime: process.uptime(),
    });
  } catch (error) {
    res.status(503).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      ...(production ? {} : { services, details }),
      error: production
        ? "Readiness checks failed"
        : error instanceof Error ? error.message : "One or more dependencies are unavailable",
    });
  }
};

router.get("/", readinessHandler);
router.get("/healthz", liveHandler);
router.get("/readyz", readinessHandler);
router.get("/livez", liveHandler);

export const healthRoutes = router;
export default router;
