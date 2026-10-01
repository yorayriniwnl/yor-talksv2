import { Router } from "express";
import { z } from "zod";
import { authenticate, optionalAuthenticate, requireRole } from "../middlewares/auth.js";
import { telemetryRateLimiter } from "../middlewares/rate-limit.js";
import { validateBody } from "../middlewares/validation.js";
import { createResponse } from "../utils/response.js";
import { productEventBatchSchema, ProductAnalyticsService } from "../services/product-analytics-service.js";

const router = Router();
const analyticsService = new ProductAnalyticsService();
const querySchema = z.object({
  from: z.string().date(),
  to: z.string().date(),
});

router.post("/telemetry/events", telemetryRateLimiter, optionalAuthenticate, validateBody(z.object({ events: productEventBatchSchema }).strict()), async (req, res) => {
  try {
    const inserted = await analyticsService.ingest(req.user?.id ?? null, req.body.events);
    res.status(202).json(createResponse("Telemetry accepted", { accepted: inserted }));
  } catch {
    res.status(503).json(createResponse("Telemetry temporarily unavailable", null, {}, ["telemetry_unavailable"]));
  }
});

router.get("/telemetry/analytics", authenticate, requireRole("admin", "moderator"), async (req, res) => {
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json(createResponse("Invalid date range", null, {}, ["invalid_date_range"]));
  const from = new Date(`${parsed.data.from}T00:00:00.000Z`);
  const to = new Date(`${parsed.data.to}T00:00:00.000Z`);
  const days = (to.getTime() - from.getTime()) / 86_400_000;
  if (!Number.isInteger(days) || days < 0 || days > 89) {
    return res.status(400).json(createResponse("Date range must be at most 90 days", null, {}, ["date_range_too_large"]));
  }
  to.setUTCDate(to.getUTCDate() + 1);
  try {
    const [daily, overview] = await Promise.all([
      analyticsService.getDaily(from, to),
      analyticsService.getOverview(),
    ]);
    return res.json(createResponse("Analytics loaded", { overview, daily }));
  } catch {
    return res.status(503).json(createResponse("Analytics temporarily unavailable", null, {}, ["analytics_unavailable"]));
  }
});

export default router;