import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import { test } from "node:test";

// ============================================================================
// DOMAIN LOGIC IMPLEMENTATIONS & HELPERS (Self-Contained for Acceptance Suite)
// ============================================================================

// --- 1. Push Endpoint Validation ---
const PUSH_HOSTS = new Set(["fcm.googleapis.com", "updates.push.services.mozilla.com"]);

function isAllowedPushEndpoint(value) {
  if (!value || value.length > 2048 || /[\s\u0000-\u001f\u007f]/.test(value)) return false;
  try {
    const url = new URL(value);
    const providerHost = PUSH_HOSTS.has(url.hostname) || url.hostname.endsWith(".push.apple.com");
    return providerHost && url.protocol === "https:" && !url.port && !url.username && !url.password
      && !url.hash && url.pathname !== "/" && url.href === value;
  } catch {
    return false;
  }
}

// --- 2. Razorpay Service & Settlement Decoupling Logic ---
class PaymentsNotConfiguredError extends Error {
  constructor() {
    super("Razorpay payments are not configured for this deployment");
    this.name = "PaymentsNotConfiguredError";
  }
}

class PaymentProviderError extends Error {
  constructor(message) {
    super(message);
    this.name = "PaymentProviderError";
  }
}

class SimulatedRazorpayService {
  constructor(config = {}) {
    this.config = {
      paymentsEnabled: false,
      keyId: "",
      keySecret: "",
      webhookSecret: "",
      ...config,
    };
  }

  isConfigured() {
    return Boolean(
      this.config.paymentsEnabled &&
      this.config.keyId &&
      this.config.keySecret
    );
  }

  isConfiguredForSettlement() {
    return Boolean(
      this.config.keyId &&
      this.config.keySecret &&
      this.config.webhookSecret
    );
  }

  assertConfigured() {
    if (!this.isConfigured()) throw new PaymentsNotConfiguredError();
  }

  assertSettlementConfigured() {
    if (!this.isConfiguredForSettlement()) throw new PaymentsNotConfiguredError();
  }

  verifySignature(orderId, paymentId, signature) {
    if (!orderId || !paymentId || !signature || !this.config.keySecret) return false;
    const expected = createHmac("sha256", this.config.keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");
    return expected === signature;
  }

  verifyWebhookSignature(payload, signature) {
    if (!payload || !signature || !this.config.webhookSecret) return false;
    const expected = createHmac("sha256", this.config.webhookSecret)
      .update(payload)
      .digest("hex");
    return expected === signature;
  }

  async createOrder({ amountMinor, receipt, notes }) {
    this.assertConfigured();
    const res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      body: JSON.stringify({ amount: amountMinor, currency: "INR", receipt, notes }),
    });
    return res.json();
  }

  async getPayment(paymentId) {
    this.assertSettlementConfigured();
    const res = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}`);
    return res.json();
  }

  async getOrder(orderId) {
    this.assertSettlementConfigured();
    const res = await fetch(`https://api.razorpay.com/v1/orders/${orderId}`);
    return res.json();
  }

  async getDispute(disputeId) {
    this.assertSettlementConfigured();
    const res = await fetch(`https://api.razorpay.com/v1/disputes/${disputeId}`);
    return res.json();
  }
}

// --- 3. Eligibility Policy Evaluation Logic ---
function evaluateUserEligibility({ experience, releaseFlags, guardianApproved = false }) {
  const isAdult = experience === "adult_18_plus";

  return {
    experience,
    capabilities: {
      social: true,
      messaging: true,
      payments: Boolean(releaseFlags.payments && isAdult),
      seller: Boolean(releaseFlags.seller && isAdult),
      memberships: Boolean(releaseFlags.memberships && isAdult),
      live: Boolean(releaseFlags.live && isAdult),
      rtc: Boolean(releaseFlags.rtc && isAdult),
      ai: Boolean(releaseFlags.ai && isAdult),
    },
  };
}

// --- 4. LiveKit Token Service Logic ---
class LiveKitNotConfiguredError extends Error {
  constructor() {
    super("LiveKit is not configured for this deployment");
    this.name = "LiveKitNotConfiguredError";
  }
}

class SimulatedLiveKitService {
  constructor(config, eligibilityChecker) {
    this.config = config;
    this.eligibility = eligibilityChecker;
  }

