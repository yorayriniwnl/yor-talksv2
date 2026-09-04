import assert from "node:assert/strict";
import { test } from "node:test";
import type { Request, Response } from "express";
import { AuthController } from "../controllers/auth-controller.js";

function makeResponse() {
  let statusCode = 200;
  let body: unknown;
  return {
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(payload: unknown) {
      body = payload;
      return this;
    },
    get result() {
      return { statusCode, body };
    },
  } as unknown as Response & { result: { statusCode: number; body: unknown } };
}

test("login reports database outages as service unavailable", async () => {
  const databaseError = Object.assign(new Error("Failed query"), {
    cause: Object.assign(new Error("connect ECONNREFUSED 127.0.0.1:5432"), { code: "ECONNREFUSED" }),
  });
  const controller = new AuthController({
    login: async () => { throw databaseError; },
  } as never);
  const response = makeResponse();

  await controller.login({ body: { identifier: "demo", password: "password123" } } as Request, response);

  assert.equal(response.result.statusCode, 503);
  assert.deepEqual((response.result.body as { errors: string[] }).errors, ["auth_service_unavailable"]);
});

test("login preserves invalid-credential responses for ordinary auth failures", async () => {
  const controller = new AuthController({
    login: async () => { throw new Error("Invalid credentials"); },
  } as never);
  const response = makeResponse();

  await controller.login({ body: { identifier: "demo", password: "wrong" } } as Request, response);

  assert.equal(response.result.statusCode, 401);
  assert.deepEqual((response.result.body as { errors: string[] }).errors, ["Invalid credentials"]);
});
