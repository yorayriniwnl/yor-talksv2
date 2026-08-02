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
    // Express 5 made req.query a getter-only property — it can no longer be
    // reassigned (this used to work in Express 4). None of the schemas here
    // use zod coercion/transform, so parsed.data never actually differs from
    // req.query anyway; the validation gate above is what matters.
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
    // Same reasoning as validateQuery above.
    return next();
  };
};