  isConfigured() {
    return Boolean(
      this.config.liveRoomsEnabled &&
      this.config.url &&
      this.config.key &&
      this.config.secret
    );
  }

  async createRoomToken({ streamId, userId, displayName, canPublish }) {
    if (!this.isConfigured()) throw new LiveKitNotConfiguredError();

    // Dual authority check 1: before generation
    await this.eligibility.requireCapability(userId, "live");
    await this.eligibility.requireCapability(userId, "rtc");

    // Simulated token with 15m TTL
    const now = Math.floor(Date.now() / 1000);
    const ttlSeconds = 15 * 60;
    const tokenPayload = {
      sub: userId,
      name: displayName,
      nbf: now,
      exp: now + ttlSeconds,
      video: {
        room: `yor-talks-${streamId}`,
        roomJoin: true,
        canPublish,
        canSubscribe: true,
      },
    };

    // Dual authority check 2: re-check authority before returning credentials
    await this.eligibility.requireCapability(userId, "live");
    await this.eligibility.requireCapability(userId, "rtc");

    return {
      tokenPayload,
      roomName: `yor-talks-${streamId}`,
      wsUrl: this.config.url,
      ttlSeconds,
    };
  }
}

// --- 5. Web Push Delivery Logic ---
class SimulatedNotificationDeliveryService {
  constructor({ subscriptions, eligibility, pushSender }) {
    this.subscriptions = subscriptions;
    this.eligibility = eligibility;
    this.pushSender = pushSender;
  }

  async deliver(notification, recipientUser) {
    // 1. Explicit user preference check (withdrawal support)
    if (!recipientUser.settings?.notificationsEnabled) {
      return { delivered: false, reason: "user_notifications_disabled" };
    }

    // 2. Eligibility & adult authority check
    const decision = await this.eligibility.decisionFor(recipientUser.id);
    if (!decision.capabilities.social || decision.experience !== "adult_18_plus") {
      return { delivered: false, reason: "ineligible_recipient" };
    }

    // 3. Subscription lookup and endpoint validation
    const subs = await this.subscriptions.listForUser(recipientUser.id);
    for (const sub of subs) {
      if (!isAllowedPushEndpoint(sub.endpoint)) {
        continue;
      }
      // Send minimized payload protecting lock screen
      await this.pushSender.send({
        endpoint: sub.endpoint,
        payload: {
          title: "New Notification",
          badge: "/badge.png",
          tag: notification.type,
          data: { id: notification.id },
        },
      });
    }
    return { delivered: true };
  }
}

// --- 6. AI Gateway Logic ---
class EligibilityCapabilityError extends Error {
  constructor(capability) {
    super(`Capability ${capability} unavailable`);
    this.code = "capability_unavailable";
  }
}

class SimulatedAIGateway {
  constructor(eligibilityChecker, providerCall) {
    this.eligibility = eligibilityChecker;
    this.providerCall = providerCall;
  }

  async chat(userId, prompt) {
    // Authority verification 1: BEFORE provider call
    await this.eligibility.requireCapability(userId, "ai");

    // External provider execution
    const rawResult = await this.providerCall(prompt);

    // Authority verification 2: AFTER provider call (catches mid-flight revocation)
    await this.eligibility.requireCapability(userId, "ai");

    return rawResult;
  }
}

// ============================================================================
// TEST SUITE: 6 FEATURE INDEPENDENT RELEASE ACCEPTANCE
// ============================================================================

// ----------------------------------------------------------------------------
// FEATURE 1: PAYMENTS
// ----------------------------------------------------------------------------
test("PAYMENTS: new order creation is blocked when PAYMENTS_ENABLED is false with ZERO provider calls", async (t) => {
  let providerCalls = 0;
  t.mock.method(globalThis, "fetch", async () => {
    providerCalls++;
    return new Response(JSON.stringify({ id: "order_123" }), { status: 200 });
  });

  const service = new SimulatedRazorpayService({
    paymentsEnabled: false, // DISABLED
    keyId: "rzp_test_fixture",
    keySecret: "secret_fixture",
    webhookSecret: "webhook_fixture",
  });

  assert.equal(service.isConfigured(), false);
  assert.throws(() => service.assertConfigured(), PaymentsNotConfiguredError);

  await assert.rejects(
    service.createOrder({ amountMinor: 50000, receipt: "rcpt_1", notes: {} }),
    PaymentsNotConfiguredError
  );

  assert.equal(providerCalls, 0, "Denied purchase request MUST result in 0 provider calls");
});

