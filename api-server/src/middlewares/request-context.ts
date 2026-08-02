import { type NextFunction, type Request, type Response } from "express";
import { randomUUID } from "node:crypto";

export const requestContext = (req: Request, res: Response, next: NextFunction) => {
  const requestId = randomUUID();
  req.requestId = requestId;
  res.setHeader("X-Request-Id", requestId);
  next();
};

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}
