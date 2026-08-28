import type { NextFunction, Request, Response } from "express";
import { operationalMetrics } from "../services/operational-metrics-service.js";

export function recordOperationalMetrics(req: Request, res: Response, next: NextFunction): void {
  const startedAt = process.hrtime.bigint();
  let recorded = false;
  operationalMetrics.startRequest();

  const finish = () => {
    if (recorded) return;
    recorded = true;
    const elapsedNanoseconds = process.hrtime.bigint() - startedAt;
    operationalMetrics.finishRequest(req.method, req.originalUrl, res.statusCode, Number(elapsedNanoseconds) / 1_000_000_000);
  };

  res.once("finish", finish);
  res.once("close", finish);
  next();
}
