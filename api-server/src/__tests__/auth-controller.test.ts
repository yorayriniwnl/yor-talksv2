import assert from "node:assert/strict";
import { after, test } from "node:test";
import type { Request, Response } from "express";
import { AuthController } from "../controllers/auth-controller.js";
import { AuthService, TwoFactorRequiredError } from "../services/auth-service.js";
import { RedisRepository } from "../repositories/redis-repository.js";
import { UserRepository } from "../repositories/user-repository.js";
import { pool } from "@workspace/db";
import { randomUUID } from "node:crypto";
import { EligibilityEnrollmentService } from "../services/eligibility-enrollment-service.js";
import { env } from "../config/env.js";

type CapturedResponse = Response & {
  statusCode: number;
  body: unknown;
  setCookie: { name: string; value: string; options: Record<string, unknown> } | null;
  clearedCookie: { name: string; options: Record<string, unknown> } | null;
};

const redisRepository = new RedisRepository();
after(async () => {
  await redisRepository.disconnect();
  await pool.end();
});

const makeResponse = () => {
  let statusCode = 200;
  let body: unknown;
  let setCookie: CapturedResponse["setCookie"] = null;
  let clearedCookie: { name: string; options: Record<string, unknown> } | null = null;

  const res = {
    get statusCode() {
      return statusCode;
    },
    set statusCode(value: number) {
      statusCode = value;
    },
    get body() {
      return body;
    },
    get setCookie() {
      return setCookie;
    },
    get clearedCookie() {
      return clearedCookie;
    },
    set body(value: unknown) {
      body = value;
    },
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(payload: unknown) {
      body = payload;
      return this;
    },
    cookie(name: string, value: string, options: Record<string, unknown>) {
      setCookie = { name, value, options };
      return this;
    },
    clearCookie(name: string, options: Record<string, unknown>) {
      clearedCookie = { name, options };
      return this;
    },
  } as unknown as CapturedResponse;

  return res;
};

test("auth controller returns success on register", async () => {
  const enrollmentService = {
    consumeAuthorizedEnrollment: async (enrollmentId: string) => ({ enrollmentId,experience: 'adult_18_plus' as const,territory: 'US',
      assessment: {} as never,guardianAuthorizations: [],policyVersions: {} }),
    bindAuthorizedEnrollment: async () => undefined,
  } as unknown as EligibilityEnrollmentService;
  const controller = new AuthController(new AuthService(new UserRepository(),redisRepository,undefined,undefined,enrollmentService));
  const unique = Date.now();
  const req = { body: { enrollmentId: randomUUID(),registrationNonce: randomUUID()+randomUUID(),username: `bob-${unique}`,
    email: `${String(unique).slice(-7)}@kiit.ac.in`,password: "supersecret",fullName: "Bob Example",acceptedTerms: true } } as Request;
  const res = makeResponse();

  await controller.register(req, res);

  assert.equal(res.statusCode, 201);
  assert.equal((res.body as { success: boolean }).success, true);
});

test("restricted login response omits ordinary profile fields", async () => {
  const user = { id: randomUUID(), username: "private-name", email: "private@example.test", passwordHash: "hash",
    fullName: "Private Name", bio: "Private Bio", avatarUrl: null, role: "user", permissions: [], createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z", totpSecret: null, settings: {} };
  const eligibility = { experience: "unknown", activated: false, capabilities: { social: false, publish: false, messaging: false,
    payments: false, seller: false, memberships: false, live: false, rtc: false, ai: false, analytics: false, profiling: false },
    maximumContentRating: "child_safe", policyVersions: [], revision: "private", reason: "verification_required", publicBrowsingAllowed: false };
  const controller = new AuthController({ login: async () => ({ user, eligibility, tokens: { accessToken: "access", refreshToken: "refresh" } }) } as unknown as AuthService);
  const response = makeResponse();
  await controller.login({ body: {} } as Request, response);
  assert.equal(response.statusCode, 200);
  const body = response.body as { data: { user: Record<string, unknown> } };
  assert.deepEqual(Object.keys(body.data.user).sort(), ["account", "eligibility", "security"]);
  assert.equal(JSON.stringify(body.data.user).includes("Private Name"), false);
  assert.equal(JSON.stringify(body.data.user).includes("private@example.test"), false);
});

test("auth controller returns a machine-readable two-factor challenge", async () => {
  const controller = new AuthController({
    login: async () => { throw new TwoFactorRequiredError("Two-factor authentication code required"); },
  } as unknown as AuthService);
  const req = { body: { identifier: "twofactor-user", password: "supersecret" } } as Request;
  const res = makeResponse();

  await controller.login(req, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual((res.body as { data: unknown }).data, { requiresTwoFactor: true });
  assert.equal((res.body as { meta: { requiresTwoFactor: boolean } }).meta.requiresTwoFactor, true);
});

test("auth controller includes the number-matching details", async () => {
  const controller = new AuthController({
    login: async () => {
      throw new TwoFactorRequiredError("Approve this sign-in in your Yor app", {
        challengeId: "3d6f2f91-32bb-45bc-bf1f-7f0e40a3b8a0",
        matchingNumber: 42,
        expiresAt: "2099-01-01T00:00:00.000Z",
      });
    },
  } as unknown as AuthService);
  const req = { body: { identifier: "twofactor-user", password: "supersecret" } } as Request;
  const res = makeResponse();

  await controller.login(req, res);

  assert.deepEqual((res.body as { data: unknown }).data, {
    requiresTwoFactor: true,
    challengeId: "3d6f2f91-32bb-45bc-bf1f-7f0e40a3b8a0",
    matchingNumber: 42,
    expiresAt: "2099-01-01T00:00:00.000Z",
  });
});

test("production login keeps the refresh token in a secure HttpOnly cookie", async () => {
  const previousEnvironment = env.NODE_ENV;
  const previousSameSite = env.AUTH_COOKIE_SAME_SITE;
  env.NODE_ENV = "production";
  env.AUTH_COOKIE_SAME_SITE = "lax";
  try {
    const controller = new AuthController({
      login: async () => ({
        user: {
          id: "test-user",
          username: "test-user",
          fullName: "Test User",
          bio: "",
          bioStyleId: null,
          avatarUrl: null,
          role: "user",
          createdAt: "2026-10-18T00:00:00.000Z",
          updatedAt: "2026-10-18T00:00:00.000Z",
          followerCount: 0,
          followingCount: 0,
          totpSecret: null,
        },
        eligibility: { activated: true },
        tokens: { accessToken: "test-access-token", refreshToken: "test-refresh-token" },
      }),
    } as unknown as AuthService);
    const res = makeResponse();

    await controller.login({ body: {} } as Request, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.setCookie?.name, "refreshToken");
    assert.equal(res.setCookie?.value, "test-refresh-token");
    assert.deepEqual(res.setCookie?.options, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    assert.equal("refreshToken" in (res.body as { data: { tokens: Record<string, unknown> } }).data.tokens, false);
  } finally {
    env.NODE_ENV = previousEnvironment;
    env.AUTH_COOKIE_SAME_SITE = previousSameSite;
  }
});

test("auth controller clears the refresh cookie even if server-side revocation fails", async () => {
  const controller = new AuthController({
    logoutByToken: async () => { throw new Error("Redis unavailable"); },
  } as unknown as AuthService);
  const req = { cookies: { refreshToken: "refresh-cookie" } } as unknown as Request;
  const res = makeResponse();

  await controller.logout(req, res);

  assert.equal(res.statusCode, 500);
  assert.equal(res.clearedCookie?.name, "refreshToken");
  assert.equal(res.clearedCookie?.options.path, "/");
});
