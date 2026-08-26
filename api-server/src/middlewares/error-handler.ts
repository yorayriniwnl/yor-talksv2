import multer from "multer";
import { type NextFunction, type Request, type Response } from "express";
import { logger } from "../lib/logger.js";
import { createResponse } from "../utils/response.js";
import { env } from "../config/env.js";
import { InvalidFileTypeError } from "./upload.js";
import { ContentPolicyViolationError } from "../services/content-policy-service.js";
import { ModerationUnavailableError } from "../services/ai-service.js";

export const errorHandler = (err: unknown, _req: Request, res: Response, next: NextFunction) => {
  if (res.headersSent) {
    return next(err);
  }
  if (err instanceof multer.MulterError || err instanceof InvalidFileTypeError) {
    return res.status(400).json(createResponse("Invalid file upload", null, {}, [err.message]));
  }
  if (err instanceof ContentPolicyViolationError) {
    return res.status(422).json(createResponse(err.message, null, {}, ["content_policy_violation"]));
  }
  if (err instanceof ModerationUnavailableError) {
    return res.status(503).json(createResponse(err.message, null, {}, ["moderation_unavailable"]));
  }
  logger.error({ err }, "Unhandled error");
  const isProd = env.NODE_ENV === "production";
  const message = err instanceof Error ? (isProd ? "Internal server error" : err.message) : "Internal server error";
  return res.status(500).json(createResponse("Internal server error", null, {}, [message]));
};
