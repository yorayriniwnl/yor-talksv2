import { Router } from "express";
import { authenticate, requireRole } from "../middlewares/auth.js";
import { operationalMetrics } from "../services/operational-metrics-service.js";

const router = Router();

router.get("/metrics", authenticate, requireRole("admin", "moderator"), (_req, res) => {
  res.setHeader("Content-Type", "text/plain; version=0.0.4; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.status(200).send(operationalMetrics.renderPrometheus());
});

export default router;
