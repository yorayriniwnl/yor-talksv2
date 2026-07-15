import { type NextFunction, type Request, type Response } from "express";
import { logger } from "../lib/logger.js";
import { createResponse } from "../utils/response.js";

export const errorHandler = (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  logger.error({ err }, "Unhandled error");
  const message = err instanceof Error ? err.message : "Internal server error";
  return res.status(500).json(createResponse("Internal server error", null, {}, [message]));
};
