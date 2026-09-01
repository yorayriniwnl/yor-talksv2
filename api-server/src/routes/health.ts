import { Router, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { env } from "../config/env.js";
import { inspectRedisCompatibility } from "../lib/redis-compat.js";

const router = Router();

// Phase 7: Platform Reliability & Operations
const liveHandler = (_req: Request, res: Response) => {
  res.status(200).json({ status: "live", timestamp: new Date().toISOString(), uptime: process.uptime() });
};

const healthHandler = async (_req: Request, res: Response) => {
  const services: Record<string, "up" | "down"> = {
    database: "down",
    redis: "down",
    api: "up",
  };

  try {
    await db.execute(sql`SELECT 1`);
    services.database = "up";

    const redis = await inspectRedisCompatibility(env.REDIS_URL);
    if (!redis.compatible) {
      throw new Error(`Redis is not ready (${redis.reason ?? "unsupported"})`);
    }
    services.redis = "up";

    res.status(200).json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      services,
      uptime: process.uptime(),
    });
  } catch (error) {
    res.status(503).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      services,
      error: error instanceof Error ? error.message : "One or more dependencies are unavailable",
    });
  }
};

router.get("/", healthHandler);
router.get("/healthz", healthHandler);
router.get("/readyz", healthHandler);
router.get("/livez", liveHandler);

export const healthRoutes = router;
export default router;
