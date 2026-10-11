import type { Request, RequestHandler, Response } from 'express';
import { classifyApiRoute, type ClassifiedApiRoute } from '../eligibility/route-capabilities.js';
import type { Capability } from '../eligibility/types.js';
import { isEligibilityEnforcementEnabled } from '../eligibility/enforcement.js';
import { createResponse } from '../utils/response.js';

declare global {
  namespace Express {
    interface Request {
      apiRoute?: ClassifiedApiRoute;
      sessionVerified?: boolean;
    }
  }
}

function reject(res: Response, message: string, meta: Record<string, unknown> = {}) {
  return res.status(403).json(createResponse(message, null, meta, [message]));
}

/** Resolve every API request against the generated, reviewed method/path inventory. */
export const classifyApiRequest: RequestHandler = (req, res, next) => {
  const route = classifyApiRoute(req.method, req.originalUrl);
  if (!route) {
    if (req.headers.authorization?.startsWith('Bearer ')) {
      return reject(res, 'This authenticated route has no current-authority policy', { eligibilityRequired: true });
    }
    return next();
  }
  if (route.authenticated && !route.policy) {
    return reject(res, 'This authenticated route has no current-authority policy', { eligibilityRequired: true });
  }
  req.apiRoute = route;
  return next();
};

/** Route-level guard for service code that needs to repeat a specific capability check. */
export function requireCapability(capability: Capability): RequestHandler {
  return (req, res, next) => {
    if (!isEligibilityEnforcementEnabled()) return next();
    const decision = req.eligibility;
    if (!decision) return res.status(503).json(createResponse('Current eligibility is unavailable', null));
    if (!decision.activated || !decision.capabilities[capability]) {
      return reject(res, 'The current account policy does not permit this action', {
        eligibilityRequired: true,
        capabilityRequired: capability,
        reason: decision.reason,
      });
    }
    return next();
  };
}

/** Applies exact route authority after identity, session, consent, and current eligibility are loaded. */
export const enforceEligibilityRoute: RequestHandler = (req, res, next) => {
  if (!isEligibilityEnforcementEnabled()) return next();
  const route = req.apiRoute ?? classifyApiRoute(req.method, req.originalUrl) ?? undefined;
  const decision = req.eligibility;
  if (!route?.policy || route.policy.kind === 'public') {
    return reject(res, 'This authenticated route has no current-authority policy', {
      eligibilityRequired: true,
      reason: decision?.reason,
      experience: decision?.experience,
    });
  }
  if (!decision) return res.status(503).json(createResponse('Current eligibility is unavailable', null));
  if (route.policy.kind === 'restricted' || route.policy.kind === 'safety') return next();
  if (!route.authenticated) {
    return reject(res, 'This operation is not an authenticated capability route', { eligibilityRequired: true });
  }
  if (!decision.activated) {
    return reject(res, 'Account eligibility verification is required to access this resource', {
      eligibilityRequired: true,
      reason: decision.reason,
      experience: decision.experience,
    });
  }
  if (route.policy.kind === 'capability') {
    return requireCapability(route.policy.capability)(req, res, next);
  }
  if (route.policy.kind === 'staff' && req.user && route.policy.roles.includes(req.user.role)) return next();
  return reject(res, 'Current account authority does not permit this action', {
    eligibilityRequired: true,
    reason: decision.reason,
  });
};

export function consentExemptForSafetyRoute(req: Request): boolean {
  const route = req.apiRoute ?? classifyApiRoute(req.method, req.originalUrl) ?? undefined;
  return route?.policy?.kind === 'safety';
}
