import assert from "node:assert/strict";
import { createServer } from "node:http";
import { test } from "node:test";
import express from "express";
import { productEventBatchSchema } from "../services/product-analytics-service.js";
import productAnalyticsRouter from "../routes/product-analytics.js";

test("product analytics accepts only versioned allowlisted events and minimal properties", () => {
  const parsed = productEventBatchSchema.safeParse([{
    eventId: "7f39d198-f71e-4ba3-bdea-277f67ca3c93",
    schemaVersion: 1,
    eventName: "navigation",
    occurredAt: new Date().toISOString(),
    properties: {},
  }]);
  assert.equal(parsed.success, true);
});

test("product analytics rejects unknown names, payload fields, and oversized batches", () => {
  const unknownEvent = productEventBatchSchema.safeParse([{
    eventId: "7f39d198-f71e-4ba3-bdea-277f67ca3c93",
    schemaVersion: 1,
    eventName: "message_sent",
    occurredAt: new Date().toISOString(),
    properties: { message: "must not be collected" },
  }]);
  assert.equal(unknownEvent.success, false);

  const unknownProperty = productEventBatchSchema.safeParse([{
    eventId: "7f39d198-f71e-4ba3-bdea-277f67ca3c93",
    schemaVersion: 1,
    eventName: "navigation",
    occurredAt: new Date().toISOString(),
    properties: { route: "/profile/private-id" },
  }]);
  assert.equal(unknownProperty.success, false);

  const tooMany = productEventBatchSchema.safeParse(Array.from({ length: 21 }, (_, index) => ({
    eventId: `7f39d198-f71e-4ba3-bdea-277f67ca3c${String(index).padStart(2, "0")}`,
    schemaVersion: 1,
    eventName: "navigation",
    occurredAt: new Date().toISOString(),
    properties: {},
  })));
  assert.equal(tooMany.success, false);
});

test("profiler events accept bounded metrics only", () => {
  const good = productEventBatchSchema.safeParse([{
    eventId: "7f39d198-f71e-4ba3-bdea-277f67ca3c93",
    schemaVersion: 1,
    eventName: "react:profiler",
    occurredAt: new Date().toISOString(),
    properties: { id: "App", phase: "mount", actualDuration: 3.5, baseDuration: 4.2 },
  }]);
  assert.equal(good.success, true);
  assert.equal(productEventBatchSchema.safeParse([{
    eventId: "7f39d198-f71e-4ba3-bdea-277f67ca3c93",
    schemaVersion: 1,
    eventName: "react:profiler",
    occurredAt: "2026-10-01T10:00:00.000Z",
    properties: { id: "App", phase: "mount", actualDuration: 60_001, baseDuration: 4.2 },
  }]).success, false);
});

test("product analytics excludes stale and implausibly future event timestamps", () => {
  const event = {
    eventId: "7f39d198-f71e-4ba3-bdea-277f67ca3c93",
    schemaVersion: 1,
    eventName: "navigation",
    properties: {},
  };
  const stale = productEventBatchSchema.safeParse([{
    ...event,
    occurredAt: new Date(Date.now() - 91 * 86_400_000).toISOString(),
  }]);
  const future = productEventBatchSchema.safeParse([{
    ...event,
    occurredAt: new Date(Date.now() + 6 * 60_000).toISOString(),
  }]);
  assert.equal(stale.success, false);
  assert.equal(future.success, false);
});

test("analytics reporting endpoint rejects unauthenticated requests", async (t) => {
  const app = express();
  app.use(express.json());
  app.use(productAnalyticsRouter);
  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));
  const address = server.address();
  assert.ok(address && typeof address !== "string");

  const response = await fetch(`http://127.0.0.1:${address.port}/telemetry/analytics?from=2026-10-01&to=2026-10-01`);
  assert.equal(response.status, 401);
});