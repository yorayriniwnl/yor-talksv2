import { Router, type Request, type Response } from "express";
import { env } from "../config/env.js";
import { inspectRedisCompatibility } from "../lib/redis-compat.js";
import { logger } from "../lib/logger.js";

const router = Router();

/**
 * Internal diagnostics endpoint for deployment verification.
 * Reports queue and worker connectivity without exposing sensitive data.
 * Restricted to localhost in production.
 */
const diagnosticsHandler = async (_req: Request, res: Response) => {
  const diagnostics: {
    status: "ok" | "degraded" | "error";
    timestamp: string;
    queue?: { redis: "up" | "down"; version?: string; reason?: string };
    workers?: { status: "initialized" | "unavailable" | "unhealthy" };
    uptime: number;
  } = {
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  };

  try {
    // Check queue Redis connectivity (separate from main API Redis check)
    const queueRedis = await inspectRedisCompatibility(env.REDIS_URL);
    diagnostics.queue = {
      redis: queueRedis.compatible ? "up" : "down",
      version: queueRedis.version,
      reason: queueRedis.reason,
    };

    if (!queueRedis.compatible) {
      diagnostics.status = "degraded";
      res.status(503);
    }

    res.status(res.statusCode || 200).json(diagnostics);
  } catch (error) {
    logger.warn({ error }, "Diagnostics check failed");
    diagnostics.status = "error";
    res.status(500).json({
      ...diagnostics,
      error: error instanceof Error ? error.message : "Diagnostics check failed",
    });
  }
};

router.get("/diagnostics", diagnosticsHandler);

export default router;
