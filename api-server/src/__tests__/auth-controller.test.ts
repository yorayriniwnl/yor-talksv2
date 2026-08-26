import assert from "node:assert/strict";
import { after, test } from "node:test";
import type { Request, Response } from "express";
import { AuthController } from "../controllers/auth-controller.js";
import { AuthService, TwoFactorRequiredError } from "../services/auth-service.js";
import { RedisRepository } from "../repositories/redis-repository.js";
import { UserRepository } from "../repositories/user-repository.js";
import { pool } from "@workspace/db";

const redisRepository = new RedisRepository();
after(async () => {
  await redisRepository.disconnect();
  await pool.end();
});

const makeResponse = () => {
  let statusCode = 200;
  let body: unknown;

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
  } as unknown as Response & { statusCode: number; body: unknown };

  return res;
};

test("auth controller returns success on register", async () => {
  const controller = new AuthController(new AuthService(new UserRepository(), redisRepository));
  const unique = Date.now();
  const req = { body: { username: `bob-${unique}`, email: `${String(unique).slice(-7)}@kiit.ac.in`, password: "supersecret", fullName: "Bob Example" } } as Request;
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
