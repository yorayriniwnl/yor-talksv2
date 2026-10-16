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
import { authorizeTestAdultAccount, createTestUser } from "./test-helpers.js";
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
await authorizeTestAdultAccount(user.id);
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
  assert.deepEqual(Object.keys(receipt).sort(), ["createdAt", "status", "ticketId"]);
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
  assert.deepEqual(Object.keys(trackedPayload.data).sort(), ["createdAt", "status", "ticketId"]);
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
  assert.equal((await fetch(`${baseUrl}/reports/${randomUUID()}/history`, { headers: { Authorization: `Bearer ${token}` } })).status, 403);

  const authenticatedSubmission = await fetch(`${baseUrl}/reports/`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ entityType: "post", entityId: randomUUID(), reason: "spam", details: "test report" }),
  });
  assert.equal(authenticatedSubmission.status, 201);
  const rows = await pool.query<{ count: string }>("SELECT count(*)::text AS count FROM reports WHERE reporter_id = $1", [user.id]);
  assert.equal(Number(rows.rows[0]?.count), 1);
});

test('final report decisions require a reason and keep an immutable staff audit trail', async () => {
  const reportId = randomUUID();
  await pool.query(`INSERT INTO reports(id,reporter_id,entity_type,entity_id,reason,status,created_at)
    VALUES($1,$2,'post','decision-fixture','spam','pending',now())`, [reportId, user.id]);
  await pool.query("UPDATE users SET role='moderator' WHERE id=$1", [user.id]);
  try {
    const missingReason = await fetch(`${baseUrl}/reports/${reportId}/status`, {
      method: 'PATCH', headers: { ...staffHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'resolved' }),
    });
    assert.equal(missingReason.status, 400);
    assert.equal((await pool.query('SELECT count(*)::int AS count FROM report_moderation_events WHERE report_id=$1', [reportId])).rows[0]?.count, 0);

    const decisionReason = 'Reviewed against the reported content and no policy breach was found.';
    const resolved = await fetch(`${baseUrl}/reports/${reportId}/status`, {
      method: 'PATCH', headers: { ...staffHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'resolved', decisionReason }),
    });
    assert.equal(resolved.status, 200);
    const resolvedPayload = await resolved.json() as { data: { status: string; decisionReason: string | null; resolvedAt: string | null } };
    assert.equal(resolvedPayload.data.status, 'resolved');
    assert.equal(resolvedPayload.data.decisionReason, decisionReason);
    assert.ok(resolvedPayload.data.resolvedAt);

    const reopened = await fetch(`${baseUrl}/reports/${reportId}/status`, {
      method: 'PATCH', headers: { ...staffHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'reviewed' }),
    });
    assert.equal(reopened.status, 200);
    const reopenedPayload = await reopened.json() as { data: { status: string; decisionReason: string | null; resolvedAt: string | null } };
    assert.equal(reopenedPayload.data.status, 'reviewed');
    assert.equal(reopenedPayload.data.decisionReason, null);
    assert.equal(reopenedPayload.data.resolvedAt, null);

    const history = await pool.query<{ from_status: string; to_status: string; decision_reason: string | null; moderator_id: string }>(
      'SELECT from_status,to_status,decision_reason,moderator_id FROM report_moderation_events WHERE report_id=$1 ORDER BY created_at,id', [reportId]);
    assert.deepEqual(history.rows.map(row => ({ from: row.from_status, to: row.to_status, reason: row.decision_reason, moderator: row.moderator_id })), [
      { from: 'pending', to: 'resolved', reason: decisionReason, moderator: user.id },
      { from: 'resolved', to: 'reviewed', reason: null, moderator: user.id },
    ]);

    const historyResponse = await fetch(`${baseUrl}/reports/${reportId}/history`, { headers: staffHeaders });
    assert.equal(historyResponse.status, 200);
    const historyPayload = await historyResponse.json() as { data: Array<{ fromStatus: string | null; toStatus: string; decisionReason: string | null; moderatorId: string }> };
    assert.deepEqual(historyPayload.data.map(event => ({ from: event.fromStatus, to: event.toStatus, reason: event.decisionReason, moderator: event.moderatorId })), [
      { from: 'resolved', to: 'reviewed', reason: null, moderator: user.id },
      { from: 'pending', to: 'resolved', reason: decisionReason, moderator: user.id },
    ]);
  } finally {
    await pool.query("UPDATE users SET role='user' WHERE id=$1", [user.id]);
  }
});

type QueueEnvelope = { data: Array<{ id: string; status: string }>; meta: { nextCursor: string | null; hasMore: boolean; limit: number } };
const staffHeaders = { Authorization: `Bearer ${token}` };
async function queuePage(path: string): Promise<QueueEnvelope> {
  const response = await fetch(`${baseUrl}${path}`, { headers: staffHeaders });
  assert.equal(response.status, 200);
  return await response.json() as QueueEnvelope;
}

