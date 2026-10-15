import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";
import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import type { AddressInfo } from "node:net";
import { env } from "../config/env.js";
import { isRestrictedRightsRouteAllowed, isRestrictedRouteAllowed } from "../eligibility/restricted-routes.js";
import { EligibilityRepository } from "../repositories/eligibility-repository.js";
import { RedisRepository } from "../repositories/redis-repository.js";
import { UserRepository } from "../repositories/user-repository.js";
import { authenticate, closeAuthDependencies, optionalAuthenticate } from "../middlewares/auth.js";
import { UserController } from "../controllers/user-controller.js";
import type { EligibilityFacts } from "../eligibility/types.js";
import type { EligibilityDecision } from "../eligibility/types.js";
import type { UserRecord } from "../types/index.js";
import { AuthService } from "../services/auth-service.js";
import { createTestUser } from "./test-helpers.js";
import { hasCurrentConsent } from "../utils/consent.js";
import { acceptTermsSchema } from "../validators/auth.js";

const challengeId = "3d6f2f91-32bb-45bc-bf1f-7f0e40a3b8a0";
const authorizationId = "f7e84dc2-b302-4a80-9038-c1750bad7e8f";
const userId = "f01a0d44-2ef6-4a87-8d8f-0ff43f9944e5";
const hasDisposableServices = (process.env.CI === "true" && Boolean(process.env.DATABASE_URL && process.env.REDIS_URL))
  || Boolean(process.env.TEST_DATABASE_URL && process.env.DATABASE_URL === process.env.TEST_DATABASE_URL
    && process.env.TEST_REDIS_URL && process.env.REDIS_URL === process.env.TEST_REDIS_URL);
const allowed = [
  ["GET", "/users/me"],
  ["POST", "/users/me/consent"],
  ["GET", "/users/me/eligibility"],
  ["POST", "/users/me/eligibility/challenges"],
  ["GET", `/users/me/eligibility/challenges/${challengeId}`],
  ["POST", "/users/me/guardian-authorizations"],
  ["GET", "/users/me/guardian-authorizations"],
  ["POST", `/users/me/guardian-authorizations/${authorizationId}/withdraw`],
  ["POST", "/auth/verify-email/resend"],
  ["POST", "/auth/2fa/setup"],
  ["POST", "/auth/2fa/confirm"],
  ["POST", "/auth/2fa/disable"],
  ["GET", "/auth/2fa/challenges"],
  ["POST", `/auth/2fa/challenges/${challengeId}/approve`],
  ["POST", `/auth/2fa/challenges/${challengeId}/deny`],
  ["GET", "/users/me/export"],
  ["DELETE", "/users/me"],
  ["POST", "/auth/logout"],
  ["POST", "/auth/logout-all"],
] as const;

test("restricted route matrix is exact across both API mounts", () => {
  for (const [method, path] of allowed) {
    for (const prefix of ["/api", "/api/v1"]) {
      assert.equal(isRestrictedRouteAllowed(method, `${prefix}${path}?cursor=next`), true, `${method} ${prefix}${path}`);
      assert.equal(isRestrictedRouteAllowed(method, `${prefix}${path}/extra`), false, `${method} ${prefix}${path}/extra`);
      for (const candidate of ["GET", "POST", "PUT", "PATCH", "DELETE"]) {
        const expected = allowed.some(([allowedMethod, allowedPath]) => allowedMethod === candidate && allowedPath === path);
        assert.equal(isRestrictedRouteAllowed(candidate, `${prefix}${path}`), expected, `${candidate} ${prefix}${path}`);
      }
    }
  }

  assert.equal(isRestrictedRouteAllowed("POST", "/api/v1/users/me/export"), false);
  assert.equal(isRestrictedRouteAllowed("GET", "/api/users/me/exported"), false);
  assert.equal(isRestrictedRouteAllowed("GET", `/api/users/me/eligibility/challenges/${challengeId}%2fextra`), false);
  assert.equal(isRestrictedRouteAllowed("GET", "/api/users/me/eligibility/challenges/not-a-uuid"), false);
  assert.equal(isRestrictedRouteAllowed("POST", `/api/v1/users/me/guardian-authorizations/${authorizationId.slice(0, -1)}z/withdraw`), false);
  assert.equal(isRestrictedRouteAllowed("GET", "/api/v10/users/me"), false);
  assert.equal(isRestrictedRouteAllowed("GET", "/api//users/me"), false);
  assert.equal(isRestrictedRightsRouteAllowed("GET", "/api/v1/users/me/export"), true);
  assert.equal(isRestrictedRightsRouteAllowed("GET", "/api/v1/users/me/eligibility"), false);
});

