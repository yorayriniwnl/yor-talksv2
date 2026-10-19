import { type Request, type Response } from "express";
import { privacyRightsService, type PrivacyRequestType } from "../services/privacy-rights-service.js";
import { emailSuppressionService } from "../services/email-suppression-service.js";
import { consentService } from "../services/consent-service.js";
import { createResponse } from "../utils/response.js";
import { z } from "zod";

const challengeSchema = z.object({
  email: z.string().email().max(255),
  purpose: z.enum(["correction", "restriction", "objection", "erasure", "access"]).optional(),
});

const rightsRequestSchema = z.object({
  token: z.string().min(32).max(256),
  requestType: z.enum(["correction", "restriction", "objection", "erasure", "access"]),
  details: z.record(z.unknown()).optional(),
});

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

    await this.service.initiateChallenge(parse.data.email, parse.data.purpose as PrivacyRequestType);

    // Explicit generic response to prevent email enumeration
    return res.status(200).json(
      createResponse(
        "If records exist for this address, a secure verification link has been sent.",
        { initiated: true }
      )
    );
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

    const result = await this.service.executeRightsRequest({
      token: parse.data.token,
      requestType: parse.data.requestType,
      details: parse.data.details,
    });

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

    const reason = typeof req.body?.reason === "string" ? req.body.reason : "user_request";
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
    const userEmail = (req as any).user?.email;
    if (!userId) return res.status(401).json(createResponse("Unauthorized", null));

    const purpose = typeof req.body?.purpose === "string" ? req.body.purpose : "launch_updates";
    await this.consent.withdrawConsent({ subjectId: userId, email: userEmail, purpose });
    if (purpose === "launch_updates" || purpose === "all_promotional") {
      if (userEmail) await this.suppression.suppressEmail(userEmail, purpose, "user_consent_withdrawal");
    }

    return res.status(200).json(
      createResponse(`Consent for ${purpose} has been successfully withdrawn.`, { withdrawn: true, purpose })
    );
  };
}

export const privacyController = new PrivacyController();
