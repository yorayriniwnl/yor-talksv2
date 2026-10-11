import assert from "node:assert/strict";
import { test } from "node:test";
import type { Request, Response } from "express";
import { AuthController } from "../controllers/auth-controller.js";
import { EligibilityService } from "../services/eligibility-service.js";
import type { AuthService } from "../services/auth-service.js";
import { env } from "../config/env.js";
import type { UserRecord } from "../types/index.js";

test("login returns the restricted owner view until current eligibility activates the account", async (t) => {
  const original = { NODE_ENV: env.NODE_ENV, PUBLIC_BETA: env.PUBLIC_BETA };
  Object.assign(env, { NODE_ENV: "production", PUBLIC_BETA: false });
  t.after(() => Object.assign(env, original));
  t.mock.method(EligibilityService.prototype, "decisionFor", async () => ({
    experience: "unknown", activated: false,
    capabilities: { social: false, publish: false, messaging: false, payments: false, seller: false,
      memberships: false, live: false, rtc: false, ai: false, analytics: false, profiling: false },
    maximumContentRating: "child_safe", policyVersions: [], revision: "1", reason: "verification_required",
    publicBrowsingAllowed: false,
  }));

  const user = {
    id: "10000000-0000-4000-8000-000000000098", username: "pending_account", email: "pending@example.test",
    fullName: "Pending Account", bio: "Private profile text", role: "user", permissions: ["read:profile"],
    accountStatus: "active", termsVersion: env.TERMS_VERSION, termsAcceptedAt: "2026-08-31T00:00:00.000Z",
    ageConfirmedAt: "2026-08-31T00:00:00.000Z", createdAt: "2026-08-31T00:00:00.000Z",
    updatedAt: "2026-08-31T00:00:00.000Z", settings: {}, followerCount: 12, followingCount: 9,
  } as unknown as UserRecord;
  const controller = new AuthController({
    login: async () => ({ user, tokens: { accessToken: "access", refreshToken: "refresh" } }),
  } as unknown as AuthService);
  const response = {
    statusCode: 200,
    status(code: number) { this.statusCode = code; return this; },
    json(body: unknown) { (this as any).body = body; return this; },
    cookie() { return this; },
  } as unknown as Response & { statusCode: number; body: any };

  await controller.login({ body: { identifier: user.email, password: "password123" } } as Request, response);

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.data.user.restricted, true);
  assert.equal(response.body.data.user.eligibility.activated, false);
  assert.equal(response.body.data.user.email, user.email);
  assert.equal(response.body.data.user.bio, undefined);
});