test("current terms acknowledgement does not use the legacy age checkbox as proof", () => {
  const original = env.PUBLIC_BETA;
  env.PUBLIC_BETA = true;
  try {
    assert.equal(acceptTermsSchema.safeParse({ acceptedTerms: true, confirmedAge: false }).success, true);
    assert.equal(hasCurrentConsent({ termsVersion: env.TERMS_VERSION, termsAcceptedAt: new Date().toISOString(), ageConfirmedAt: null }), true);
    assert.equal(hasCurrentConsent({ termsVersion: "old", termsAcceptedAt: new Date().toISOString() }), false);
  } finally {
    env.PUBLIC_BETA = original;
  }
});

test("password login and refresh preserve identity sessions while eligibility is restricted", async () => {
  const user = {
    id: userId, username: "restricted", email: "3000001@kiit.ac.in", passwordHash: await bcrypt.hash("Synthetic-Password1!", 4),
    fullName: "Private Name", bio: "Private Bio", avatarUrl: null, role: "user", permissions: [], authVersion: 4,
    accountStatus: "active", emailVerified: true, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z",
    settings: { theme: "light", notificationsEnabled: false, privateAccount: true }, totpSecret: null,
  } as UserRecord;
  const sessions = new Map<string, string>();
  let decisionReads = 0;
  const userRepository = {
    findByEmail: async () => user,
    findByUsername: async () => undefined,
    findById: async () => user,
    recordLogin: async (record: UserRecord) => record,
    getOwnRelationships: async () => ({}),
  };
  const redisRepository = {
    setStrict: async (key: string, value: string) => { sessions.set(key, value); },
    getStrict: async (key: string) => sessions.get(key) ?? null,
    hashToken: async (value: string) => createHash("sha256").update(value).digest("hex"),
    rotateValueStrict: async (key: string, expected: string, replacement: string) => {
      if (sessions.get(key) !== expected) return false;
      sessions.set(key, replacement);
      return true;
    },
  };
  const eligibility: EligibilityDecision = {
    experience: "unknown", activated: false, capabilities: { social: false, publish: false, messaging: false, payments: false,
      seller: false, memberships: false, live: false, rtc: false, ai: false, analytics: false, profiling: false },
    maximumContentRating: "child_safe", policyVersions: [], revision: "private", reason: "account_restricted", publicBrowsingAllowed: false,
  };
  const eligibilityService = { decisionFor: async () => {
    decisionReads++;
    return { ...eligibility, reason: user.accountStatus === "active" ? "verification_required" : "account_restricted" };
  } };
  const securityService = { detectAbuse: async () => false, createAuditEvent: () => undefined };
  const service = new AuthService(userRepository as never, redisRepository as never, securityService as never, {} as never,
    {} as never, undefined, undefined, eligibilityService as never);

  const session = await service.login({ identifier: user.email, password: "Synthetic-Password1!" });
  assert.equal(session.eligibility.reason, "verification_required");
  assert.ok(session.tokens.accessToken);
  assert.equal(decisionReads, 1);
  const refreshed = await service.refreshAccessToken(session.tokens.refreshToken);
  assert.ok(refreshed, "restricted identity session can refresh after a current decision check");
  assert.equal(decisionReads, 2);

  user.accountStatus = "suspended";
  assert.equal((await service.login({ identifier: user.email, password: "Synthetic-Password1!" })).eligibility.reason, "account_restricted");
  user.accountStatus = "deactivated";
  assert.equal((await service.login({ identifier: user.email, password: "Synthetic-Password1!" })).eligibility.reason, "account_restricted");
  user.accountStatus = "deleted";
  await assert.rejects(() => service.login({ identifier: user.email, password: "Synthetic-Password1!" }), /Account is unavailable/);
  assert.equal(decisionReads, 4, "deleted accounts do not reach eligibility or session creation");
});

