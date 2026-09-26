import assert from "node:assert/strict";
import { after, test } from "node:test";
import type { Request, Response } from "express";
import { AuthController } from "../controllers/auth-controller.js";
import { AuthService, TwoFactorRequiredError } from "../services/auth-service.js";
import { RedisRepository } from "../repositories/redis-repository.js";
import { UserRepository } from "../repositories/user-repository.js";
import { pool } from "@workspace/db";

type CapturedResponse = Response & {
  statusCode: number;
  body: unknown;
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
    clearCookie(name: string, options: Record<string, unknown>) {
      clearedCookie = { name, options };
      return this;
    },
  } as unknown as CapturedResponse;

  return res;
};

test("auth controller returns success on register", async () => {
  const controller = new AuthController(new AuthService(new UserRepository(), redisRepository));
  const unique = Date.now();
  const req = { body: { username: `bob-${unique}`, email: `${String(unique).slice(-7)}@kiit.ac.in`, password: "supersecret", fullName: "Bob Example", acceptedTerms: true, confirmedAge: true } } as Request;
  const res = makeResponse();

  await controller.register(req, res);

  assert.equal(res.statusCode, 201);
  assert.equal((res.body as { success: boolean }).success, true);
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
