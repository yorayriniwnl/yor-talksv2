import { type NextFunction, type Request, type Response } from "express";
import { randomUUID } from "node:crypto";

export const requestContext = (req: Request, _res: Response, next: NextFunction) => {
  req.requestId = randomUUID();
  next();
};

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}
