import type { Request, Response } from 'express';
import { AssuranceUnavailableError } from '../eligibility/assurance-adapter.js';
import { AssuranceRequestError, AssuranceService } from '../services/assurance-service.js';
import { createResponse } from '../utils/response.js';

export class EligibilityController {
  constructor(private readonly service: AssuranceService) {}
  private async respond(res: Response,operation: () => Promise<unknown>,status=200) {
    try {
      const data = await operation();
      if (data===undefined || data===false) return res.status(404).json(createResponse('Record unavailable',null,{},['record_unavailable']));
      return res.status(status).json(createResponse('Verification status loaded',data));
    } catch (error) {
      const request = error instanceof AssuranceRequestError;
      return res.status(request ? error.code==='challenge_limit_exceeded' ? 429 : 403 : 503)
        .json(createResponse(request ? 'Verification unavailable' : 'Verification provider unavailable',null,{},[request ? error.code : 'verification_provider_unavailable']));
    }
  }
  status = (req: Request,res: Response) => this.respond(res,() => this.service.ownerStatus(req.user!.id));
  challenge = (req: Request,res: Response) => this.respond(res,() => this.service.startOwnerChallenge(req.user!.id,req.body),201);
  challengeStatus = (req: Request,res: Response) => this.respond(res,() => this.service.ownerChallengeStatus(req.user!.id,String(req.params.challengeId)));
  guardianList = (req: Request,res: Response) => this.respond(res,() => this.service.listGuardianAuthorizations(req.user!.id));
  guardianJourney = (req: Request,res: Response) => this.respond(res,() => this.service.startOwnerChallenge(req.user!.id,{...req.body,purpose:'guardian_authorization'}),201);
  withdraw = (req: Request,res: Response) => this.respond(res,() => this.service.withdrawGuardianAuthorization(req.user!.id,String(req.params.authorizationId)));
  callback = async (req: Request,res: Response) => {
    try {
      const raw = Buffer.isBuffer(req.body) ? req.body : undefined;
      const accepted = raw && await this.service.consumeCallback(raw,req.headers);
      return res.status(accepted ? 200 : 400).json(createResponse(accepted ? 'Verification received' : 'Verification rejected',null,{},accepted ? [] : ['verification_rejected']));
    } catch (_error) {
      // Raw provider material and thrown adapter/SQL causes never enter the
      // general error handler or request/profile/session payloads.
      return res.status(503).json(createResponse(new AssuranceUnavailableError().message,null,{},['verification_provider_unavailable']));
    }
  };
}
