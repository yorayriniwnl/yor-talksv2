import { type NextFunction, type Request, type Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { createResponse } from "../utils/response.js";

interface JwtPayload {
  sub: string;
  role: string;
  permissions: string[];
}

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: string;
        permissions: string[];
      };
    }
  }
}

import { RedisRepository } from "../repositories/redis-repository.js";
const redisRepository = new RedisRepository();

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json(createResponse("Authentication required", null, {}, ["Missing bearer token"]));
  }

  const token = header.split(" ")[1];
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    
    // Check if user session was revoked (e.g. logoutAllDevices)
    // Here we check if the user even has an active refresh token. 
    // If we wanted true stateless revocation, we would use a token blacklist.
    const activeSession = await redisRepository.get(`session:${decoded.sub}`);
    if (!activeSession) {
      return res.status(401).json(createResponse("Session revoked or expired", null, {}, ["Unauthorized"]));
    }

    req.user = {
      id: decoded.sub,
      role: decoded.role,
      permissions: decoded.permissions ?? [],
    };
    return next();
  } catch {
    return res.status(401).json(createResponse("Invalid or expired token", null, {}, ["Unauthorized"]));
  }
};

export const requireRole = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json(createResponse("Forbidden", null, {}, ["Insufficient role"]));
    }
    return next();
  };
};

export const requirePermission = (...permissions: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !permissions.every((permission) => req.user?.permissions.includes(permission))) {
      return res.status(403).json(createResponse("Forbidden", null, {}, ["Missing permission"]));
    }
    return next();
  };
};
