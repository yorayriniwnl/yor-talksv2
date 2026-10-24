import assert from "node:assert/strict";
import { test } from "node:test";
import type { ApprovedTerritoryPolicy, EligibilityFacts, EligibilityDecision, ReleaseFlags } from "../eligibility/types.js";
import type { EligibilityRepository } from "../repositories/eligibility-repository.js";
import { EligibilityService } from "../services/eligibility-service.js";
import { PaymentService } from "../services/payment-service.js";
import { PlatformPremiumService } from "../services/platform-premium-service.js";
import { SubscriptionService } from "../services/subscription-service.js";
import { MarketplaceService } from "../services/marketplace-service.js";
import { ProductService } from "../services/product-service.js";
import { LiveStreamService } from "../services/live-stream-service.js";
import { LiveKitService } from "../services/livekit-service.js";
import { AIService } from "../services/ai-service.js";
import { ProductAnalyticsService } from "../services/product-analytics-service.js";
import { UserService } from "../services/user-service.js";
import { NotificationService } from "../services/notification-service.js";
import { NotificationDeliveryService } from "../services/notification-delivery-service.js";
import { AuthService } from "../services/auth-service.js";
import { MessageService } from "../services/message-service.js";
import type { NotificationRecord, UserRecord } from "../types/index.js";

const now = new Date("2026-10-14T12:00:00Z");
const releases: ReleaseFlags = { payments: false, seller: false, memberships: false, live: false, rtc: false, ai: false };
const allCapabilities = { social: true, publish: true, messaging: true, payments: true, seller: true,
  memberships: true, live: true, rtc: true, ai: true, analytics: false, profiling: false };

function policy(overrides: Partial<ApprovedTerritoryPolicy> = {}): ApprovedTerritoryPolicy {
  return {
    id: "fixture-recipient", scope: "recipient", territory: "ZZ", version: "fixture-1", approved: true,
    synthetic: true, approvalReference: "synthetic-policy-approval", effectiveFrom: "2026-10-01T00:00:00Z",
    reviewExpiresAt: "2026-11-01T00:00:00Z", sources: ["https://legal.example/fixture"],
    allowedExperiences: ["under_13", "teen_13_17", "adult_18_plus"], minimumAccessThreshold: null,
    independentConsentThreshold: 13, guardianRequiredBelow: null, requiredGuardianPurposes: ["account_activation"],
    guardianNoticeVersions: { account_activation: "notice-1" }, currentTermsVersion: "terms-1",
    guardianContactsRequired: true, publicBrowsingAllowed: true, maximumContentRating: "mature",
    capabilities: { ...allCapabilities }, ...overrides,
  };
}

function adultFacts(id = "fixture-account"): EligibilityFacts {
  return {
    account: { id, status: "active", termsVersion: "terms-1", termsAcceptedAt: "2026-10-01T00:00:00Z", contentPreference: "mature" },
    revision: "1", currentTermsVersion: "terms-1", releaseFlags: { payments: true, seller: true, memberships: true, live: true, rtc: true, ai: true },
    territoryContext: { declaredTerritory: "ZZ", verifiedTerritory: "ZZ", operatorPolicyIds: ["fixture-operator"] },
    assessment: { id: "fixture-proof", userId: id, status: "verified", issuer: "isolated-fixture", method: "synthetic-thresholds",
      experience: "adult_18_plus", thresholds: [{ age: 13, atLeast: true }, { age: 18, atLeast: true }], territory: "ZZ",
      policyVersions: { "fixture-recipient": "fixture-1", "fixture-operator": "fixture-1" },
      verifiedAt: "2026-10-01T00:00:00Z", expiresAt: "2026-11-01T00:00:00Z", evidenceReference: "opaque-fixture-reference" },
    guardianAuthorizations: [],
  };
}

