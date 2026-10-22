import assert from "node:assert/strict";
import { test } from "node:test";
import { env } from "../config/env.js";
import type { EligibilityDecision } from "../eligibility/types.js";
import { EligibilityCapabilityError, EligibilityService } from "../services/eligibility-service.js";
import { CreatorAnalyticsService } from "../services/creator-analytics-service.js";

const decision: EligibilityDecision = {
  experience: "adult_18_plus",
  activated: true,
  capabilities: { social: true, publish: true, messaging: true, payments: true, seller: false,
    memberships: false, live: false, rtc: false, ai: false, analytics: false, profiling: true },
  maximumContentRating: "mature", policyVersions: ["fixture:1"], revision: "fixture", reason: null,
  publicBrowsingAllowed: true,
};

test("creator analytics reads and profile-view writes stop when analytics authority is absent", async t => {
  const originalNodeEnv = env.NODE_ENV;
  env.NODE_ENV = "production";
  t.after(() => { env.NODE_ENV = originalNodeEnv; });
  let decisions = 0;
  const eligibility = { decisionFor: async () => { decisions++; return decision; } } as unknown as EligibilityService;
  const service = new CreatorAnalyticsService(eligibility);

  await assert.rejects(() => service.getRecent("creator-without-analytics"), EligibilityCapabilityError);
  await service.recordProfileView("creator-without-analytics", "adult-viewer");

  assert.equal(decisions, 3, "the read checks creator analytics, and profile-view collection checks both current accounts");
});
