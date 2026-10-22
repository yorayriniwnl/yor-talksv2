import assert from "node:assert/strict";
import { after, test } from "node:test";
import crypto from "node:crypto";
import express from "express";
import { pool, db } from "@workspace/db";
import { preregistrationsTable, consentRecordsTable } from "@workspace/db/schema";
import { sql } from "drizzle-orm";
import preregisterRoutes from "../routes/preregister.js";
import { UserRepository } from "../repositories/user-repository.js";
import { createTestUser } from "./test-helpers.js";
import { FOUNDER_PERKS, LAUNCH_DATE_ISO, PreregisterController } from "../controllers/preregister-controller.js";

const createdPreregistrationIds: string[] = [];
const createdUserIds: string[] = [];

after(async () => {
  for (const id of createdPreregistrationIds) {
    await pool.query("DELETE FROM preregistrations WHERE id = $1", [id]).catch(() => {});
  }
  for (const id of createdUserIds) {
    await pool.query("DELETE FROM users WHERE id = $1", [id]).catch(() => {});
  }
  await pool.end();
});

function createTestServer() {
  const app = express();
  app.use(express.json());
  app.use("/api", preregisterRoutes);
  const server = app.listen(0, "127.0.0.1");
  return {
    app,
    server,
    async getBaseUrl() {
      if (!server.listening) {
        await new Promise<void>(resolve => server.once("listening", resolve));
      }
      const addr = server.address();
      assert.ok(addr && typeof addr !== "string");
      return `http://127.0.0.1:${addr.port}`;
    },
    async close() {
      await new Promise<void>(resolve => {
        server.closeAllConnections();
        server.close(() => resolve());
      });
    },
  };
}

test("preregister endpoint normalises details, records consent, and stores record in database", async t => {
  const { getBaseUrl, close } = createTestServer();
  t.after(close);

  const base = await getBaseUrl();
  const rawEmail = `  REAL_TEST_${crypto.randomUUID().slice(0, 8)}@EXAMPLE.COM  `;
  const rawUsername = `  Member_${crypto.randomUUID().slice(0, 8)}  `;
  const normalizedEmail = rawEmail.trim().toLowerCase();
  const normalizedUsername = rawUsername.trim().toLowerCase();

  const response = await fetch(`${base}/api/preregister`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: rawEmail,
      username: rawUsername,
      launchUpdatesConsent: true,
      referralCode: "  yor-a1b2c3d4e5f6  ",
      perks: ["founder-badge", "priority-access"],
    }),
  });

  assert.equal(response.status, 201);
  const body = await response.json() as any;
  assert.equal(body.success, true);
  assert.equal(body.data.isExisting, false);
  assert.equal(body.data.username, normalizedUsername);
  assert.match(body.data.passNumber, /^FOUNDER-[0-9A-F-]{36}$/);
  assert.match(body.data.referralCode, /^YOR-[0-9A-F]{24}$/);
  assert.equal(body.data.launchDate, LAUNCH_DATE_ISO);
  assert.deepEqual(body.data.perks, FOUNDER_PERKS);
  assert.equal(body.data.email, undefined);

  createdPreregistrationIds.push(body.data.id);

  // Verify database record
  const dbResult = await pool.query("SELECT * FROM preregistrations WHERE id = $1", [body.data.id]);
  assert.equal(dbResult.rowCount, 1);
  const row = dbResult.rows[0];
  assert.equal(row.email, normalizedEmail);
  assert.equal(row.username, normalizedUsername);
  assert.equal(row.referred_by, "YOR-A1B2C3D4E5F6");
  assert.deepEqual(row.perks, ["founder-badge", "priority-access"]);
  assert.ok(row.launch_updates_consented_at !== null);

  // Verify consent record was created via consentService
  const digest = crypto.createHash("sha256").update(normalizedEmail).digest("hex");
  const consentResult = await pool.query(
    "SELECT * FROM consent_records WHERE subject_digest = $1 AND purpose = 'launch_updates'",
    [digest]
  );
  assert.ok(consentResult.rowCount! >= 1);
  assert.equal(consentResult.rows[0].granted, true);
});