test("HTTP authentication grants only identity and rights routes to restricted accounts", async t => {
  let accountStatus = "active";
  let authVersion = 4;
  let factReads = 0;
  let factsUnavailable = false;
  let proofExpired = false;
  t.mock.method(RedisRepository.prototype, "getStrict", async () => "active-session");
  t.mock.method(UserRepository.prototype, "findById", async (id: string) => id === userId ? ({
    id, username: "restricted", email: "restricted@example.test", passwordHash: "hash", role: "user", permissions: [],
    fullName: "Private Name", bio: "Private Bio", avatarUrl: null, accountStatus, authVersion, emailVerified: true,
    createdAt: "2026-01-01T00:00:00.000Z", settings: {}, totpSecret: null,
  } as never) : undefined);
  t.mock.method(EligibilityRepository.prototype, "readFacts", async () => {
    factReads++;
    if (factsUnavailable) throw new Error("database unavailable");
    return {
      account: { id: userId, status: accountStatus, termsVersion: null, termsAcceptedAt: null, contentPreference: "child_safe" },
      revision: String(factReads), guardianAuthorizations: [],
      ...(proofExpired ? { assessment: { id: "expired-proof", userId, status: "expired", issuer: "fixture", method: "fixture",
        experience: "adult_18_plus", thresholds: [], territory: "US", policyVersions: {}, verifiedAt: "2025-01-01T00:00:00.000Z",
        expiresAt: "2025-01-02T00:00:00.000Z", evidenceReference: null } } : {}),
    } as EligibilityFacts;
  });

  const app = express();
  const userController = new UserController({
    getOwnAccount: async () => ({ id: userId, emailVerified: true, createdAt: "2026-01-01T00:00:00.000Z", accountStatus, totpSecret: null }),
  } as never, {} as never, {} as never);
  app.get("/api/users/me", authenticate, userController.getCurrentUser);
  app.get("/api/users/me/export", authenticate, (req, res) => res.json({ id: req.user?.id, activated: req.eligibility?.activated }));
  app.get("/api/users/me/eligibility", authenticate, (req, res) => res.json({ role: req.user?.role }));
  app.post("/api/reports", authenticate, (_req, res) => res.sendStatus(201));
  app.get("/api/v1/users/me/export", authenticate, (req, res) => res.json({ id: req.user?.id, activated: req.eligibility?.activated }));
  app.post("/api/users/me/eligibility/challenges", authenticate, (_req, res) => res.sendStatus(200));
  app.post("/api/v1/posts", authenticate, (_req, res) => res.sendStatus(201));
  app.post("/api/users/me/consent", authenticate, (_req, res) => res.sendStatus(200));
  app.get("/public", optionalAuthenticate, (req, res) => res.json({ personalized: Boolean(req.user), eligibility: Boolean(req.eligibility) }));

  const server = await new Promise<ReturnType<typeof app.listen>>(resolve => {
    const listening = app.listen(0, "127.0.0.1", () => resolve(listening));
  });
  t.after(() => new Promise<void>((resolve, reject) => {
    server.closeAllConnections();
    server.close(error => error ? reject(error) : resolve());
  }));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const accessToken = () => jwt.sign({ sub: userId, type: "access", authVersion: 4, deviceId: "device-1", role: "admin", permissions: ["admin"] }, env.JWT_SECRET, { expiresIn: "10m" });
  const headers = () => ({ authorization: `Bearer ${accessToken()}` });

  const exportResponse = await fetch(`${base}/api/users/me/export`, { headers: headers() });
  assert.equal(exportResponse.status, 200);
  assert.deepEqual(await exportResponse.json(), { id: userId, activated: false });
  assert.equal((await fetch(`${base}/api/v1/posts`, { method: "POST", headers: headers() })).status, 403);
  assert.equal((await fetch(`${base}/api/users/me/eligibility/challenges`, { method: "POST", headers: headers() })).status, 200);
  assert.equal(factReads, 3, "each authenticated request reloads current private eligibility facts");
  const eligibilityResponse = await fetch(`${base}/api/users/me/eligibility`, { headers: headers() });
  assert.deepEqual(await eligibilityResponse.json(), { role: "user" }, "JWT role and permission claims are ignored");
  assert.equal((await fetch(`${base}/api/reports`, { method: "POST", headers: headers() })).status, 201,
    "the safety reporting route is available without social activation");
  const meResponse = await fetch(`${base}/api/users/me`, { headers: headers() });
  assert.equal(meResponse.status, 200);
  const meBody = await meResponse.json() as { data: Record<string, unknown> };
  assert.deepEqual(Object.keys(meBody.data).sort(), ["account", "eligibility", "security"]);
  assert.equal("username" in meBody.data, false);
  proofExpired = true;
  assert.equal((await fetch(`${base}/api/users/me/export`, { headers: headers() })).status, 200, "an expired proof remains identity-only");
  proofExpired = false;

  accountStatus = "suspended";
  assert.equal((await fetch(`${base}/api/v1/users/me/export`, { headers: headers() })).status, 200);
  assert.equal((await fetch(`${base}/api/users/me/eligibility/challenges`, { method: "POST", headers: headers() })).status, 403);
  accountStatus = "deactivated";
  assert.equal((await fetch(`${base}/api/users/me/export`, { headers: headers() })).status, 200);
  accountStatus = "deleted";
  assert.equal((await fetch(`${base}/api/users/me/export`, { headers: headers() })).status, 401);

  accountStatus = "active";
  authVersion = 5;
  assert.equal((await fetch(`${base}/api/users/me/export`, { headers: headers() })).status, 401, "authVersion revokes existing sessions");

  authVersion = 4;
  const publicResults = await Promise.all([
    fetch(`${base}/public`),
    fetch(`${base}/public`, { headers: { authorization: "Bearer malformed" } }),
    fetch(`${base}/public`, { headers: { authorization: `Bearer ${jwt.sign({ sub: userId, type: "access", authVersion: 4, deviceId: "device-1" }, env.JWT_SECRET, { expiresIn: -1 })}` } }),
    fetch(`${base}/public`, { headers: headers() }),
  ]);
  const publicBodies = await Promise.all(publicResults.map(response => response.json()));
  assert.deepEqual(publicBodies, [
    { personalized: false, eligibility: false },
    { personalized: false, eligibility: false },
    { personalized: false, eligibility: false },
    { personalized: false, eligibility: false },
  ]);

  factsUnavailable = true;
  assert.equal((await fetch(`${base}/public`, { headers: headers() })).status, 503);
});

