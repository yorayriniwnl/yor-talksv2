import { Router, type NextFunction, type Request, type Response } from "express";
import { authenticate, requireRole } from "../middlewares/auth.js";
import { operationalMetrics } from "../services/operational-metrics-service.js";
import { env } from "../config/env.js";
import { metricsTokenMatches, readMetricsToken } from "../lib/metrics-auth.js";

const router = Router();

async function authorizeMetrics(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authorization = req.headers.authorization;
  const supplied = authorization?.startsWith("Bearer ") ? authorization.slice(7) : "";
  try {
    const expected = await readMetricsToken(env.METRICS_BEARER_TOKEN_FILE);
    if (metricsTokenMatches(supplied, expected)) return next();
  } catch {
    // The regular administrator path remains available if the scrape secret is missing.
  }
  await authenticate(req, res, () => { requireRole("admin", "moderator")(req, res, next); });
}

router.get("/metrics", authorizeMetrics, async (_req, res) => {
  res.setHeader("Content-Type", "text/plain; version=0.0.4; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.status(200).send(await operationalMetrics.renderPrometheus());
});

export default router;