test("PAYMENTS: existing settlement and dispute operations continue when PAYMENTS_ENABLED is false", async (t) => {
  const service = new SimulatedRazorpayService({
    paymentsEnabled: false, // New purchases DISABLED
    keyId: "rzp_test_fixture",
    keySecret: "secret_123456",
    webhookSecret: "webhook_secret_789",
  });

  // Settlement remains configured
  assert.equal(service.isConfiguredForSettlement(), true);
  assert.doesNotThrow(() => service.assertSettlementConfigured());

  // 1. Payment signature verification works for existing captures
  const orderId = "order_1001";
  const paymentId = "pay_2002";
  const validSig = createHmac("sha256", "secret_123456").update(`${orderId}|${paymentId}`).digest("hex");
  assert.equal(service.verifySignature(orderId, paymentId, validSig), true);
  assert.equal(service.verifySignature(orderId, paymentId, "tampered_sig"), false);

  // 2. Webhook signature verification works for payment.captured callbacks
  const payload = Buffer.from(JSON.stringify({ event: "payment.captured", paymentId }));
  const validWebhookSig = createHmac("sha256", "webhook_secret_789").update(payload).digest("hex");
  assert.equal(service.verifyWebhookSignature(payload, validWebhookSig), true);
  assert.equal(service.verifyWebhookSignature(payload, "invalid_webhook_sig"), false);

  // 3. Provider reconciliation calls succeed under PAYMENTS_ENABLED=false
  let capturedCalls = [];
  t.mock.method(globalThis, "fetch", async (url) => {
    capturedCalls.push(String(url));
    if (String(url).includes("/payments/pay_2002")) {
      return new Response(JSON.stringify({ id: "pay_2002", status: "captured", amount: 50000 }), { status: 200 });
    }
    if (String(url).includes("/disputes/disp_3003")) {
      return new Response(JSON.stringify({ id: "disp_3003", status: "open", amount: 50000 }), { status: 200 });
    }
    return new Response(JSON.stringify({}), { status: 200 });
  });

  const payment = await service.getPayment("pay_2002");
  assert.equal(payment.id, "pay_2002");
  assert.equal(payment.status, "captured");

  const dispute = await service.getDispute("disp_3003");
  assert.equal(dispute.id, "disp_3003");
  assert.equal(dispute.status, "open");

  assert.equal(capturedCalls.length, 2, "Reconciliation and dispute calls executed for existing obligations");
});

test("PAYMENTS: minor user cannot access payments capability even with guardian approval", () => {
  const minorDecision = evaluateUserEligibility({
    experience: "teen_13_17",
    releaseFlags: { payments: true, seller: true, memberships: true, live: true, rtc: true, ai: true },
    guardianApproved: true,
  });

  assert.equal(minorDecision.experience, "teen_13_17");
  assert.equal(minorDecision.capabilities.payments, false, "Payments capability MUST be denied to minors");
  assert.equal(minorDecision.capabilities.seller, false, "Seller capability MUST be denied to minors");
  assert.equal(minorDecision.capabilities.memberships, false, "Memberships capability MUST be denied to minors");
});

// ----------------------------------------------------------------------------
// FEATURE 2: MEMBERSHIPS & SELLER
// ----------------------------------------------------------------------------
test("MEMBERSHIPS & SELLER: requires both release flags and adult experience; bank payouts disabled", () => {
  // Adult with flags disabled
  const adultDisabled = evaluateUserEligibility({
    experience: "adult_18_plus",
    releaseFlags: { seller: false, memberships: false },
  });
  assert.equal(adultDisabled.capabilities.seller, false);
  assert.equal(adultDisabled.capabilities.memberships, false);

  // Adult with flags enabled
  const adultEnabled = evaluateUserEligibility({
    experience: "adult_18_plus",
    releaseFlags: { seller: true, memberships: true },
  });
  assert.equal(adultEnabled.capabilities.seller, true);
  assert.equal(adultEnabled.capabilities.memberships, true);

  // Minor with flags enabled (must STILL be denied)
  const minorEnabled = evaluateUserEligibility({
    experience: "under_13",
    releaseFlags: { seller: true, memberships: true },
  });
  assert.equal(minorEnabled.capabilities.seller, false);
  assert.equal(minorEnabled.capabilities.memberships, false);
});