function makeEligibility(facts: EligibilityFacts | undefined, releaseFlags = releases) {
  const repo = { readFacts: async () => facts } as unknown as EligibilityRepository;
  return new EligibilityService(repo, {
    policies: () => [policy(), policy({ id: "fixture-operator", scope: "operator", territory: "EE" })],
    operatorPolicyIds: ["fixture-operator"], currentTermsVersion: "terms-1", releaseFlags, clock: () => now,
  });
}

const unknownEligibility = () => makeEligibility(undefined);

function notification(recipientId: string): Omit<NotificationRecord, "id" | "createdAt" | "readAt"> {
  return { recipientId, type: "test", title: "Test", message: "Test", relatedId: null, channel: "push" };
}

test("unknown actors and adults with unreleased features stop purchase, seller, live and AI entry points before providers", async () => {
  let providerCalls = 0;
  const razorpay = { assertConfigured() {}, createOrder: async () => { providerCalls++; return {}; } } as any;
  const unknown = unknownEligibility();
  const releasesOff = makeEligibility(adultFacts(), releases);

  await assert.rejects(() => new PaymentService(razorpay, unknown).createTipOrder({ payerId: "unknown", creatorId: "creator", amountMinor: 100 }));
  await assert.rejects(() => new PaymentService(razorpay, releasesOff).createTipOrder({ payerId: "adult", creatorId: "creator", amountMinor: 100 }));
  await assert.rejects(() => new PlatformPremiumService(razorpay, unknown).createOrder("unknown", { idempotencyKey: "x", acceptedTermsVersion: "x", acceptedPriceMinor: 1 }));
  await assert.rejects(() => new SubscriptionService(razorpay, unknown).createOrder({ subscriberId: "unknown", creatorId: "creator", tier: "chai" }));
  await assert.rejects(() => new MarketplaceService(razorpay, undefined, unknown).createOrder({ buyerId: "unknown", productId: "product", shippingName: "x", shippingAddress: "x" }));

  let moderationCalls = 0;
  const productRepo = { create: async () => { throw new Error("listing must not be created"); } } as any;
  const ai = { moderate: async () => { moderationCalls++; return { spam: false, toxicity: false, nsfw: false }; } } as any;
  await assert.rejects(() => new ProductService(productRepo, ai, undefined, unknown).createProduct({
    sellerId: "unknown", title: "Listing", description: "Description", price: 100, category: "art", condition: "new",
  }));

  const liveRepo = { create: async () => { throw new Error("stream must not be created"); } } as any;
  const liveKit = { isConfigured: () => true } as any;
  await assert.rejects(() => new LiveStreamService(liveRepo, liveKit, undefined, ai, unknown).createStream({
    hostId: "unknown", title: "Live", kind: "talk", startsAt: now.toISOString(), category: "community",
  }));
  await assert.rejects(() => new LiveKitService(unknown).createRoomToken({ streamId: "s", userId: "unknown", displayName: "Unknown", canPublish: false }));
  await assert.rejects(() => new AIService(unknown).recommend("unknown", "content"));
  await assert.rejects(() => new AIService(unknown).tag("unknown", "#content"));
  assert.equal(providerCalls, 0);
  assert.equal(moderationCalls, 0);
});

test("a current withdrawal during awaited moderation prevents live stream persistence", async () => {
  let checks = 0;
  const eligibility = {
    requireCapability: async () => {
      checks++;
      if (checks > 1) throw new Error("capability unavailable");
      return {};
    },
  } as unknown as EligibilityService;
  let moderationFinished!: () => void;
  const moderationStarted = new Promise<void>(resolve => { moderationFinished = resolve; });
  const ai = { moderate: async () => { await moderationStarted; return { spam: false, toxicity: false, nsfw: false }; } } as any;
  let writes = 0;
  const repo = { create: async () => { writes++; return {}; } } as any;
  const service = new LiveStreamService(repo, { isConfigured: () => true } as any, undefined, ai, eligibility);
  const pending = service.createStream({ hostId: "adult", title: "Live", kind: "talk", startsAt: now.toISOString(), category: "community" });
  await new Promise(resolve => setImmediate(resolve));
  moderationFinished();
  await assert.rejects(() => pending, /capability unavailable/);
  assert.equal(checks, 2);
  assert.equal(writes, 0);
});

