import { Router, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { env } from "../config/env.js";
import { inspectRedisCompatibility } from "../lib/redis-compat.js";
import { hasHealthyNotificationWorker } from "../lib/worker-health.js";
import { getMediaReadinessSnapshot } from '../services/media-readiness.js';
import { inspectLifecycleHealth } from "../lib/lifecycle-health.js";

const router = Router();

// Phase 7: Platform Reliability & Operations
const liveHandler = (_req: Request, res: Response) => {
  res.status(200).json({ status: "live", timestamp: new Date().toISOString(), uptime: process.uptime() });
};

const readinessDependencies = {
  media: getMediaReadinessSnapshot,
  database: async () => { await db.execute(sql`SELECT 1`); },
  redis: () => inspectRedisCompatibility(env.REDIS_URL),
  notificationWorker: hasHealthyNotificationWorker,
  lifecycle: inspectLifecycleHealth,
  recoveryReplay: async () => {
    if (process.env.RECOVERY_REPLAY_GATE !== 'true') return;
    const requiredCutoff = process.env.RESTORE_DELETION_JOURNAL_THROUGH;
    const query = requiredCutoff
      ? sql`SELECT 1 FROM recovery_replay_log WHERE through >= ${requiredCutoff} LIMIT 1`
      : sql`SELECT 1 FROM recovery_replay_log LIMIT 1`;
    const result = await db.execute(query).catch(() => ({ rows: [] }));
    if (!result.rows || result.rows.length === 0) {
      throw new Error("Disaster recovery erasure replay not completed; services must not serve affected data");
    }
  },
};

export function createReadinessHandler(dependencies = readinessDependencies) {
  return async (_req: Request, res: Response) => {
    const services: Record<string, "up" | "down"> = {
      database: "down",
      redis: "down",
      api: "up",
      worker: "down",
      lifecycleWorker: "down",
    };

    const production = env.NODE_ENV === "production";
    const details: Record<string, unknown> = production ? {} : {
      environment: env.NODE_ENV,
      nodeVersion: process.version,
    };

    try {
      details.media = dependencies.media();
      await dependencies.database();
      services.database = "up";

      const redis = await dependencies.redis();
      if (!redis.compatible) {
        throw new Error(`Redis is not ready (${redis.reason ?? "unsupported"})`);
      }
      services.redis = "up";
      if (redis.version) {
        details.redisVersion = redis.version;
      }

      if (!(await dependencies.notificationWorker())) {
        throw new Error("Required notification worker is not ready");
      }
      services.worker = "up";

      const lifecycle = await dependencies.lifecycle();
      details.lifecycleCleanup = {
        overdueJobs: lifecycle.overdueCleanupJobs,
        deadJobs: lifecycle.deadCleanupJobs,
      };
      if (!lifecycle.workerUp) throw new Error("Required lifecycle worker is not ready");
      services.lifecycleWorker = "up";

      if (process.env.RECOVERY_REPLAY_GATE === 'true') {
        services.recoveryReplay = "down";
        await dependencies.recoveryReplay();
        services.recoveryReplay = "up";
      }

      res.status(200).json({
        status: "healthy",
        timestamp: new Date().toISOString(),
        ...(production ? {} : { services, details }),
        uptime: process.uptime(),
      });
    } catch {
      res.status(503).json({
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        ...(production ? {} : { services, details }),
        error: "One or more dependencies are unavailable",
      });
    }
  };
}

const readinessHandler = createReadinessHandler();

router.get("/", readinessHandler);
router.get("/healthz", liveHandler);
router.get("/readyz", readinessHandler);
router.get("/livez", liveHandler);

export const healthRoutes = router;
export default router;
