import assert from "node:assert/strict";
import { test } from "node:test";
import type { Request, Response } from "express";
import { FOUNDER_PERKS, LAUNCH_DATE_ISO, PreregisterController, type PreregistrationStore } from "../controllers/preregister-controller.js";
import { preregisterSchema } from "../validators/preregister.js";

const validDetails = { email: "early@example.test", username: "early_member", launchUpdatesConsent: true };
type NewRegistration = Parameters<PreregistrationStore["insert"]>[0];

function memoryStore() {
  const records: NewRegistration[] = [];
  const store: PreregistrationStore = {
    hasEmail: async email => records.some(record => record.email === email),
    hasRegisteredUsername: async () => false,
    insert: async input => {
      if (records.some(record => record.email === input.email || record.username === input.username)) return undefined;
      records.push(input);
      return { id: input.id, username: input.username, referralCode: input.referralCode, createdAt: "2026-10-19T10:00:00.000Z" };
    },
    count: async () => records.length,
  };
  return { records, store };
}

function response() {
  let statusCode = 200;
  let body: any;
  return {
    status(code: number) { statusCode = code; return this; },
    json(value: unknown) { body = value; return this; },
    result: () => ({ statusCode, body }),
  } as unknown as Response & { result: () => { statusCode: number; body: any } };
}

async function submit(controller: PreregisterController, body: unknown = validDetails) {
  const res = response();
  await controller.preregister({ body } as Request, res);
  return res.result();
}

test("pre-registration normalises identity and requires explicit launch update consent", () => {
  const result = preregisterSchema.parse({ ...validDetails, email: "  EARLY@example.test ", username: " Early_Member " });
  assert.equal(result.email, validDetails.email);
  assert.equal(result.username, validDetails.username);
  for (const consent of [undefined, false, "true", 1]) {
    assert.equal(preregisterSchema.safeParse({ ...validDetails, launchUpdatesConsent: consent }).success, false);
  }
  for (const details of [
    { ...validDetails, email: "invalid" },
    { ...validDetails, username: "ab" },
    { ...validDetails, username: "-invalid" },
    { ...validDetails, username: "a".repeat(25) },
    { ...validDetails, referralCode: "x".repeat(1000) },
    { ...validDetails, perks: ["superpass-free"] },
    { ...validDetails, password: "unnecessary-secret" },
  ]) assert.equal(preregisterSchema.safeParse(details).success, false);
  assert.equal(preregisterSchema.parse({ ...validDetails, referralCode: " yor-a1b2c3 " }).referralCode, "YOR-A1B2C3");
});

test("invalid submissions cannot write a registration", async () => {
  const { records, store } = memoryStore();
  const result = await submit(new PreregisterController(store), { ...validDetails, launchUpdatesConsent: false });
  assert.equal(result.statusCode, 400);
  assert.equal(records.length, 0);
  assert.equal(result.body.success, false);
});

test("new registration persists consent and produces a unique reference without fake queue counts", async () => {
  const { records, store } = memoryStore();
  const before = Date.now();
  const result = await submit(new PreregisterController(store), {
    ...validDetails, email: " EARLY@EXAMPLE.TEST ", username: " EARLY_MEMBER ",
    referralCode: "YOR-A1B2C3", perks: ["community-input"],
  });
  assert.equal(result.statusCode, 201);
  assert.equal(records.length, 1);
  assert.equal(records[0].email, validDetails.email);
  assert.equal(records[0].username, validDetails.username);
  assert.equal(records[0].referredBy, "YOR-A1B2C3");
  assert.deepEqual(records[0].perks, ["community-input"]);
  assert.ok(Date.parse(records[0].launchUpdatesConsentedAt) >= before);
  assert.ok(Date.parse(records[0].launchUpdatesConsentedAt) <= Date.now());
  assert.match(result.body.data.passNumber, /^FOUNDER-[0-9A-F-]{36}$/);
  assert.match(result.body.data.referralCode, /^YOR-[0-9A-F]{24}$/);
  assert.equal(result.body.data.createdAt, "2026-10-19T10:00:00.000Z");
  assert.equal(result.body.data.isExisting, false);
  assert.equal(result.body.data.email, undefined);
  assert.equal(result.body.data.queueNumber, undefined);
  assert.equal(Date.parse(result.body.data.launchDate), Date.parse("2026-11-30T18:30:00Z"));
});

