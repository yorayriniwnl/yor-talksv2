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
const grievanceTicketIds: string[] = [];

after(async () => {
  await pool.query("DELETE FROM grievance_tickets WHERE ticket_id = ANY($1::text[])", [grievanceTicketIds]);
  await pool.query("DELETE FROM reports WHERE reporter_id = $1", [user.id]);
  await pool.query("DELETE FROM users WHERE id = $1", [user.id]);
  await redis.del(sessionKey);
  await redis.disconnect();
  await closeAuthenticationDependencies();
  await pool.end();
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

async function submitPrivateGrievance(): Promise<Record<string, unknown>> {
  const response = await fetch(`${baseUrl}/reports/grievance`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      category: "privacy_violation",
      reportedUrl: "https://example.test/private-reported-content",
      reporterName: "Private Reporter Identity",
      reporterEmail: "private-reporter@example.test",
      description: "Private complaint details that must remain inside the moderation queue.",
    }),
  });
  assert.equal(response.status, 201);
  const envelope = await response.json() as { data: Record<string, unknown> };
  assert.equal(typeof envelope.data.ticketId, "string");
  grievanceTicketIds.push(envelope.data.ticketId as string);
  return envelope.data;
}

test("public grievance submission returns only the safe receipt fields", async () => {
  const receipt = await submitPrivateGrievance();
  assert.deepEqual(Object.keys(receipt).sort(), ["createdAt", "slaDeadline", "status", "ticketId"]);
  assert.doesNotMatch(JSON.stringify(receipt), /Private Reporter|private-reporter|private-reported-content|Private complaint/);
});

test("public grievance tracking hides identity and officer notes while moderator access retains them", async () => {
  const receipt = await submitPrivateGrievance();
  const ticketId = receipt.ticketId as string;
  const queueUrl = `${baseUrl}/reports/grievances`;
  assert.equal((await fetch(queueUrl)).status, 401);
  assert.equal((await fetch(queueUrl, { headers: { Authorization: `Bearer ${token}` } })).status, 403);

  await pool.query("UPDATE users SET role = 'moderator' WHERE id = $1", [user.id]);
  const update = await fetch(`${baseUrl}/reports/grievance/${ticketId}/status`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ status: "under_review", officerNote: "Internal officer investigation note" }),
  });
  assert.equal(update.status, 200);
  const moderatorQueue = await fetch(queueUrl, { headers: { Authorization: `Bearer ${token}` } });
  assert.equal(moderatorQueue.status, 200);
  const moderatorPayload = await moderatorQueue.json() as { data: Array<Record<string, unknown>> };
  await pool.query("UPDATE users SET role = 'user' WHERE id = $1", [user.id]);
  const fullTicket = moderatorPayload.data.find(ticket => ticket.ticketId === ticketId);
  assert.equal(fullTicket?.reporterName, "Private Reporter Identity");
  assert.equal(fullTicket?.officerNote, "Internal officer investigation note");

  const tracked = await fetch(`${baseUrl}/reports/grievance/${ticketId}`);
  assert.equal(tracked.status, 200);
  const trackedPayload = await tracked.json() as { data: Record<string, unknown> };
  assert.deepEqual(Object.keys(trackedPayload.data).sort(), ["createdAt", "slaDeadline", "status", "ticketId"]);
  assert.equal(trackedPayload.data.status, "under_review");
  assert.doesNotMatch(JSON.stringify(trackedPayload.data), /Private Reporter|private-reporter|private-reported-content|Private complaint|Internal officer/);
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
