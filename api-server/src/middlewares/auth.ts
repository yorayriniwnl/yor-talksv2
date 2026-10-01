import { type NextFunction, type Request, type Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { createResponse } from "../utils/response.js";
import { hasCurrentConsent } from "../utils/consent.js";

interface JwtPayload {
  sub: string;
  role: string;
  permissions: string[];
  deviceId: string;
  authVersion?: number;
  type?: string;
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
import { UserRepository } from "../repositories/user-repository.js";
const redisRepository = new RedisRepository();
const userRepository = new UserRepository();

export async function closeAuthenticationDependencies(): Promise<void> {
export async function closeAuthDependencies(): Promise<void> {
  await redisRepository.disconnect();
}

function normalizedRequestPath(req: Request): string {
  return req.originalUrl.split("?")[0].replace(/^\/api(?:\/v1)?/, "") || "/";
}

function consentExempt(req: Request): boolean {
  const path = normalizedRequestPath(req);
  return (
    (path === "/users/me" && (req.method === "GET" || req.method === "DELETE")) ||
    (path === "/users/me/consent" && req.method === "POST") ||
    (path === "/users/me/export" && req.method === "GET") ||
    (path === "/auth/logout" && req.method === "POST") ||
    (path === "/auth/logout-all" && req.method === "POST")
  );
}

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json(createResponse("Authentication required", null, {}, ["Missing bearer token"]));
  }

  const token = header.split(" ")[1];
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] }) as JwtPayload;
    if (typeof decoded.sub !== 'string' || typeof decoded.deviceId !== 'string' || (decoded.type && decoded.type !== 'access')) {
      return res.status(401).json(createResponse('Invalid session', null));
    }
    
    // Check if this specific device's session was revoked (e.g. logout / logoutAllDevices).
    // Bug fixed: this used to check `session:${sub}` with no deviceId — a key that
    // auth-service never writes (sessions are stored per-device) — so every request
    // failed here regardless of the token's validity. If we wanted true stateless
    // revocation instead of a session-existence check, we'd use a token blacklist.
    const activeSession = await redisRepository.getStrict(`session:${decoded.sub}:${decoded.deviceId}`);
    if (!activeSession) {
      return res.status(401).json(createResponse("Session revoked or expired", null, {}, ["Unauthorized"]));
    }
    const user = await userRepository.findById(decoded.sub);
    if (!user || (decoded.authVersion ?? 0) !== (user.authVersion ?? 0) || ['suspended', 'deactivated', 'deleted'].includes(user.accountStatus ?? 'active')) {
      return res.status(401).json(createResponse("Account is unavailable", null, {}, ["Unauthorized"]));
    }

    req.user = {
      id: decoded.sub,
      role: user.role,
      permissions: user.permissions ?? [],
    };
    if (!hasCurrentConsent(user) && !consentExempt(req)) {
      return res.status(428).json(createResponse(
        "Current terms acceptance required",
        null,
        { termsAcceptanceRequired: true, termsVersion: env.TERMS_VERSION, minimumAge: env.MINIMUM_AGE },
        ["Accept the current Terms and confirm the minimum age to continue"],
      ));
    }
    return next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) return res.status(401).json(createResponse("Invalid or expired token", null, {}, ["Unauthorized"]));
    return res.status(503).json(createResponse('Session verification is temporarily unavailable', null));
  }
};

/** Public content endpoints can personalize results without rejecting anonymous viewers. */
export const optionalAuthenticate = async (req: Request, res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return next();

  try {
    const decoded = jwt.verify(header.split(" ")[1], env.JWT_SECRET, { algorithms: ['HS256'] }) as JwtPayload;
    if (typeof decoded.sub !== 'string' || typeof decoded.deviceId !== 'string' || (decoded.type && decoded.type !== 'access')) return next();
    const activeSession = await redisRepository.getStrict(`session:${decoded.sub}:${decoded.deviceId}`);
    const user = activeSession ? await userRepository.findById(decoded.sub) : undefined;
    if (activeSession && user && (decoded.authVersion ?? 0) === (user.authVersion ?? 0) && !['suspended', 'deactivated', 'deleted'].includes(user.accountStatus ?? 'active')) {
      req.user = { id: decoded.sub, role: user.role, permissions: user.permissions ?? [] };
    }
  } catch (error) {
    if (!(error instanceof jwt.JsonWebTokenError)) return res.status(503).json(createResponse('Session verification is temporarily unavailable', null));
    // An invalid optional credential is treated as anonymous access.
  }
  return next();
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
