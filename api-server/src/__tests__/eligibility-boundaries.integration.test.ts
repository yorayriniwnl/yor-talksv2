import assert from "node:assert/strict";
import { test } from "node:test";
import type { Request, Response } from "express";
import { apiRouteCatalog } from "../docs/routes.generated.js";
import { classifyApiRoute, enforceRouteAuthority, isApiRouteCapabilityMapped, unmappedAuthenticatedCatalogRoutes } from "../eligibility/route-capabilities.js";
import { requireCapability } from "../middlewares/eligibility.js";
import { SOCKET_CLIENT_EVENTS, SOCKET_EVENT_CAPABILITIES } from "../socket/policy.js";

const UUID = "3d6f2f91-32bb-45bc-bf1f-7f0e40a3b8a0";

test("every generated authenticated operation has a reviewed capability or exact authority", () => {
  assert.deepEqual(unmappedAuthenticatedCatalogRoutes().map(route => route.operationId), []);
  for (const route of apiRouteCatalog.filter(route => route.authenticated)) {
    const path = route.path.replace(/\{[^/]+\}/g, UUID);
    assert.ok(classifyApiRoute(route.method, `/api${path}`), `${route.method.toUpperCase()} ${path}`);
    assert.ok(isApiRouteCapabilityMapped(route.method, `/api/v1${path}`), `versioned ${route.method.toUpperCase()} ${path}`);
  }
});

test("every client socket event has an explicit current capability", () => {
  assert.deepEqual(SOCKET_CLIENT_EVENTS.filter(event => !SOCKET_EVENT_CAPABILITIES[event]), []);
  assert.equal(SOCKET_EVENT_CAPABILITIES["message:send"], "messaging");
  assert.equal(SOCKET_EVENT_CAPABILITIES["stream:join"], "live");
  assert.equal(SOCKET_EVENT_CAPABILITIES["call:invite"], "rtc");
  assert.equal(SOCKET_EVENT_CAPABILITIES["unmapped:event"], undefined);
});

test("route authority classifies capabilities and keeps safety and restricted routes separate", () => {
  assert.deepEqual(classifyApiRoute("POST", "/api/posts"), { kind: "capability", capability: "publish" });
  assert.deepEqual(classifyApiRoute("POST", `/api/v1/posts/${UUID}/like`), { kind: "capability", capability: "social" });
  assert.deepEqual(classifyApiRoute("POST", "/api/messages"), { kind: "capability", capability: "messaging" });
  assert.deepEqual(classifyApiRoute("POST", "/api/billing/checkouts/3d6f2f91-32bb-45bc-bf1f-7f0e40a3b8a0/cancel"),
    { kind: "capability", capability: "payments" });
  assert.deepEqual(classifyApiRoute("POST", "/api/v1/streams"), { kind: "capability", capability: "live" });
  assert.deepEqual(classifyApiRoute("POST", "/api/v1/users/me/eligibility/challenges"), { kind: "restricted" });
  assert.deepEqual(classifyApiRoute("GET", "/api/users/me"), { kind: "restricted" });
  assert.deepEqual(classifyApiRoute("POST", "/api/reports"), { kind: "safety" });
  assert.equal(classifyApiRoute("GET", "/api/no-such-operation"), undefined);
  assert.equal(classifyApiRoute("GET", "/api/v1/posts%2Fsecret"), undefined);
});

test("unmapped operations and missing capabilities fail closed", () => {
  const req = { method: "GET", originalUrl: "/api/unmapped", user: { id: UUID, role: "user", permissions: [] },
    eligibility: { activated: true, capabilities: { social: true }, reason: null } } as unknown as Request;
  let statusCode = 200;
  let body: unknown;
  let calledNext = false;
  const res = {
    status(code: number) { statusCode = code; return this; },
    json(value: unknown) { body = value; return this; },
  } as unknown as Response;
  enforceRouteAuthority(req, res, (() => { calledNext = true; }) as never);
  assert.equal(statusCode, 403);
  assert.equal(calledNext, false);
  assert.equal((body as { errors: string[] }).errors[0], "unmapped_route");

  const restricted = { ...req, eligibility: { activated: false, capabilities: { publish: false }, reason: "verification_required" } } as Request;
  let capabilityStatus = 200;
  const capabilityResponse = { status(code: number) { capabilityStatus = code; return this; }, json() { return this; } } as unknown as Response;
  requireCapability("publish")(restricted, capabilityResponse, (() => { calledNext = true; }) as never);
  assert.equal(capabilityStatus, 403);
});
