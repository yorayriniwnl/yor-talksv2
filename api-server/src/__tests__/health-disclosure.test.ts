import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { test } from "node:test";

test("production readiness failures do not expose dependency or runtime details", () => {
  const source = `
    import express from "express";
    import healthRouter from "./src/routes/health.ts";

    const app = express();
    app.use(healthRouter);
    const server = app.listen(0, "127.0.0.1");
    await new Promise((resolve) => server.once("listening", resolve));
    try {
      const address = server.address();
      const response = await fetch(\`http://127.0.0.1:\${address.port}/readyz\`);
      console.log(JSON.stringify({ statusCode: response.status, body: await response.json() }));
    } finally {
      await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
  `;
  const result = spawnSync(
    process.execPath,
    ["--import", "tsx", "--input-type=module", "--eval", source],
    {
      cwd: path.resolve(import.meta.dirname, "../.."),
      encoding: "utf8",
      timeout: 15_000,
      env: {
        ...process.env,
        NODE_ENV: "production",
        JWT_SECRET: "a".repeat(40),
        JWT_REFRESH_SECRET: "b".repeat(40),
        CONTACT_SHIELD_SECRET: "c".repeat(40),
        TOTP_ENCRYPTION_KEY: "d".repeat(40),
        DATABASE_URL: "postgresql://health-db.invalid:5432/health_test",
        REDIS_URL: "redis://redis.health-test.invalid:6379",
        CLIENT_ORIGIN: "https://app.health-test.invalid",
        CORS_ORIGINS: "https://app.health-test.invalid",
        CLOUDINARY_CLOUD_NAME: "test-cloud",
        CLOUDINARY_API_KEY: "test-cloud-key",
        CLOUDINARY_API_SECRET: "test-cloud-secret",
        RESEND_API_KEY: "test-resend-key",
        EMAIL_FROM: "test@health-test.invalid",
        METRICS_BEARER_TOKEN_FILE: "/run/secrets/metrics_bearer_token",
        OPENAI_API_KEY: "test-moderation-key",
        PUBLIC_BETA: "false",
      },
    },
  );

  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  const { statusCode, body } = JSON.parse(result.stdout.trim());
  assert.equal(statusCode, 503);
  assert.deepEqual(Object.keys(body).sort(), ["error", "status", "timestamp"]);
  assert.equal(body.error, "Readiness checks failed");
  assert.doesNotMatch(JSON.stringify(body), /health-db\.invalid|health-test\.invalid|nodeVersion|redisVersion|environment|database|redis/i);
});