test('staff report pagination reaches older unresolved rows and all timestamp ties without duplicates', async () => {
  await pool.query("UPDATE users SET role='moderator' WHERE id=$1", [user.id]);
  await pool.query('DELETE FROM reports WHERE reporter_id=$1', [user.id]);
  const ids = Array.from({ length: 205 }, () => randomUUID()).sort().reverse();
  await pool.query(`INSERT INTO reports(id,reporter_id,entity_type,entity_id,reason,status,created_at)
    SELECT id,$2,'post','fixture','spam','reviewed','2099-01-01 00:00:00.123456'::timestamp FROM unnest($1::uuid[]) AS id`, [ids, user.id]);
  const pendingId = randomUUID();
  await pool.query(`INSERT INTO reports(id,reporter_id,entity_type,entity_id,reason,status,created_at)
    VALUES($1,$2,'post','fixture','spam','pending','2000-01-01')`, [pendingId, user.id]);
  const pending = await queuePage('/reports/queue?status=pending');
  assert.deepEqual(pending.data.map(row => row.id), [pendingId]);
  assert.equal(pending.meta.hasMore, false);

  let page = await queuePage('/reports/queue?status=reviewed&limit=37');
  assert.equal(page.meta.limit, 37);
  assert.equal(page.data.length, 37);
  assert.ok(page.meta.nextCursor);
  const firstCursor = page.meta.nextCursor;
  const seen = page.data.map(row => row.id);
  // Keyset pagination must survive removal of its anchor and a newer insertion.
  await pool.query('DELETE FROM reports WHERE id=$1', [seen.at(-1)]);
  await pool.query(`INSERT INTO reports(id,reporter_id,entity_type,entity_id,reason,status,created_at)
    VALUES($1,$2,'post','fixture','spam','reviewed','2100-01-01')`, [randomUUID(), user.id]);
  while (page.meta.hasMore) {
    page = await queuePage(`/reports/queue?status=reviewed&limit=37&cursor=${page.meta.nextCursor}`);
    seen.push(...page.data.map(row => row.id));
    assert.ok(seen.length <= ids.length);
  }
  assert.deepEqual(seen, ids);
  assert.equal(page.meta.nextCursor, null);
  for (const path of [
    `/reports/queue?status=pending&cursor=${firstCursor}`,
    `/reports/grievances?cursor=${firstCursor}`,
    '/reports/queue?cursor=invalid', '/reports/queue?limit=0', '/reports/queue?limit=101',
    '/reports/queue?limit=2&limit=3', '/reports/queue?status=unknown',
  ]) assert.equal((await fetch(`${baseUrl}${path}`, { headers: staffHeaders })).status, 400, path);
  await pool.query("UPDATE users SET role='user' WHERE id=$1", [user.id]);
  assert.equal((await fetch(`${baseUrl}/reports/queue?status=reviewed&cursor=${firstCursor}`, { headers: staffHeaders })).status, 403);
});

test('staff grievance pagination keeps old cases reachable with status-scoped cursors', async () => {
  await pool.query("UPDATE users SET role='moderator' WHERE id=$1", [user.id]);
  await pool.query('DELETE FROM grievance_tickets WHERE ticket_id=ANY($1::text[])', [grievanceTicketIds]);
  const ids = Array.from({ length: 205 }, () => randomUUID()).sort().reverse();
  const tickets = ids.map(id => `YT-GRV-${id.replaceAll('-', '').slice(0, 10).toUpperCase()}`);
  grievanceTicketIds.push(...tickets);
  await pool.query(`INSERT INTO grievance_tickets(id,ticket_id,category,reported_url,reporter_name,reporter_email,description,status,created_at)
    SELECT id,ticket,'other','https://example.test/fixture','Fixture','fixture@example.test','Synthetic pagination fixture','received','2099-01-01 00:00:00.123456'::timestamp
    FROM unnest($1::uuid[],$2::text[]) AS fixture(id,ticket)`, [ids,tickets]);
  let page = await queuePage('/reports/grievances?status=received&limit=41');
  const seen: string[] = [];
  const firstCursor = page.meta.nextCursor;
  do {
    assert.ok(page.data.every(row => row.status === 'received'));
    seen.push(...page.data.map(row => row.id));
    assert.ok(seen.length <= ids.length);
    if (!page.meta.hasMore) break;
    page = await queuePage(`/reports/grievances?status=received&limit=41&cursor=${page.meta.nextCursor}`);
  } while (true);
  assert.deepEqual(seen, ids);
  assert.equal(page.meta.nextCursor, null);
  assert.equal((await fetch(`${baseUrl}/reports/grievances?status=resolved&cursor=${firstCursor}`, { headers: staffHeaders })).status, 400);
  assert.equal((await fetch(`${baseUrl}/reports/grievances?status=unknown`, { headers: staffHeaders })).status, 400);
  await pool.query("UPDATE users SET role='user' WHERE id=$1", [user.id]);
});
