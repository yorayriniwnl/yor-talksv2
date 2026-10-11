import { Router, type Request, type Response } from "express";
import { env } from "../config/env.js";
import { inspectRedisCompatibility } from "../lib/redis-compat.js";
import { logger } from "../lib/logger.js";
import { authenticate, requireRole } from "../middlewares/auth.js";
import { hasHealthyNotificationWorker } from "../lib/worker-health.js";
import { inspectLifecycleHealth } from '../services/lifecycle-health.js';

const router = Router();

/**
 * Internal diagnostics endpoint for deployment verification.
 * Reports queue and worker connectivity without exposing sensitive data.
 * Admin role is required because the endpoint reveals infrastructure state.
 */
const diagnosticsHandler = async (_req: Request, res: Response) => {
  const diagnostics: {
    status: "ok" | "degraded" | "error";
    timestamp: string;
    queue?: { redis: "up" | "down"; version?: string; reason?: string };
    workers: { status: "initialized" | "unavailable" | "unhealthy" };
    uptime: number;
    lifecycle?: Awaited<ReturnType<typeof inspectLifecycleHealth>>;
  } = {
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    workers: { status: "unavailable" },
  };

  try {
    // Check queue Redis connectivity (separate from main API Redis check)
    const queueRedis = await inspectRedisCompatibility(env.REDIS_URL);
    diagnostics.queue = {
      redis: queueRedis.compatible ? "up" : "down",
      version: queueRedis.version,
      reason: queueRedis.reason,
    };

    diagnostics.workers.status = await hasHealthyNotificationWorker() ? "initialized" : "unavailable";
    diagnostics.lifecycle = await inspectLifecycleHealth();

    if (!queueRedis.compatible || diagnostics.workers.status !== "initialized" || !diagnostics.lifecycle.ready || diagnostics.lifecycle.deadLetters > 0 || diagnostics.lifecycle.oldestOverdueSeconds > 300) {
      diagnostics.status = "degraded";
    }

    res.status(diagnostics.status === "ok" ? 200 : 503).json(diagnostics);
  } catch (error) {
    logger.warn({ error }, "Diagnostics check failed");
    diagnostics.status = "error";
    res.status(500).json({
      ...diagnostics,
      error: error instanceof Error ? error.message : "Diagnostics check failed",
    });
  }
};

router.get("/diagnostics", authenticate, requireRole("admin"), diagnosticsHandler);

export default router;
