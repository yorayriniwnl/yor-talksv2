import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, test } from "node:test";
import express from "express";
import jwt from "jsonwebtoken";
import { pool } from "@workspace/db";
import { env } from "../config/env.js";
import { closeAuthenticationDependencies } from "../middlewares/auth.js";
import { closeRateLimitRedis } from "../middlewares/rate-limit.js";
import { RedisRepository } from "../repositories/redis-repository.js";
import { UserRepository } from "../repositories/user-repository.js";
import { createTestUser } from "./test-helpers.js";
import { reportRoutes } from "../routes/reports.js";
import type { PublicGrievanceTicket } from "@workspace/api-zod";

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
const tickets: string[] = [];
const deviceId = randomUUID();
const token = jwt.sign({ sub: user.id, role: "user", permissions: [], deviceId }, env.JWT_SECRET, { expiresIn: "5m" });
const sessionKey = `session:${user.id}:${deviceId}`;
await redis.setStrict(sessionKey, "active", 300);

after(async () => {
  for (const ticketId of tickets) await pool.query("DELETE FROM grievance_tickets WHERE ticket_id = $1", [ticketId]);
  await pool.query("DELETE FROM reports WHERE reporter_id = $1", [user.id]);
  await pool.query("DELETE FROM users WHERE id = $1", [user.id]);
  await redis.del(sessionKey);
  await redis.disconnect();
  await closeAuthenticationDependencies();
  await closeRateLimitRedis();
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

test("public grievance submission and tracking return exactly the shared receipt with private fields populated", async () => {
  const submission = await fetch(`${baseUrl}/reports/grievance`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ category: "privacy_violation", reporterName: "Private Reporter", reporterEmail: "private@example.test", reportedUrl: "https://example.test/private-report", description: "Private explanation for the assigned staff reviewer only." }),
  });
  assert.equal(submission.status, 201);
  const receipt = (await submission.json() as { data: PublicGrievanceTicket }).data;
  tickets.push(receipt.ticketId);
  const keys = ["createdAt", "status", "ticketId"];
  assert.deepEqual(Object.keys(receipt).sort(), keys);
  assert.equal(receipt.status, "received");
  assert.ok(Number.isFinite(Date.parse(receipt.createdAt)));
  await pool.query("UPDATE grievance_tickets SET officer_note = $1, status = 'under_review' WHERE ticket_id = $2", ["Private investigation note", receipt.ticketId]);
  const stored = await pool.query("SELECT * FROM grievance_tickets WHERE ticket_id = $1", [receipt.ticketId]);
  assert.equal(stored.rows[0].reporter_name, "Private Reporter");
  assert.equal(stored.rows[0].reporter_email, "private@example.test");
  assert.equal(stored.rows[0].officer_note, "Private investigation note");
  const issuance = await pool.query("SELECT extract(epoch FROM created_at AT TIME ZONE 'UTC')::double precision AS epoch FROM grievance_tickets WHERE ticket_id = $1", [receipt.ticketId]);
  assert.equal(Date.parse(receipt.createdAt), Math.round(issuance.rows[0].epoch * 1000));
  for (const headers of [{}, { Authorization: `Bearer ${token}` }]) {
    const response = await fetch(`${baseUrl}/reports/grievance/${receipt.ticketId}`, { headers });
    assert.equal(response.status, 200);
    const status = (await response.json() as { data: PublicGrievanceTicket }).data;
    assert.deepEqual(Object.keys(status).sort(), keys);
    assert.deepEqual(status, { ...receipt, status: "under_review" });
  }
});

test("grievance staff details and status changes reject anonymous and ordinary users", async () => {
  for (const [headers, expected] of [[{}, 401], [{ Authorization: `Bearer ${token}` }, 403]] as const) {
    const queue = await fetch(`${baseUrl}/reports/grievances`, { headers });
    assert.equal(queue.status, expected);
    const response = await fetch(`${baseUrl}/reports/grievance/${tickets[0]}/status`, {
      method: "PATCH", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify({ status: "resolved", officerNote: "Unauthorized mutation" }),
    });
    assert.equal(response.status, expected);
    assert.ok(!JSON.stringify(await response.json()).includes("Private investigation note"));
  }
});
