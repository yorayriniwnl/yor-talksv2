import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { metricsTokenMatches, readMetricsToken } from "../lib/metrics-auth.js";

test("metrics scrape credentials require a high-entropy exact match", () => {
  const token = "metrics-ci-only-token-012345678901234567890123";
  assert.equal(metricsTokenMatches(token, token), true);
  assert.equal(metricsTokenMatches("short", token), false);
  assert.equal(metricsTokenMatches(`${token}x`, token), false);
  assert.equal(metricsTokenMatches(token, `${token}x`), false);
});

test("metrics scrape token files reject short credentials and read one-line secrets", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "yor-metrics-token-test-"));
  const tokenFile = path.join(directory, "token");
  try {
    await fs.writeFile(tokenFile, "strong-metrics-token-012345678901234567890123\n", { mode: 0o600 });
    assert.equal(await readMetricsToken(tokenFile), "strong-metrics-token-012345678901234567890123");
    await fs.writeFile(tokenFile, "too-short\n");
    await assert.rejects(readMetricsToken(tokenFile), /at least 32 characters/);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});