test("real database and Redis sessions recheck moderation, auth epoch and device revocation",
  { skip: !hasDisposableServices }, async t => {
    const users = new UserRepository();
    const redis = new RedisRepository();
    const user = await createTestUser(users, { emailVerified: true });
    const deviceId = "restricted-session-device";
    const sessionKey = `session:${user.id}:${deviceId}`;
    let server: ReturnType<ReturnType<typeof express>['listen']> | undefined;
    t.after(async () => {
      if (server) await new Promise<void>(resolve => { server!.closeAllConnections(); server!.close(() => resolve()); });
      await redis.delStrict(sessionKey).catch(() => undefined);
      await users.deleteById(user.id).catch(() => undefined);
      await redis.disconnect();
      await closeAuthDependencies();
    });

    await redis.setStrict(sessionKey, "active-session", 600);
    const accessToken = (authVersion: number) => jwt.sign({ sub: user.id, type: "access", authVersion, deviceId }, env.JWT_SECRET, { expiresIn: "10m" });
    const app = express();
    app.get("/api/users/me/export", authenticate, (_req, res) => res.sendStatus(200));
    app.post("/api/v1/users/me/eligibility/challenges", authenticate, (_req, res) => res.sendStatus(200));
    app.post("/api/v1/posts", authenticate, (_req, res) => res.sendStatus(201));
    server = app.listen(0, "127.0.0.1");
    await new Promise<void>(resolve => server!.once("listening", resolve));
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const request = (path: string, token: string, method = "GET") => fetch(`${base}${path}`, {
      method, headers: { authorization: `Bearer ${token}` },
    });
    const token = accessToken(user.authVersion ?? 0);

    assert.equal((await request("/api/v1/posts", token, "POST")).status, 403, "missing assessment remains restricted");
    assert.equal((await request("/api/users/me/export", token)).status, 200, "rights export remains available");
    assert.equal((await request("/api/v1/users/me/eligibility/challenges", token, "POST")).status, 200);

    await users.update(user.id, { accountStatus: "suspended" });
    assert.equal((await request("/api/users/me/export", token)).status, 200, "suspended account retains rights access");
    assert.equal((await request("/api/v1/users/me/eligibility/challenges", token, "POST")).status, 403,
      "moderation restriction cannot be cleared through assurance");

    await users.revokeAllCredentials(user.id);
    assert.equal((await request("/api/users/me/export", token)).status, 401, "authVersion change revokes without relogin");
    const latest = await users.findById(user.id);
    assert.ok(latest);
    const currentEpochToken = accessToken(latest.authVersion ?? 0);
    await redis.delStrict(sessionKey);
    assert.equal((await request("/api/users/me/export", currentEpochToken)).status, 401, "Redis device revocation is current");

    await redis.setStrict(sessionKey, "active-session", 600);
    await users.update(user.id, { accountStatus: "deleted" });
    assert.equal((await request("/api/users/me/export", currentEpochToken)).status, 401, "deleted accounts cannot obtain sessions");
  });
