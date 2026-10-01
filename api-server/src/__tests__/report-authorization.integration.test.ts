import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, test } from "node:test";
import express from "express";
import jwt from "jsonwebtoken";
import { pool } from "@workspace/db";
import { env } from "../config/env.js";
import { closeAuthenticationDependencies } from "../middlewares/auth.js";
import { RedisRepository } from "../repositories/redis-repository.js";
import { UserRepository } from "../repositories/user-repository.js";
import { createTestUser } from "./test-helpers.js";
import { reportRoutes } from "../routes/reports.js";

const redis = new RedisRepository();
const app = express();
app.use(express.json());
app.use("/reports", reportRoutes);
const server = app.listen(0, "127.0.0.1");
await new Promise<void>((resolve) => server.once("listening", resolve));
const address = server.address();
assert.ok(address && typeof address !== "string");
const baseUrl = `http://127.0.0.1:${address.port}`;
const user = await createTestUser(new UserRepository());
const deviceId = randomUUID();
const token = jwt.sign({ sub: user.id, role: "user", permissions: [], deviceId }, env.JWT_SECRET, { expiresIn: "5m" });
const sessionKey = `session:${user.id}:${deviceId}`;
await redis.setStrict(sessionKey, "active", 300);

after(async () => {
  await pool.query("DELETE FROM reports WHERE reporter_id = $1", [user.id]);
  await pool.query("DELETE FROM users WHERE id = $1", [user.id]);
  await redis.del(sessionKey);
  await redis.disconnect();
  await closeAuthenticationDependencies();
  await pool.end();
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

test("report routes reject anonymous access and keep moderation queue role-restricted", async () => {
  const anonymousSubmission = await fetch(`${baseUrl}/reports/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ entityType: "post", entityId: randomUUID(), reason: "spam" }),
  });
  assert.equal(anonymousSubmission.status, 401);

  const ordinaryUserQueue = await fetch(`${baseUrl}/reports/queue`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(ordinaryUserQueue.status, 403);

  const authenticatedSubmission = await fetch(`${baseUrl}/reports/`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ entityType: "post", entityId: randomUUID(), reason: "spam", details: "test report" }),
  });
  assert.equal(authenticatedSubmission.status, 201);
  const rows = await pool.query<{ count: string }>("SELECT count(*)::text AS count FROM reports WHERE reporter_id = $1", [user.id]);
  assert.equal(Number(rows.rows[0]?.count), 1);
});