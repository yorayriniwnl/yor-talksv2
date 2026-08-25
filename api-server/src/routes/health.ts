import { Router, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { Redis } from "ioredis";
import { env } from "../config/env.js";

const router = Router();
const redis = new Redis(env.REDIS_URL);

// Phase 7: Platform Reliability & Operations
const healthHandler = async (req: Request, res: Response) => {
  try {
    // Check DB
    await db.execute(sql`SELECT 1`);
    
    // Check Redis
    await redis.ping();

    res.status(200).json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      services: {
        database: "up",
        redis: "up",
        api: "up"
      },
      uptime: process.uptime()
    });
  } catch (error) {
    res.status(503).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      error: (error as Error).message
    });
  }
};

router.get("/", healthHandler);
router.get("/healthz", healthHandler);

export const healthRoutes = router;
export default router;
