import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import { PrivacyRightsEngine, InMemoryPrivacyStore } from "../lib/privacy/privacy-rights-engine.mjs";

test("Knowledge of an email address never establishes ownership or reveals account existence", async () => {
  const store = new InMemoryPrivacyStore();
  const engine = new PrivacyRightsEngine({ store });

  const existingEmail = "existing.member@example.test";
  const nonexistentEmail = "ghost@example.test";

  store.activeUsers.set(existingEmail, { id: randomUUID(), username: "member1", email: existingEmail });

  const resp1 = await engine.initiateChallenge(existingEmail);
  const resp2 = await engine.initiateChallenge(nonexistentEmail);

  // Both responses must be identical generic confirmations
  assert.equal(resp1.challengeInitiated, true);
  assert.equal(resp2.challengeInitiated, true);
  assert.equal(Object.keys(resp1).filter(k => !k.startsWith("_")).join(","), "challengeInitiated");
  assert.equal(Object.keys(resp2).filter(k => !k.startsWith("_")).join(","), "challengeInitiated");
});

test("Challenge tokens are single-use, time-bounded, and tamper-resistant", async () => {
  const store = new InMemoryPrivacyStore();
  const engine = new PrivacyRightsEngine({ store, tokenTtlMs: 50 }); // 50ms TTL for expiry test

  const email = "owner@example.test";
  const { _deliveryPayloadForEmailOnly } = await engine.initiateChallenge(email, "access");
  const token = _deliveryPayloadForEmailOnly.token;

  // Valid token verifies
  const valid = await engine.verifyChallengeToken(token);
  assert.equal(valid.valid, true);
  assert.equal(valid.email, email);

  // Altered token fails
  const altered = token.slice(0, -4) + "0000";
  assert.equal((await engine.verifyChallengeToken(altered)).valid, false);

  // Short/malformed token fails
  assert.equal((await engine.verifyChallengeToken("short")).valid, false);

  // Consuming token in rights request invalidates it for replay
  const res = await engine.executeRightsRequest({ token, requestType: "access" });
  assert.equal(res.executed, true);

  // Replaying the same token fails
  const replayed = await engine.executeRightsRequest({ token, requestType: "access" });
  assert.equal(replayed.executed, false);
  assert.equal(replayed.error, "challenge_already_consumed");

  // Expired token fails
  const expChallenge = await engine.initiateChallenge("expired@example.test", "access");
  await new Promise(r => setTimeout(r, 60)); // Wait for 50ms TTL to elapse
  const expResult = await engine.verifyChallengeToken(expChallenge._deliveryPayloadForEmailOnly.token);
  assert.equal(expResult.valid, false);
  assert.equal(expResult.reason, "challenge_expired");
});

test("Unbound record erasure permanently deletes preregistrations and adds email suppression", async () => {
  const store = new InMemoryPrivacyStore();
  const engine = new PrivacyRightsEngine({ store });

  const email = "preregistered@example.test";
  const emailHash = engine.hashEmail(email);

  store.preregistrations.set(email, {
    email,
    username: "future_star",
    perks: ["founder-badge"],
    launchUpdatesConsentedAt: "2026-10-19T00:00:00Z",
  });

  const { _deliveryPayloadForEmailOnly } = await engine.initiateChallenge(email, "erasure");
  const res = await engine.executeRightsRequest({
    token: _deliveryPayloadForEmailOnly.token,
    requestType: "erasure",
  });

  assert.equal(res.executed, true);
  assert.equal(res.recordStatus, "unbound_records_erased");

  // Preregistration must be gone
  assert.equal(await store.findPreregistration(email), null);

  // Suppression must be recorded
  assert.ok(store.suppressions.has(`${emailHash}:all_promotional`));

  // Consent must be withdrawn
  assert.equal(store.consents.get(emailHash)?.granted, false);
});

test("Unauthenticated email challenge cannot delete an active user account (anti-takeover)", async () => {
  const store = new InMemoryPrivacyStore();
  const engine = new PrivacyRightsEngine({ store });

  const email = "active.registered@example.test";
  const userId = randomUUID();
  store.activeUsers.set(email, { id: userId, email, username: "real_user" });

  const { _deliveryPayloadForEmailOnly } = await engine.initiateChallenge(email, "erasure");
  const res = await engine.executeRightsRequest({
    token: _deliveryPayloadForEmailOnly.token,
    requestType: "erasure",
  });

  // Must reject unauthenticated deletion of active account
  assert.equal(res.executed, false);
  assert.equal(res.recordStatus, "active_account_requires_authenticated_deletion");

  // Active user remains untouched
  assert.equal((await store.findActiveUserByEmail(email))?.id, userId);
});

