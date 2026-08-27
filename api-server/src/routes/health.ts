import { Router, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { Redis } from "ioredis";
import { env } from "../config/env.js";
import { inspectRedisCompatibility } from "../lib/redis-compat.js";

const router = Router();

// Phase 7: Platform Reliability & Operations
const liveHandler = (_req: Request, res: Response) => {
  res.status(200).json({ status: "live", timestamp: new Date().toISOString(), uptime: process.uptime() });
};

const healthHandler = async (_req: Request, res: Response) => {
  try {
    // Check DB
    await db.execute(sql`SELECT 1`);
    
    // Redis is also the session store and queue backend. A reachable but too
    // old Redis must not be reported ready because BullMQ will be disabled.
    const redis = await inspectRedisCompatibility(env.REDIS_URL);
    if (!redis.compatible) {
      throw new Error(`Redis is not ready (${redis.reason ?? "unsupported"})`);
    }

    res.status(200).json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      services: {
        database: "up",
        redis: `up (${redis.version})`,
        api: "up"
      },
      uptime: process.uptime()
    });
  } catch (error) {
    res.status(503).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      error: "One or more dependencies are unavailable"
    });
  }
};

router.get("/", healthHandler);
router.get("/healthz", healthHandler);
router.get("/readyz", healthHandler);
router.get("/livez", liveHandler);

export const healthRoutes = router;
export default router;
