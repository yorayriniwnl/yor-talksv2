import { type NextFunction, type Request, type Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { createResponse } from "../utils/response.js";
import { RedisRepository } from "../repositories/redis-repository.js";
import { UserRepository } from "../repositories/user-repository.js";
import { EligibilityService } from "../services/eligibility-service.js";
import type { EligibilityDecision } from "../eligibility/types.js";
import { isRestrictedRightsRouteAllowed, isRestrictedRouteAllowed } from "../eligibility/restricted-routes.js";

interface JwtPayload {
  sub?: string;
  deviceId?: string;
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
        accountStatus?: string;
      };
      /** Current server decision. It is loaded from private DB authority for this request. */
      eligibility?: EligibilityDecision;
    }
  }
}

const redisRepository = new RedisRepository();
const userRepository = new UserRepository();
const eligibilityService = new EligibilityService();

export async function closeAuthenticationDependencies(): Promise<void> {
  await redisRepository.disconnect();
}

export const closeAuthDependencies = closeAuthenticationDependencies;

function unavailable(res: Response) {
  return res.status(503).json(createResponse("Session verification is temporarily unavailable", null));
}

function rejectRestrictedRequest(req: Request, res: Response) {
  const accountStatus = req.user?.accountStatus ?? "active";
  const moderationRestricted = accountStatus === "suspended" || accountStatus === "deactivated"
    || req.eligibility?.reason === "account_restricted";
  const allowed = moderationRestricted
    ? isRestrictedRightsRouteAllowed(req.method, req.originalUrl)
    : isRestrictedRouteAllowed(req.method, req.originalUrl);
  if (!allowed) return res.status(403).json(createResponse("Account access is restricted", null, {}, ["eligibility_required"]));
  return undefined;
}

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ") || header.length <= "Bearer ".length) {
    return res.status(401).json(createResponse("Authentication required", null, {}, ["Missing bearer token"]));
  }

  try {
    const decoded = jwt.verify(header.slice("Bearer ".length), env.JWT_SECRET, { algorithms: ["HS256"] }) as JwtPayload;
    if (typeof decoded.sub !== "string" || typeof decoded.deviceId !== "string" || (decoded.type && decoded.type !== "access")) {
      return res.status(401).json(createResponse("Invalid session", null));
    }

    // Device revocation and authVersion remain mandatory for restricted and
    // activated sessions alike.
    const activeSession = await redisRepository.getStrict(`session:${decoded.sub}:${decoded.deviceId}`);
    if (!activeSession) return res.status(401).json(createResponse("Session revoked or expired", null, {}, ["Unauthorized"]));

    const user = await userRepository.findById(decoded.sub);
    if (!user || (decoded.authVersion ?? 0) !== (user.authVersion ?? 0) || (user.accountStatus ?? "active") === "deleted") {
      return res.status(401).json(createResponse("Account is unavailable", null, {}, ["Unauthorized"]));
    }

    const decision = await eligibilityService.decisionFor(user.id);
    req.user = {
      id: decoded.sub,
      role: user.role,
      permissions: user.permissions ?? [],
      accountStatus: user.accountStatus ?? "active",
    };
    req.eligibility = decision;

    if (!decision.activated) {
      const blocked = rejectRestrictedRequest(req, res);
      if (blocked) return blocked;
    }
    return next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) return res.status(401).json(createResponse("Invalid or expired token", null, {}, ["Unauthorized"]));
    return unavailable(res);
  }
};

/**
 * Public content treats absent, invalid, expired and restricted credentials
 * identically. Only a current activated account can personalize a public read.
 */
export const optionalAuthenticate = async (req: Request, res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ") || header.length <= "Bearer ".length) return next();

  try {
    const decoded = jwt.verify(header.slice("Bearer ".length), env.JWT_SECRET, { algorithms: ["HS256"] }) as JwtPayload;
    if (typeof decoded.sub !== "string" || typeof decoded.deviceId !== "string" || (decoded.type && decoded.type !== "access")) return next();
    const activeSession = await redisRepository.getStrict(`session:${decoded.sub}:${decoded.deviceId}`);
    if (!activeSession) return next();
    const user = await userRepository.findById(decoded.sub);
    if (!user || (user.accountStatus ?? "active") !== "active" || (decoded.authVersion ?? 0) !== (user.authVersion ?? 0)) return next();
    const decision = await eligibilityService.decisionFor(user.id);
    if (decision.activated) {
      req.user = { id: user.id, role: user.role, permissions: user.permissions ?? [], accountStatus: user.accountStatus ?? "active" };
      req.eligibility = decision;
    }
  } catch (error) {
    if (!(error instanceof jwt.JsonWebTokenError)) return unavailable(res);
    // Invalid and expired optional credentials use the same public ceiling as anonymous access.
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