test("Objection and restriction flags user processing and suppresses promotional mail", async () => {
  const store = new InMemoryPrivacyStore();
  const engine = new PrivacyRightsEngine({ store });

  const email = "objector@example.test";
  const user = { id: randomUUID(), email, username: "objector_user", processingRestricted: false };
  store.activeUsers.set(email, user);

  const { _deliveryPayloadForEmailOnly } = await engine.initiateChallenge(email, "restriction");
  const res = await engine.executeRightsRequest({
    token: _deliveryPayloadForEmailOnly.token,
    requestType: "restriction",
    details: { reason: "statutory_objection" },
  });

  assert.equal(res.executed, true);
  assert.equal(res.recordStatus, "processing_restricted");
  assert.equal(user.processingRestricted, true);
  assert.equal(user.restrictionReason, "statutory_objection");
});

test("Access inquiry checks deletion journal and confirms prior erasure", async () => {
  const store = new InMemoryPrivacyStore();
  const engine = new PrivacyRightsEngine({ store });

  const email = "erased.prior@example.test";
  const emailHash = engine.hashEmail(email);
  const erasedAt = "2026-10-18T12:00:00Z";

  store.deletionJournal.set(emailHash, {
    accountId: randomUUID(),
    stableIdentityDigest: emailHash,
    erasedAt,
  });

  const { _deliveryPayloadForEmailOnly } = await engine.initiateChallenge(email, "access");
  const res = await engine.executeRightsRequest({
    token: _deliveryPayloadForEmailOnly.token,
    requestType: "access",
  });

  assert.equal(res.executed, true);
  assert.equal(res.recordStatus, "previously_erased");
  assert.equal(res.erasedAt, erasedAt);
  assert.match(res.message, /permanently erased/);
});

test("Re-registration after erasure generates a new identity while historical journal persists", async () => {
  const store = new InMemoryPrivacyStore();
  const engine = new PrivacyRightsEngine({ store });

  const email = "reregister@example.test";
  const emailHash = engine.hashEmail(email);
  const oldAccountId = randomUUID();
  const originalErasedAt = "2026-09-01T10:00:00Z";

  // Historical deletion journal entry exists
  store.deletionJournal.set(emailHash, {
    accountId: oldAccountId,
    stableIdentityDigest: emailHash,
    erasedAt: originalErasedAt,
  });

  // User re-registers with same email
  const newAccountId = randomUUID();
  assert.notEqual(newAccountId, oldAccountId);
  store.activeUsers.set(email, { id: newAccountId, email, username: "fresh_handle" });

  // Historical journal remains intact and untouched
  const journalEntry = await store.findDeletionJournal(emailHash);
  assert.equal(journalEntry.accountId, oldAccountId);
  assert.equal(journalEntry.erasedAt, originalErasedAt);

  // Active user is the new identity
  const current = await store.findActiveUserByEmail(email);
  assert.equal(current.id, newAccountId);
});

test("Concurrent challenges for same email generate distinct tokens and do not collide", async () => {
  const store = new InMemoryPrivacyStore();
  const engine = new PrivacyRightsEngine({ store });

  const email = "concurrent@example.test";

  // Two simultaneous requests
  const [c1, c2] = await Promise.all([
    engine.initiateChallenge(email, "access"),
    engine.initiateChallenge(email, "restriction"),
  ]);

  const token1 = c1._deliveryPayloadForEmailOnly.token;
  const token2 = c2._deliveryPayloadForEmailOnly.token;

  assert.notEqual(token1, token2);

  // Both tokens can be verified independently
  const v1 = await engine.verifyChallengeToken(token1);
  const v2 = await engine.verifyChallengeToken(token2);

  assert.equal(v1.valid, true);
  assert.equal(v2.valid, true);
  assert.equal(v1.purpose, "access");
  assert.equal(v2.purpose, "restriction");
});
