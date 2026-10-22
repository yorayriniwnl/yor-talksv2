import multer from "multer";
import { type NextFunction, type Request, type Response } from "express";
import { logger } from "../lib/logger.js";
import { createResponse } from "../utils/response.js";
import { InvalidFileTypeError } from "./upload.js";
import { ContentPolicyViolationError } from "../services/content-policy-service.js";
import { ModerationUnavailableError } from "../services/ai-service.js";
import { MediaLifecycleError } from "../services/media-service.js";

export const errorHandler = (err: unknown, _req: Request, res: Response, next: NextFunction) => {
  if (res.headersSent) {
    return next(err);
  }
  // Body-parser errors carry the submitted body and sometimes echo it in their
  // message. Return a reviewed client error without serializing either value.
  const parserErrors: Record<string, [number, string, string]> = {
    "entity.parse.failed": [400, "Malformed request body", "invalid_request_body"],
    "entity.too.large": [413, "Request body is too large", "request_body_too_large"],
    "parameters.too.many": [413, "Too many request parameters", "too_many_parameters"],
    "charset.unsupported": [415, "Unsupported request charset", "unsupported_charset"],
    "encoding.unsupported": [415, "Unsupported request encoding", "unsupported_encoding"],
    "request.size.invalid": [400, "Invalid request size", "invalid_request_size"],
    "request.aborted": [400, "Request was interrupted", "request_aborted"],
  };
  const parserType = err instanceof Error ? (err as Error & { type?: unknown }).type : undefined;
  const parserError = typeof parserType === "string" && Object.hasOwn(parserErrors, parserType)
    ? parserErrors[parserType] : undefined;
  if (parserError) {
    const [status, message, code] = parserError;
    return res.status(status).json(createResponse(message, null, {}, [code]));
  }
  if (err instanceof MediaLifecycleError) {
    return res.status(err.status).json(createResponse(err.message, null, {}, [err.code]));
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
  return res.status(500).json(createResponse("Internal server error", null, {}, ["Internal server error"]));
};