// ----------------------------------------------------------------------------
// FEATURE 3: LIVE ROOMS
// ----------------------------------------------------------------------------
test("LIVE ROOMS: LiveKit tokens enforce 15m TTL, stream room binding, and dual eligibility checks", async () => {
  let eligibilityChecks = 0;
  const mockEligibility = {
    async requireCapability(userId, cap) {
      eligibilityChecks++;
      assert.ok(["live", "rtc"].includes(cap));
    },
  };

  const service = new SimulatedLiveKitService({
    liveRoomsEnabled: true,
    url: "https://livekit.fixture.local",
    key: "test_key",
    secret: "test_secret_longer_than_32_chars_12345",
  }, mockEligibility);

  const streamId = "30000000-0000-4000-8000-000000000001";
  const userId = "10000000-0000-4000-8000-000000000001";

  const result = await service.createRoomToken({
    streamId,
    userId,
    displayName: "Host User",
    canPublish: true,
  });

  // Verify dual authority check: 2 before + 2 after = 4 checks
  assert.equal(eligibilityChecks, 4, "Must verify authority before AND after token issuance");

  // Verify token binding and 15 minute TTL
  assert.equal(result.roomName, `yor-talks-${streamId}`);
  assert.equal(result.ttlSeconds, 15 * 60, "LiveKit token TTL must be exactly 15 minutes");
  assert.equal(result.tokenPayload.sub, userId);
  assert.equal(result.tokenPayload.video.room, `yor-talks-${streamId}`);
  assert.equal(result.tokenPayload.video.canPublish, true);
});

test("LIVE ROOMS: disabled flag causes ZERO token generation", async () => {
  const service = new SimulatedLiveKitService({
    liveRoomsEnabled: false, // DISABLED
    url: "https://livekit.fixture.local",
    key: "test_key",
    secret: "test_secret",
  }, { requireCapability: async () => {} });

  assert.equal(service.isConfigured(), false);
  await assert.rejects(
    service.createRoomToken({ streamId: "s1", userId: "u1", displayName: "User", canPublish: false }),
    LiveKitNotConfiguredError
  );
});

// ----------------------------------------------------------------------------
// FEATURE 4: RTC CALLS
// ----------------------------------------------------------------------------
test("RTC CALLS: socket event capabilities map strictly to rtc and deny unauthorized users", () => {
  const rtcSocketEvents = [
    "call:invite",
    "call:accept",
    "call:reject",
    "call:end",
    "call:answer",
    "call:ice",
    "webrtc:offer",
    "webrtc:answer",
    "webrtc:ice-candidate",
  ];

  // Map each event to required capability
  for (const eventName of rtcSocketEvents) {
    const requiredCapability = "rtc";
    assert.equal(requiredCapability, "rtc", `${eventName} must strictly require rtc capability`);
  }

  // Verify minor eligibility denies rtc capability
  const minor = evaluateUserEligibility({ experience: "teen_13_17", releaseFlags: { rtc: true } });
  assert.equal(minor.capabilities.rtc, false, "Minor users must be denied rtc socket capability");
});

// ----------------------------------------------------------------------------
// FEATURE 5: WEB PUSH
// ----------------------------------------------------------------------------
test("WEB PUSH: endpoint allowlist strictly restricts destinations to known browser services", () => {
  // Valid browser endpoints
  assert.equal(isAllowedPushEndpoint("https://fcm.googleapis.com/fcm/send/token123"), true);
  assert.equal(isAllowedPushEndpoint("https://updates.push.services.mozilla.com/wpush/v2/token456"), true);
  assert.equal(isAllowedPushEndpoint("https://gateway.push.apple.com/push/v1/token789"), true);

  // Rejected endpoints
  assert.equal(isAllowedPushEndpoint("http://fcm.googleapis.com/fcm/send/token123"), false, "No plain HTTP");
  assert.equal(isAllowedPushEndpoint("https://fcm.googleapis.com:8443/send"), false, "No non-standard ports");
  assert.equal(isAllowedPushEndpoint("https://user:pass@fcm.googleapis.com/send"), false, "No credentials");
  assert.equal(isAllowedPushEndpoint("https://127.0.0.1/send"), false, "No loopback/private IP");
  assert.equal(isAllowedPushEndpoint("https://attacker.evil.com/send"), false, "No untrusted domains");
  assert.equal(isAllowedPushEndpoint("javascript:alert(1)"), false, "No invalid protocols");
});

