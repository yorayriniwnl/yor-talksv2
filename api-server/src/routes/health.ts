import { Router, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { env } from "../config/env.js";
import { inspectRedisCompatibility } from "../lib/redis-compat.js";
import { isNotificationWorkerHealthy } from "../lib/worker-health.js";

const router = Router();

// Phase 7: Platform Reliability & Operations
const liveHandler = (_req: Request, res: Response) => {
  res.status(200).json({ status: "live", timestamp: new Date().toISOString(), uptime: process.uptime() });
};

const readinessHandler = async (_req: Request, res: Response) => {
  const services: Record<string, "up" | "down"> = {
    database: "down",
    redis: "down",
    api: "up",
    worker: "down",
  };

  const details: Record<string, unknown> = {
    environment: env.NODE_ENV,
    nodeVersion: process.version,
  };

  try {
    await db.execute(sql`SELECT 1`);
    services.database = "up";

    const redis = await inspectRedisCompatibility(env.REDIS_URL);
    if (!redis.compatible) {
      throw new Error(`Redis is not ready (${redis.reason ?? "unsupported"})`);
    }
    services.redis = "up";
    if (redis.version) {
      details.redisVersion = redis.version;
    }

    if (!isNotificationWorkerHealthy()) {
      throw new Error("Required notification worker is not ready");
    }
    services.worker = "up";

    res.status(200).json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      services,
      details,
      uptime: process.uptime(),
    });
  } catch (error) {
    res.status(503).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      services,
      details,
      error: error instanceof Error ? error.message : "One or more dependencies are unavailable",
    });
  }
};

router.get("/", readinessHandler);
router.get("/healthz", liveHandler);
router.get("/readyz", readinessHandler);
router.get("/livez", liveHandler);

export const healthRoutes = router;
export default router;

