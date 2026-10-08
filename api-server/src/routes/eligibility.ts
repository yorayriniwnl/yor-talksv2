import { Router } from 'express';
import { authenticate } from '../middlewares/auth.js';
import { validateBody, validateParams } from '../middlewares/validation.js';
import { assuranceStartIpLimiter, assuranceStartSubjectLimiter, assurancePollLimiter, assuranceCallbackLimiter } from '../middlewares/rate-limit.js';
import { assuranceChallengeSchema, eligibilityChallengeParams, guardianJourneySchema, guardianAuthorizationParams } from '../validators/eligibility.js';
import { AssuranceService } from '../services/assurance-service.js';
import { EligibilityController } from '../controllers/eligibility-controller.js';
import { assuranceCallbackBody } from '../middlewares/assurance-body.js';

export function createEligibilityRouter(service = new AssuranceService()) {
  const router = Router(); const controller = new EligibilityController(service);
  router.get('/users/me/eligibility',authenticate,assurancePollLimiter,controller.status);
  router.post('/users/me/eligibility/challenges',authenticate,assuranceStartIpLimiter,assuranceStartSubjectLimiter,validateBody(assuranceChallengeSchema),controller.challenge);
  router.get('/users/me/eligibility/challenges/:challengeId',authenticate,assurancePollLimiter,validateParams(eligibilityChallengeParams),controller.challengeStatus);
  router.get('/users/me/guardian-authorizations',authenticate,assurancePollLimiter,controller.guardianList);
  router.post('/users/me/guardian-authorizations',authenticate,assuranceStartIpLimiter,assuranceStartSubjectLimiter,validateBody(guardianJourneySchema),controller.guardianJourney);
  router.post('/users/me/guardian-authorizations/:authorizationId/withdraw',authenticate,assurancePollLimiter,validateParams(guardianAuthorizationParams),controller.withdraw);
  // Unavailable default mounts no callback. A provider-specific approved
  // adapter is a prerequisite; the fixture path exists only by test injection.
  if (service.callbacksEnabled) router.post('/eligibility/provider/callback',assuranceCallbackLimiter,assuranceCallbackBody,controller.callback);
  return router;
}
export default createEligibilityRouter();
