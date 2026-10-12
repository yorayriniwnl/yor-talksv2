import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { authenticate } from '../middlewares/auth.js';
import { validateBody, validateParams } from '../middlewares/validation.js';
import { authRateLimiter } from '../middlewares/rate-limit.js';
import { createResponse } from '../utils/response.js';
import { EligibilityError, EligibilityService } from '../services/eligibility-service.js';

const challengeInput = z.object({ country: z.string().regex(/^[A-Z]{2}$/), guardianAuthorizationId: z.string().uuid().optional() }).strict();
const challengeId = z.object({ challengeId: z.string().uuid() });
const authorizationId = z.object({ authorizationId: z.string().uuid() });
const guardianInput = z.object({ guardianId: z.string().uuid() }).strict();
const providerInput = z.object({ credential: z.string().min(1).max(8192) }).strict();
const endpoint = (work: (req: Request) => Promise<unknown>) => async (req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'private, no-store');
  try { return res.status(200).json(createResponse('Account verification status', await work(req))); }
  catch (error) {
    if (error instanceof EligibilityError) return res.status(error.status).json(createResponse(error.message, null, {}, [error.code]));
    return res.status(503).json(createResponse('Account verification is temporarily unavailable', null, {}, ['eligibility_unavailable']));
  }
};
export function createEligibilityRouter(service = new EligibilityService()) {
  const router = Router();
  router.get('/users/me/eligibility', authenticate, endpoint(req => service.ownerStatus(req.user!.id)));
  router.post('/users/me/eligibility/challenges', authenticate, authRateLimiter, validateBody(challengeInput),
    endpoint(req => service.startChallenge(req.user!.id, req.body.country, req.body.guardianAuthorizationId)));
  router.get('/users/me/eligibility/challenges/:challengeId', authenticate, validateParams(challengeId),
    endpoint(req => service.challengeStatus(req.user!.id, req.params.challengeId as string)));
  router.get('/users/me/guardian-authorizations', authenticate, endpoint(req => service.guardianSummaries(req.user!.id)));
  router.post('/users/me/guardian-authorizations', authenticate, authRateLimiter, validateBody(guardianInput),
    endpoint(req => service.requestGuardianAuthorization(req.user!.id, req.body.guardianId)));
  router.post('/users/me/guardian-authorizations/:authorizationId/withdraw', authenticate, validateParams(authorizationId),
    endpoint(req => service.withdrawGuardianAuthorization(req.user!.id, req.params.authorizationId as string)));
  router.post('/eligibility/provider-results', authRateLimiter, validateBody(providerInput),
    endpoint(req => service.acceptProviderResult(req.body.credential)));
  return router;
}
export default createEligibilityRouter();