test("minor settings and privacy writes clamp every optional collection and discovery preference", async () => {
  const minorDecision: EligibilityDecision = {
    experience: "teen_13_17", activated: true,
    capabilities: { ...allCapabilities, payments: false, seller: false, memberships: false, live: false, rtc: false, ai: false,
      analytics: false, profiling: false }, maximumContentRating: "regular", policyVersions: [], revision: "r1", reason: null,
    publicBrowsingAllowed: true,
  };
  const eligibility = { decisionFor: async () => minorDecision } as unknown as EligibilityService;
  let savedSettings: Record<string, unknown> | undefined;
  let savedPrivacy: Record<string, unknown> | undefined;
  const user = { id: "minor", settings: {}, privacy: {} } as any;
  const userRepo = {
    findById: async () => ({ id: "minor", settings: { notificationsEnabled: true } }),
    patchSettings: async (_id: string, settings: Record<string, unknown>) => { savedSettings = settings; return user; },
    patchPrivacy: async (_id: string, privacy: Record<string, unknown>) => { savedPrivacy = privacy; return user; },
  } as any;
  const service = new UserService(userRepo, undefined, undefined, undefined, undefined, undefined, eligibility);
  await service.updateSettings("minor", { privateAccount: false, notificationsEnabled: true, autoplayEnabled: true,
    readReceiptsEnabled: true, streaksEnabled: true, sharePreciseLocation: true, contentFilter: "mature" });
  assert.equal(savedSettings?.privateAccount, true);
  assert.equal(savedSettings?.notificationsEnabled, false);
  assert.equal(savedSettings?.autoplayEnabled, false);
  assert.equal(savedSettings?.readReceiptsEnabled, false);
  assert.equal(savedSettings?.streaksEnabled, false);
  assert.equal(savedSettings?.sharePreciseLocation, false);
  assert.equal(savedSettings?.contentFilter, "child_safe");

  const profileRepository = { findById: async () => ({ id: "minor", username: "minor", location: "123 exact street",
    settings: { privateAccount: false }, privacy: { profileVisibility: "public" } }), isFollowing: async () => true } as any;
  const profileService = new UserService(profileRepository, undefined, undefined, { canView: async () => true } as any,
    undefined, undefined, eligibility);
  const visibleProfile = await profileService.getProfile("minor", "adult-viewer");
  assert.equal(JSON.stringify(visibleProfile).includes("123 exact street"), false);

  const auth = new AuthService(userRepo, undefined, undefined, undefined, undefined, undefined, undefined, eligibility);
  await auth.updatePrivacy("minor", { profileVisibility: "public", messageRequests: true, allowDmFromStrangers: true });
  assert.deepEqual(savedPrivacy, { profileVisibility: "private", messageRequests: false, allowDmFromStrangers: false });

  const notificationRepo = { create: async (value: any) => value } as any;
  const notifications = new NotificationService(notificationRepo, eligibility, userRepo);
  const created = await notifications.createNotification(notification("minor"));
  assert.equal(created.channel, "in_app");
});

test("withdrawn or unknown eligibility cannot ingest analytics or dispatch push notifications", async () => {
  const unknown = unknownEligibility();
  const events = [{ eventId: "3d6f2f91-32bb-45bc-bf1f-7f0e40a3b8a0", schemaVersion: 1 as const,
    eventName: "navigation" as const, occurredAt: now.toISOString(), properties: {} }];
  await assert.rejects(() => new ProductAnalyticsService(unknown).ingest("unknown", events));
  assert.equal(await new ProductAnalyticsService(unknown).ingest(null, events), 0);

  let subscriptionReads = 0;
  const delivery = new NotificationDeliveryService({ listForUser: async () => { subscriptionReads++; return []; } } as any,
    unknown, { findById: async () => ({ id: "unknown", settings: { notificationsEnabled: true } }) } as any);
  await delivery.deliver({ id: "n", ...notification("unknown"), createdAt: now.toISOString(), readAt: null } as NotificationRecord,
    { id: "unknown", settings: { notificationsEnabled: true } } as UserRecord);
  assert.equal(subscriptionReads, 0);
});

