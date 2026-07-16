import assert from "node:assert/strict";
import { test } from "node:test";
import type { Request, Response } from "express";
import { AuthController } from "../controllers/auth-controller.js";
import { AuthService } from "../services/auth-service.js";
import { RedisRepository } from "../repositories/redis-repository.js";
import { UserRepository } from "../repositories/user-repository.js";

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
  const controller = new AuthController(new AuthService(new UserRepository(), new RedisRepository()));
  const req = { body: { username: "bob", email: "bob@example.com", password: "supersecret", fullName: "Bob Example" } } as Request;
  const res = makeResponse();

  await controller.register(req, res);

  assert.equal(res.statusCode, 201);
  assert.equal((res.body as { success: boolean }).success, true);
});
