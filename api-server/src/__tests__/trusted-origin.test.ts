import assert from "node:assert/strict";
import test from "node:test";
import type { NextFunction, Request, Response } from "express";
import { requireTrustedOrigin } from "../middlewares/trusted-origin.js";

function invoke(origin?: string) {
  let nextCalled = false;
  let statusCode = 200;
  let body: unknown;
  const req = { get: (header: string) => header.toLowerCase() === "origin" ? origin : undefined } as Request;
  const res = {
    status(code: number) { statusCode = code; return this; },
    json(value: unknown) { body = value; return this; },
  } as unknown as Response;
  requireTrustedOrigin(req, res, (() => { nextCalled = true; }) as NextFunction);
  return { nextCalled, statusCode, body };
}

test("trusted origin middleware accepts configured and non-browser callers", () => {
  assert.equal(invoke().nextCalled, true);
  assert.equal(invoke("http://localhost:5173").nextCalled, true);
});

test("trusted origin middleware rejects an unconfigured browser origin", () => {
  const result = invoke("https://attacker.example");
  assert.equal(result.nextCalled, false);
  assert.equal(result.statusCode, 403);
  assert.match(JSON.stringify(result.body), /Forbidden origin/);
});