test("preregister endpoint rejects invalid inputs and missing consent without modifying database", async t => {
  const { getBaseUrl, close } = createTestServer();
  t.after(close);

  const base = await getBaseUrl();
  const countBefore = Number((await pool.query("SELECT count(*)::int AS count FROM preregistrations")).rows[0].count);

  // Missing / false consent
  for (const consent of [false, undefined, "true", null, 0]) {
    const res = await fetch(`${base}/api/preregister`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "test@example.com",
        username: "valid_name",
        launchUpdatesConsent: consent,
      }),
    });
    assert.equal(res.status, 400);
    const body = await res.json() as any;
    assert.equal(body.success, false);
  }

  // Malformed details
  const invalidPayloads = [
    { email: "not-an-email", username: "valid_name", launchUpdatesConsent: true },
    { email: "test@example.com", username: "ab", launchUpdatesConsent: true }, // too short
    { email: "test@example.com", username: "-invalid", launchUpdatesConsent: true }, // starts with hyphen
    { email: "test@example.com", username: "a".repeat(25), launchUpdatesConsent: true }, // too long
    { email: "test@example.com", username: "valid_name", launchUpdatesConsent: true, referralCode: "INVALID" },
    { email: "test@example.com", username: "valid_name", launchUpdatesConsent: true, perks: ["fake-perk"] },
    { email: "test@example.com", username: "valid_name", launchUpdatesConsent: true, extraField: "not_allowed" }, // strict rejection
  ];

  for (const payload of invalidPayloads) {
    const res = await fetch(`${base}/api/preregister`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    assert.equal(res.status, 400);
  }

  const countAfter = Number((await pool.query("SELECT count(*)::int AS count FROM preregistrations")).rows[0].count);
  assert.equal(countAfter, countBefore);
});

test("duplicate and concurrent duplicate email submissions protect existing member privacy", async t => {
  const { getBaseUrl, close } = createTestServer();
  t.after(close);

  const base = await getBaseUrl();
  const sharedEmail = `concurrent_${crypto.randomUUID().slice(0, 8)}@example.com`;

  // Run two concurrent submissions with the same email
  const [res1, res2] = await Promise.all([
    fetch(`${base}/api/preregister`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: sharedEmail,
        username: `user_${crypto.randomUUID().slice(0, 8)}`,
        launchUpdatesConsent: true,
      }),
    }),
    fetch(`${base}/api/preregister`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: sharedEmail,
        username: `user_${crypto.randomUUID().slice(0, 8)}`,
        launchUpdatesConsent: true,
      }),
    }),
  ]);

  const statuses = [res1.status, res2.status].sort();
  assert.deepEqual(statuses, [200, 201]);

  const body1 = await res1.json() as any;
  const body2 = await res2.json() as any;
  const newReceipt = res1.status === 201 ? body1 : body2;
  const existingReceipt = res1.status === 200 ? body1 : body2;

  createdPreregistrationIds.push(newReceipt.data.id);

  // New receipt has generated fields
  assert.equal(newReceipt.data.isExisting, false);
  assert.match(newReceipt.data.passNumber, /^FOUNDER-/);

  // Existing receipt has only public/generic fields
  assert.equal(existingReceipt.data.isExisting, true);
  assert.equal(existingReceipt.data.launchDate, LAUNCH_DATE_ISO);
  assert.deepEqual(existingReceipt.data.perks, FOUNDER_PERKS);
  assert.equal(existingReceipt.data.id, undefined);
  assert.equal(existingReceipt.data.username, undefined);
  assert.equal(existingReceipt.data.passNumber, undefined);
  assert.equal(existingReceipt.data.referralCode, undefined);
  assert.equal(existingReceipt.data.email, undefined);

  // Verify sequential duplicate also returns generic 200 receipt
  const seqRes = await fetch(`${base}/api/preregister`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: sharedEmail,
      username: `another_${crypto.randomUUID().slice(0, 8)}`,
      launchUpdatesConsent: true,
    }),
  });
  assert.equal(seqRes.status, 200);
  const seqBody = await seqRes.json() as any;
  assert.equal(seqBody.data.isExisting, true);
  assert.equal(seqBody.data.id, undefined);
  assert.equal(seqBody.data.username, undefined);

  // Exactly 1 row in DB for this email
  const dbRows = await pool.query("SELECT * FROM preregistrations WHERE email = $1", [sharedEmail.toLowerCase()]);
  assert.equal(dbRows.rowCount, 1);
});

test("username conflict occurs when username is already preregistered or registered as a user", async t => {
  const { getBaseUrl, close } = createTestServer();
  t.after(close);

  const base = await getBaseUrl();
  const username = `taken_${crypto.randomUUID().slice(0, 8)}`;

  // 1. First preregister with this username
  const res1 = await fetch(`${base}/api/preregister`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: `initial_${crypto.randomUUID().slice(0, 8)}@example.com`,
      username,
      launchUpdatesConsent: true,
    }),
  });
  assert.equal(res1.status, 201);
  const body1 = await res1.json() as any;
  createdPreregistrationIds.push(body1.data.id);

  // 2. Different email tries to take the same username (case-insensitive)
  const res2 = await fetch(`${base}/api/preregister`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: `other_${crypto.randomUUID().slice(0, 8)}@example.com`,
      username: username.toUpperCase(),
      launchUpdatesConsent: true,
    }),
  });
  assert.equal(res2.status, 409);
  const body2 = await res2.json() as any;
  assert.deepEqual(body2.errors, ["username_unavailable"]);
  assert.doesNotMatch(JSON.stringify(body2), new RegExp(body1.data.id));

  // 3. Username already registered in users table
  const userRepo = new UserRepository();
  const activeUser = await createTestUser(userRepo, {
    username: `active_${crypto.randomUUID().slice(0, 8)}`,
  });
  createdUserIds.push(activeUser.id);

  const res3 = await fetch(`${base}/api/preregister`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: `attempt_${crypto.randomUUID().slice(0, 8)}@example.com`,
      username: activeUser.username.toUpperCase(),
      launchUpdatesConsent: true,
    }),
  });
  assert.equal(res3.status, 409);
  const body3 = await res3.json() as any;
  assert.deepEqual(body3.errors, ["username_unavailable"]);
});