test("minors can read messages without storing a sender-visible read receipt", async () => {
  const minorDecision: EligibilityDecision = { experience: "teen_13_17", activated: true,
    capabilities: { ...allCapabilities, payments: false, seller: false, memberships: false, live: false, rtc: false, ai: false,
      analytics: false, profiling: false }, maximumContentRating: "regular", policyVersions: [], revision: "r1", reason: null,
    publicBrowsingAllowed: true };
  let readWrites = 0;
  const message = { id: "message", conversationId: "conversation", senderId: "sender", recipientId: "minor",
    content: "hello", createdAt: now.toISOString(), seenAt: null, deletedAt: null, expiresAt: null } as any;
  const service = new MessageService(
    { getMembers: async () => ["minor", "sender"], findById: async () => ({ isGroup: false }) } as any,
    { findVisibleById: async () => message, recordVisibleRead: async () => { readWrites++; return message; } } as any,
    { findById: async () => ({ id: "minor", settings: { readReceiptsEnabled: true } }) } as any,
    undefined, undefined, { requirePairwiseContacts: async () => {} } as any,
    { decisionFor: async () => minorDecision } as any,
  );
  const result = await service.markSeen("message", "minor");
  assert.equal(result?.seenAt, null);
  assert.equal(readWrites, 0);
});

test("adult account remains blocked when the server release flag for payments is off", async () => {
  const facts = adultFacts();
  const eligibility = makeEligibility(facts, { ...releases, payments: false });
  const decision = await eligibility.decisionFor(facts.account.id);
  assert.equal(decision.activated, true);
  assert.equal(decision.experience, "adult_18_plus");
  assert.equal(decision.capabilities.payments, false);
  await assert.rejects(() => eligibility.requireCapability(facts.account.id, "payments"), /Capability unavailable/);
});

test("verified guardian authority activates only the child's allowed social ceiling, never gated features", async () => {
  const facts = adultFacts("fixture-child");
  facts.assessment = { ...facts.assessment!, experience: "under_13",
    thresholds: [{ age: 13, atLeast: false }, { age: 18, atLeast: false }] };
  facts.guardianAuthorizations = [{ id: "guardian-grant", userId: facts.account.id, guardianUserId: "fixture-parent",
    guardianReference: "private-parent-reference", issuer: "isolated-fixture", responsibilityReference: "private-responsibility-reference",
    status: "granted", subjectRevision: "1", purposes: ["account_activation"],
    noticeVersions: { account_activation: "notice-1" }, policyVersions: { "fixture-recipient": "fixture-1", "fixture-operator": "fixture-1" },
    verifiedAt: "2026-10-01T00:00:00Z", grantedAt: "2026-10-01T00:00:00Z", expiresAt: "2026-11-01T00:00:00Z", withdrawnAt: null }];
  const allReleases: ReleaseFlags = { payments: true, seller: true, memberships: true, live: true, rtc: true, ai: true };
  const eligibility = makeEligibility(facts, allReleases);
  const decision = await eligibility.decisionFor(facts.account.id);
  assert.equal(decision.activated, true);
  assert.equal(decision.experience, "under_13");
  for (const capability of ["payments", "seller", "memberships", "live", "rtc", "ai"] as const) {
    assert.equal(decision.capabilities[capability], false);
    await assert.rejects(() => eligibility.requireCapability(facts.account.id, capability), /Capability unavailable/);
  }
});
