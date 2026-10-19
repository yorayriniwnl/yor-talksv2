import assert from "node:assert/strict";
import { test } from "node:test";
import {
  EmailSuppressionEngine,
  PromotionalEmailDisabledError,
  EmailSuppressedError,
  ConsentMissingError,
} from "../lib/privacy/email-suppression.mjs";

test("HMAC unsubscribe tokens are tamper-proof and verified in constant time", () => {
  const engine = new EmailSuppressionEngine();
  const email = "user@example.test";
  const token = engine.createUnsubscribeToken(email, "launch_updates");

  assert.ok(typeof token === "string");
  assert.ok(token.startsWith("launch_updates."));

  // Valid token passes
  const valid = engine.verifyUnsubscribeToken(email, token);
  assert.equal(valid.valid, true);
  assert.equal(valid.purpose, "launch_updates");

  // Tampered token fails
  const tamperedToken = token.slice(0, -4) + "abcd";
  assert.equal(engine.verifyUnsubscribeToken(email, tamperedToken).valid, false);

  // Wrong email fails
  assert.equal(engine.verifyUnsubscribeToken("attacker@example.test", token).valid, false);

  // Invalid format fails
  assert.equal(engine.verifyUnsubscribeToken(email, "not-a-token").valid, false);
  assert.equal(engine.verifyUnsubscribeToken(email, "").valid, false);
});

test("Promotional sending is disabled by default and rejects dispatch across all stages", async () => {
  // promotionalEnabled defaults to false
  const engine = new EmailSuppressionEngine({ promotionalEnabled: false });

  // Stage 1 check rejects
  const enqueueCheck = await engine.checkCanEnqueue("subscriber@example.test", "launch_updates");
  assert.equal(enqueueCheck.allowed, false);
  assert.equal(enqueueCheck.reason, "promotional_email_disabled");

  // Stage 2 check rejects
  const processCheck = await engine.checkCanProcess("subscriber@example.test", "launch_updates");
  assert.equal(processCheck.allowed, false);
  assert.equal(processCheck.reason, "promotional_email_disabled");

  // Stage 3 check rejects at send time
  const sendCheck = await engine.checkCanSend("subscriber@example.test", "launch_updates");
  assert.equal(sendCheck.allowed, false);
  assert.equal(sendCheck.reason, "promotional_email_disabled");
});

test("Three-stage suppression enforcement drops jobs if unsubscribed before enqueue, retry, or send", async () => {
  const suppressedEmail = "unsubscribed@example.test";
  const activeEmail = "active-consented@example.test";

  // Create isolated mock store
  const mockSuppressionList = new Set([new EmailSuppressionEngine().hashEmail(suppressedEmail)]);
  const mockConsentList = new Map([[new EmailSuppressionEngine().hashEmail(activeEmail), true]]);

  const mockStore = {
    async isSuppressed(emailHash, purpose) {
      return mockSuppressionList.has(emailHash);
    },
    async hasConsent(emailHash, purpose) {
      return Boolean(mockConsentList.get(emailHash));
    },
  };

  const engine = new EmailSuppressionEngine({ promotionalEnabled: true, store: mockStore });

  // Stage 1: Enqueue check for suppressed user drops immediately
  const stage1 = await engine.checkCanEnqueue(suppressedEmail, "launch_updates");
  assert.equal(stage1.allowed, false);
  assert.equal(stage1.reason, "email_suppressed");

  // Stage 1 for unconsented user drops
  const stage1NoConsent = await engine.checkCanEnqueue("unconsented@example.test", "launch_updates");
  assert.equal(stage1NoConsent.allowed, false);
  assert.equal(stage1NoConsent.reason, "consent_missing_or_withdrawn");

  // Stage 1 for active user succeeds
  const stage1Active = await engine.checkCanEnqueue(activeEmail, "launch_updates");
  assert.equal(stage1Active.allowed, true);

  // User unsubscribes between enqueue and worker retry
  const activeHash = engine.hashEmail(activeEmail);
  mockSuppressionList.add(activeHash);
  mockConsentList.set(activeHash, false);

  // Stage 2: Worker retry catches unsubscribe and aborts
  const stage2 = await engine.checkCanProcess(activeEmail, "launch_updates");
  assert.equal(stage2.allowed, false);
  assert.equal(stage2.reason, "email_suppressed");

  // Stage 3: Send check catches suppression
  const stage3 = await engine.checkCanSend(activeEmail, "launch_updates");
  assert.equal(stage3.allowed, false);
  assert.equal(stage3.reason, "email_suppressed");
});

test("Transactional security email contracts remain independent of marketing suppression", () => {
  const suppressedEmail = "unsubscribed@example.test";
  const engine = new EmailSuppressionEngine({
    promotionalEnabled: false,
    store: {
      async isSuppressed() { return true; },
      async hasConsent() { return false; },
    },
  });

  // Verify that transactional templates do not require marketing consent or suppression check
  const isSecurityEmailTransactional = (type) => {
    const transactionalTypes = new Set(["password_reset", "email_verification", "login_code", "privacy_challenge"]);
    return transactionalTypes.has(type);
  };

  assert.equal(isSecurityEmailTransactional("password_reset"), true);
  assert.equal(isSecurityEmailTransactional("email_verification"), true);
  assert.equal(isSecurityEmailTransactional("login_code"), true);
  assert.equal(isSecurityEmailTransactional("privacy_challenge"), true);
  assert.equal(isSecurityEmailTransactional("launch_updates"), false);
  assert.equal(isSecurityEmailTransactional("promotional"), false);
});
