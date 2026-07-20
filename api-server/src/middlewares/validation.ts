import { type NextFunction, type Request, type Response } from "express";
import { z, type ZodSchema } from "zod";
import { createResponse } from "../utils/response.js";

export const validateBody = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(
        createResponse("Validation failed", null, {}, parsed.error.issues.map((issue) => issue.message)),
      );
    }
    req.body = parsed.data;
    return next();
  };
};

export const validateQuery = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json(
        createResponse("Validation failed", null, {}, parsed.error.issues.map((issue) => issue.message)),
      );
    }
    req.query = parsed.data as Request["query"];
    return next();
  };
};

export const validateParams = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req.params);
    if (!parsed.success) {
      return res.status(400).json(
        createResponse("Validation failed", null, {}, parsed.error.issues.map((issue) => issue.message)),
      );
    }
    req.params = parsed.data as Request["params"];
    return next();
  };
};