test("database outage sanitizes errors and leaks no SQL, email, or credentials in response or logs", async t => {
  const privateEmail = "super_private_secret@example.com";
  const fakeStore = {
    hasEmail: async () => false,
    hasRegisteredUsername: async () => false,
    insert: async () => {
      throw new Error(`Connection to postgresql://postgres:secretpw@127.0.0.1:5432 failed; INSERT INTO preregistrations (email) VALUES ('${privateEmail}')`);
    },
    count: async () => {
      throw new Error("SELECT count(*) FROM preregistrations failed; password=secret");
    },
  };

  const controller = new PreregisterController(fakeStore);
  const app = express();
  app.use(express.json());
  app.post("/api/preregister", controller.preregister);
  app.get("/api/preregister/stats", controller.getStats);

  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>(resolve => server.once("listening", resolve));
  t.after(() => new Promise<void>(resolve => { server.closeAllConnections(); server.close(() => resolve()); }));

  const addr = server.address();
  assert.ok(addr && typeof addr !== "string");
  const base = `http://127.0.0.1:${addr.port}`;

  const warnings: string[] = [];
  const origWarn = console.warn;
  console.warn = (...args: unknown[]) => {
    warnings.push(args.map(String).join(" "));
  };
  t.after(() => { console.warn = origWarn; });

  const res = await fetch(`${base}/api/preregister`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: privateEmail,
      username: "valid_name",
      launchUpdatesConsent: true,
    }),
  });

  assert.equal(res.status, 503);
  const body = await res.json() as any;
  assert.deepEqual(body.errors, ["preregistration_unavailable"]);
  const serializedBody = JSON.stringify(body);
  assert.doesNotMatch(serializedBody, /postgres|secretpw|INSERT|super_private/);

  // Check logs
  const serializedLogs = warnings.join("\n");
  assert.doesNotMatch(serializedLogs, /postgres|secretpw|INSERT|super_private/);

  // Stats outage
  const statsRes = await fetch(`${base}/api/preregister/stats`);
  assert.equal(statsRes.status, 503);
  const statsBody = await statsRes.json() as any;
  assert.deepEqual(statsBody.errors, ["preregistration_stats_unavailable"]);
  assert.doesNotMatch(JSON.stringify(statsBody), /postgres|secret/);
});

test("stats endpoint returns accurate count against real database", async t => {
  const { getBaseUrl, close } = createTestServer();
  t.after(close);

  const base = await getBaseUrl();
  const statsBefore = await fetch(`${base}/api/preregister/stats`).then(r => r.json()) as any;
  assert.equal(typeof statsBefore.data.totalRegistered, "number");
  assert.equal(statsBefore.data.launchDate, LAUNCH_DATE_ISO);
  assert.deepEqual(statsBefore.data.perks, FOUNDER_PERKS);

  // Add a registration
  const res = await fetch(`${base}/api/preregister`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: `stats_test_${crypto.randomUUID().slice(0, 8)}@example.com`,
      username: `stats_${crypto.randomUUID().slice(0, 8)}`,
      launchUpdatesConsent: true,
    }),
  });
  assert.equal(res.status, 201);
  const body = await res.json() as any;
  createdPreregistrationIds.push(body.data.id);

  const statsAfter = await fetch(`${base}/api/preregister/stats`).then(r => r.json()) as any;
  assert.equal(statsAfter.data.totalRegistered, statsBefore.data.totalRegistered + 1);
});

test("preregistration rate limiter attaches standard RateLimit headers", async t => {
  const { getBaseUrl, close } = createTestServer();
  t.after(close);

  const base = await getBaseUrl();
  const res = await fetch(`${base}/api/preregister`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "invalid" }),
  });
  assert.equal(res.status, 400);
  assert.equal(res.headers.get("ratelimit-limit"), "40");
  assert.ok(res.headers.has("ratelimit-remaining"));
});

