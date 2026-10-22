import { type Request, type Response } from "express";
import { privacyRightsService, type PrivacyRequestType } from "../services/privacy-rights-service.js";
import { emailSuppressionService } from "../services/email-suppression-service.js";
import { consentService } from "../services/consent-service.js";
import { createResponse } from "../utils/response.js";
import { z } from "zod";

const challengeSchema = z.object({
  email: z.string().email().max(255),
  purpose: z.enum(["correction", "restriction", "objection", "erasure", "access"]).optional(),
}).strict();

const rightsRequestSchema = z.object({
  token: z.string().regex(/^[a-f0-9]{64}$/),
  requestType: z.enum(["correction", "restriction", "objection", "erasure", "access"]),
  details: z.object({
    reason: z.string().trim().max(500).optional(),
    preferredUsername: z.string().trim().regex(/^[a-zA-Z0-9_][a-zA-Z0-9_-]{2,23}$/).optional(),
  }).strict().optional(),
}).strict();

const unsubscribeSchema = z.object({
  email: z.string().email(),
  token: z.string().min(10),
  purpose: z.string().optional(),
});

export class PrivacyController {
  constructor(
    private readonly service = privacyRightsService,
    private readonly suppression = emailSuppressionService,
    private readonly consent = consentService
  ) {}

  /**
   * POST /api/privacy/challenge
   * Generates cryptographic verification challenge sent via email.
   * Generic 200 response ensures knowledge of email never discloses account existence.
   */
  requestChallenge = async (req: Request, res: Response) => {
    const parse = challengeSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json(
        createResponse("Invalid request parameters", null, {}, parse.error.errors.map((e) => e.message))
      );
    }

    try { await this.service.initiateChallenge(parse.data.email, parse.data.purpose as PrivacyRequestType); }
    catch { return res.status(503).json(createResponse('Privacy requests are temporarily unavailable', null, {}, ['privacy_unavailable'])); }

    // Explicit generic response to prevent email enumeration
    return res.status(200).json(
      createResponse(
        "If records exist for this address, a secure verification link has been sent.",
        { initiated: true }
      )
    );
  };

  verifyChallenge = async (req: Request,res: Response) => {
    const parsed=z.object({token:z.string().regex(/^[a-f0-9]{64}$/)}).strict().safeParse(req.body);
    if (!parsed.success) return res.status(400).json(createResponse('Invalid verification challenge',null,{},['invalid_challenge']));
    try {
      const verified=await this.service.verifyChallengeToken(parsed.data.token);
      if (!verified.valid) return res.status(400).json(createResponse('Invalid or expired verification challenge',{valid:false}));
      return res.status(200).json(createResponse('Verification challenge is valid',{valid:true,purpose:verified.purpose}));
    } catch { return res.status(503).json(createResponse('Privacy requests are temporarily unavailable',null,{},['privacy_unavailable'])); }
  };

  /**
   * POST /api/privacy/request
   * Submits a verified rights request (correction, restriction, objection, erasure, access)
   */
  submitRequest = async (req: Request, res: Response) => {
    const parse = rightsRequestSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json(
        createResponse("Invalid request parameters", null, {}, parse.error.errors.map((e) => e.message))
      );
    }

    let result;
    try { result = await this.service.executeRightsRequest({
      token: parse.data.token,
      requestType: parse.data.requestType,
      details: parse.data.details,
    }); } catch { return res.status(503).json(createResponse('Privacy requests are temporarily unavailable', null, {}, ['privacy_unavailable'])); }

    if (!result.executed && result.recordStatus === "active_account_requires_authenticated_deletion") {
      return res.status(409).json(createResponse(result.message, result, {}, ["authenticated_login_required"]));
    }

    if (!result.executed) {
      return res.status(400).json(createResponse(result.message, result, {}, ["request_execution_failed"]));
    }

    return res.status(200).json(createResponse(result.message, result));
  };

  /**
   * GET /api/launch/unsubscribe and POST /api/launch/unsubscribe
   * One-click or form-based unsubscribe handling with cryptographic token
   */
  unsubscribe = async (req: Request, res: Response) => {
    const input = req.method === "GET" ? req.query : req.body;
    const parse = unsubscribeSchema.safeParse(input);
    if (!parse.success) {
      return res.status(400).json(
        createResponse("Invalid unsubscribe request", null, {}, parse.error.errors.map((e) => e.message))
      );
    }

    const { email, token, purpose = "launch_updates" } = parse.data;
    const verified = this.suppression.verifyUnsubscribeToken(email, token);
    if (!verified.valid) {
      return res.status(403).json(
        createResponse("Invalid or forged unsubscribe token", null, {}, ["invalid_unsubscribe_token"])
      );
    }

    await this.suppression.suppressEmail(email, verified.purpose || purpose, "user_unsubscribe");

    if (req.method === "GET" && req.accepts("html") && !req.accepts("json")) {
      return res.status(200).send(`
        <!doctype html>
        <html>
          <head><title>Unsubscribed — Yor Talks</title><meta name="viewport" content="width=device-width, initial-scale=1"></head>
          <body style="background:#07080b;color:#f3f4f6;font-family:sans-serif;padding:48px 24px;text-align:center;">
            <h1 style="color:#fb7185;">Unsubscribed</h1>
            <p style="color:#a5aab5;">You will no longer receive launch updates or promotional emails from Yor Talks.</p>
          </body>
        </html>
      `);
    }

    return res.status(200).json(
      createResponse("You have been unsubscribed from promotional updates.", { unsubscribed: true, email })
    );
  };

  /**
   * POST /api/users/me/restriction
   * Authenticated user requests processing restriction
   */
  restrictMe = async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json(createResponse("Unauthorized", null));

    const parsed = z.object({ reason: z.string().trim().max(500).optional() }).strict().safeParse(req.body ?? {});
    if (!parsed.success) return res.status(400).json(createResponse('Invalid restriction request', null));
    const reason = parsed.data.reason ?? 'user_request';
    await this.service.restrictAccount(userId, reason);

    return res.status(200).json(
      createResponse("Processing restriction has been enabled on your account.", {
        processingRestricted: true,
        reason,
      })
    );
  };

  /**
   * DELETE /api/users/me/restriction
   * Authenticated user lifts processing restriction
   */
  unrestrictMe = async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json(createResponse("Unauthorized", null));

    await this.service.unrestrictAccount(userId);

    return res.status(200).json(
      createResponse("Processing restriction has been lifted.", { processingRestricted: false })
    );
  };

  /**
   * POST /api/users/me/consent-withdrawal
   * Authenticated user withdraws consent for specific purpose
   */
  withdrawConsent = async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json(createResponse("Unauthorized", null));

    const parsed = z.object({ purpose: z.string().regex(/^[a-z][a-z0-9_]{0,79}$/).default('launch_updates') }).strict().safeParse(req.body ?? {});
    if (!parsed.success) return res.status(400).json(createResponse('Invalid consent withdrawal request', null));
    const purpose = parsed.data.purpose;
    if (!await this.service.withdrawAccountConsent(userId, purpose)) return res.status(404).json(createResponse('Account is unavailable', null));

    return res.status(200).json(
      createResponse(`Consent for ${purpose} has been successfully withdrawn.`, { withdrawn: true, purpose })
    );
  };
}

export const privacyController = new PrivacyController();
