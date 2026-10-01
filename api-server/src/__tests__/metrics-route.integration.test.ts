import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, test } from "node:test";
import express from "express";
import { pool } from "@workspace/db";
import { env } from "../config/env.js";
import { closeAuthenticationDependencies } from "../middlewares/auth.js";
import { operationalMetrics } from "../services/operational-metrics-service.js";
import metricsRouter from "../routes/metrics.js";

const originalTokenPath = env.METRICS_BEARER_TOKEN_FILE;
const directory = await mkdtemp(path.join(tmpdir(), "yor-metrics-route-"));
const tokenPath = path.join(directory, "token");
await writeFile(tokenPath, "metrics-route-integration-token-012345678901234567890123\n", { mode: 0o600 });
env.METRICS_BEARER_TOKEN_FILE = tokenPath;

const app = express();
app.use(metricsRouter);
const server = app.listen(0, "127.0.0.1");
await new Promise<void>((resolve) => server.once("listening", resolve));
const address = server.address();
assert.ok(address && typeof address !== "string");
const url = `http://127.0.0.1:${address.port}/metrics`;

after(async () => {
  env.METRICS_BEARER_TOKEN_FILE = originalTokenPath;
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  await operationalMetrics.close();
  await closeAuthenticationDependencies();
  await pool.end();
  await rm(directory, { recursive: true, force: true });
});

test("metrics endpoint accepts only the dedicated scrape token or admin authentication", async () => {
  const anonymous = await fetch(url);
  assert.equal(anonymous.status, 401);

  const scraped = await fetch(url, {
    headers: { Authorization: "Bearer metrics-route-integration-token-012345678901234567890123" },
  });
  assert.equal(scraped.status, 200);
  assert.match(await scraped.text(), /yor_http_metrics_shared_store_up/);
});