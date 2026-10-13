import type { Request, Response } from 'express';
import { AssuranceUnavailableError } from '../eligibility/assurance-adapter.js';
import { AssuranceRequestError, AssuranceService } from '../services/assurance-service.js';
import { EligibilityEnrollmentService, EnrollmentUnavailableError } from '../services/eligibility-enrollment-service.js';
import { createResponse } from '../utils/response.js';

export class EligibilityController {
  constructor(private readonly service: AssuranceService,private readonly enrollments = new EligibilityEnrollmentService(service)) {}
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
  prescreen = async (req: Request,res: Response) => {
    res.setHeader('Cache-Control','no-store');
    try {
      const status = await this.enrollments.prescreen(req.body);
      return res.status(200).json(createResponse(status.status==='unavailable' ? 'Enrollment is not available for this territory' : 'Continue with the listed verification step',status));
    } catch {
      return res.status(503).json(createResponse('Enrollment is temporarily unavailable',null,{},['enrollment_unavailable']));
    }
  };
  enrollmentStatus = async (req: Request,res: Response) => {
    res.setHeader('Cache-Control','no-store');
    try {
      const status = await this.enrollments.status(String(req.params.enrollmentId),req.body.registrationNonce);
      if (!status) return res.status(404).json(createResponse('Enrollment unavailable',null,{},['enrollment_unavailable']));
      return res.status(200).json(createResponse('Enrollment status loaded',status));
    } catch {
      return res.status(503).json(createResponse('Enrollment status is temporarily unavailable',null,{},['enrollment_unavailable']));
    }
  };
  enrollmentChallenge = async (req: Request,res: Response) => {
    res.setHeader('Cache-Control','no-store');
    try {
      const { registrationNonce,purpose } = req.body;
      const result = await this.enrollments.startChallenge(String(req.params.enrollmentId),registrationNonce,purpose);
      return res.status(201).json(createResponse('Continue with the listed verification step',result));
    } catch (error) {
      const unavailable = error instanceof EnrollmentUnavailableError || error instanceof AssuranceUnavailableError;
      return res.status(unavailable ? 503 : 403).json(createResponse('Verification step is unavailable',null,{},[unavailable ? 'enrollment_unavailable' : 'verification_unavailable']));
    }
  };
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