test("knowing an existing email cannot retrieve or change a registration", async () => {
  const { records, store } = memoryStore();
  const controller = new PreregisterController(store);
  const initial = await submit(controller);
  const saved = { ...records[0] };
  const duplicate = await submit(controller, { ...validDetails, username: "attacker_preference" });
  assert.equal(duplicate.statusCode, 200);
  assert.deepEqual(duplicate.body.data, { isExisting: true, launchDate: LAUNCH_DATE_ISO, perks: FOUNDER_PERKS });
  assert.doesNotMatch(JSON.stringify(duplicate.body), new RegExp(initial.body.data.id));
  assert.equal(duplicate.body.data.referralCode, undefined);
  assert.equal(duplicate.body.data.username, undefined);
  assert.equal(duplicate.body.data.email, undefined);
  assert.equal(duplicate.body.data.passNumber, undefined);
  assert.deepEqual(records, [saved]);
});

test("simultaneous submissions of one email preserve a single original registration", async () => {
  const { records, store } = memoryStore();
  const controller = new PreregisterController(store);
  const results = await Promise.all([
    submit(controller),
    submit(controller, { ...validDetails, username: "another_preference" }),
  ]);
  assert.equal(records.length, 1);
  assert.deepEqual(results.map(result => result.statusCode).sort(), [200, 201]);
  const repeated = results.find(result => result.statusCode === 200)!;
  assert.equal(repeated.body.data.isExisting, true);
  assert.equal(repeated.body.data.passNumber, undefined);
});

test("simultaneous submissions of one preferred username return a useful conflict", async () => {
  const { records, store } = memoryStore();
  const controller = new PreregisterController(store);
  const results = await Promise.all([
    submit(controller),
    submit(controller, { ...validDetails, email: "another@example.test" }),
  ]);
  assert.equal(records.length, 1);
  assert.deepEqual(results.map(result => result.statusCode).sort(), [201, 409]);
  const conflict = results.find(result => result.statusCode === 409)!;
  assert.deepEqual(conflict.body.errors, ["username_unavailable"]);
  assert.doesNotMatch(JSON.stringify(conflict.body), /reserved|locked|early@example/);
});

test("a registered member's username cannot be selected as a preference", async () => {
  const { records, store } = memoryStore();
  store.hasRegisteredUsername = async () => true;
  const result = await submit(new PreregisterController(store));
  assert.equal(result.statusCode, 409);
  assert.equal(records.length, 0);
});

test("registration failures expose no SQL parameters in the response or log", async t => {
  const { store } = memoryStore();
  store.insert = async () => { throw new Error("INSERT INTO preregistrations(email) VALUES ('private@example.test'); credential=secret"); };
  const warnings = t.mock.method(console, "warn", () => undefined);
  const result = await submit(new PreregisterController(store));
  assert.equal(result.statusCode, 503);
  assert.deepEqual(result.body.errors, ["preregistration_unavailable"]);
  assert.doesNotMatch(JSON.stringify(result.body), /INSERT|private@example|credential/);
  assert.equal(warnings.mock.callCount(), 1);
  assert.doesNotMatch(JSON.stringify(warnings.mock.calls[0].arguments), /INSERT|private@example|credential/);
});

test("public counts report only real registrations and report unavailable storage honestly", async () => {
  const { store } = memoryStore();
  const controller = new PreregisterController(store);
  const empty = response();
  await controller.getStats({} as Request, empty);
  assert.equal(empty.result().body.data.totalRegistered, 0);
  await submit(controller);
  const populated = response();
  await controller.getStats({} as Request, populated);
  assert.deepEqual(populated.result().body.data, { totalRegistered: 1, launchDate: LAUNCH_DATE_ISO, perks: FOUNDER_PERKS });
  store.count = async () => { throw new Error("private database connection parameters"); };
  const unavailable = response();
  await controller.getStats({} as Request, unavailable);
  assert.equal(unavailable.result().statusCode, 503);
  assert.equal(unavailable.result().body.data, null);
  assert.doesNotMatch(JSON.stringify(unavailable.result().body), /private database/);
});