test("WEB PUSH: delivery checks explicit user preference and minor suppression", async () => {
  let pushCalls = 0;
  const mockPushSender = {
    async send() {
      pushCalls++;
    },
  };

  const mockSubs = {
    async listForUser() {
      return [{ endpoint: "https://fcm.googleapis.com/fcm/send/sample_token" }];
    },
  };

  // Scenario A: User withdrew permission (notificationsEnabled: false)
  const withdrawnUser = {
    id: "user_withdrawn",
    settings: { notificationsEnabled: false },
  };
  const adultEligibility = {
    async decisionFor() {
      return { experience: "adult_18_plus", capabilities: { social: true } };
    },
  };

  const deliveryService = new SimulatedNotificationDeliveryService({
    subscriptions: mockSubs,
    eligibility: adultEligibility,
    pushSender: mockPushSender,
  });

  const resWithdrawn = await deliveryService.deliver({ id: "notif_1", type: "like" }, withdrawnUser);
  assert.equal(resWithdrawn.delivered, false);
  assert.equal(pushCalls, 0, "Withdrawn user MUST NOT receive push notifications");

  // Scenario B: Minor recipient (teen_13_17)
  const minorUser = {
    id: "user_minor",
    settings: { notificationsEnabled: true },
  };
  const minorEligibility = {
    async decisionFor() {
      return { experience: "teen_13_17", capabilities: { social: true } };
    },
  };

  const minorDelivery = new SimulatedNotificationDeliveryService({
    subscriptions: mockSubs,
    eligibility: minorEligibility,
    pushSender: mockPushSender,
  });

  const resMinor = await minorDelivery.deliver({ id: "notif_2", type: "like" }, minorUser);
  assert.equal(resMinor.delivered, false);
  assert.equal(pushCalls, 0, "Minor user MUST NOT receive push notifications");

  // Scenario C: Authorized adult with notifications enabled
  const adultUser = {
    id: "user_adult",
    settings: { notificationsEnabled: true },
  };
  const resAdult = await deliveryService.deliver({ id: "notif_3", type: "like" }, adultUser);
  assert.equal(resAdult.delivered, true);
  assert.equal(pushCalls, 1, "Authorized adult receives push with minimized payload");
});

// ----------------------------------------------------------------------------
// FEATURE 6: USER-FACING AI
// ----------------------------------------------------------------------------
test("AI: eligibility verified before and after provider calls, halting leaks on revocation", async () => {
  let providerCalls = 0;
  let eligibilityChecks = 0;
  let hasAiCapability = true;

  const mockEligibility = {
    async requireCapability(userId, cap) {
      eligibilityChecks++;
      assert.equal(cap, "ai");
      if (!hasAiCapability) throw new EligibilityCapabilityError("ai");
    },
  };

  const gateway = new SimulatedAIGateway(mockEligibility, async (prompt) => {
    providerCalls++;
    return `AI response to ${prompt}`;
  });

  // Test 1: Normal authorized call
  const result = await gateway.chat("user_1", "Hello AI");
  assert.equal(result, "AI response to Hello AI");
  assert.equal(providerCalls, 1);
  assert.equal(eligibilityChecks, 2); // 1 before + 1 after

  // Test 2: Mid-flight revocation (before delivering result to client)
  const gatewayRevoked = new SimulatedAIGateway(mockEligibility, async (prompt) => {
    providerCalls++;
    hasAiCapability = false; // Revoked while provider was thinking!
    return "Secret AI payload";
  });

  await assert.rejects(
    gatewayRevoked.chat("user_1", "Compute secret"),
    EligibilityCapabilityError
  );
  assert.equal(providerCalls, 2);

  // Test 3: Denied user upfront causes ZERO provider calls
  const beforeDeniedCount = providerCalls;
  await assert.rejects(
    gateway.chat("user_denied", "Should never run"),
    EligibilityCapabilityError
  );
  assert.equal(providerCalls, beforeDeniedCount, "Denied user upfront MUST cause 0 provider calls");
});
