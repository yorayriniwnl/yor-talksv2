import assert from "node:assert/strict";
import { test } from "node:test";
import {
  PREMIUM_FEATURES,
  resolveFeatureFlags,
  type PremiumFeature,
} from "../features/premium-features.js";
import {
  FeatureEntitlementService,
  type FeatureOverrideRepository,
} from "../services/feature-entitlement-service.js";
import { evaluateAudience } from "../utils/audience-policy.js";

test("the advanced catalog is closed and defaults can be overridden by explicit flags", () => {
  assert.ok(PREMIUM_FEATURES.includes("STORY_PRIVATE_VIEW"));
  assert.ok(PREMIUM_FEATURES.includes("STORY_VIEW_TIMESTAMPS"));
  const flags = resolveFeatureFlags({
    YOR_ADVANCED_DEFAULT_ENABLED: "false",
    YOR_FEATURE_STORY_PRIVATE_VIEW: "true",
  });

  assert.equal(flags.STORY_PRIVATE_VIEW, true);
  assert.equal(flags.MESSAGE_FONT, false);
  assert.equal(Object.keys(flags).length, PREMIUM_FEATURES.length);
});

test("an active user override wins over the rollout default and an expired override does not", async () => {
  const overrides = new Map<string, { enabled: boolean; expiresAt: string | null }>([
    ["user:STORY_PRIORITY", { enabled: true, expiresAt: null }],
    ["user:SUPER_HEART", { enabled: true, expiresAt: "2020-01-01T00:00:00.000Z" }],
  ]);
  const repository: FeatureOverrideRepository = {
    findActiveOverride: async (userId: string, feature: PremiumFeature) => {
      const item = overrides.get(`${userId}:${feature}`);
      return item ? { ...item, feature } : undefined;
    },
  };
  const service = new FeatureEntitlementService(repository, resolveFeatureFlags({
    YOR_ADVANCED_DEFAULT_ENABLED: "false",
    YOR_FEATURE_STORY_PRIORITY: "false",
    YOR_FEATURE_SUPER_HEART: "false",
  }));

  assert.equal(await service.hasFeature("user", "STORY_PRIORITY"), true);
  assert.equal(await service.hasFeature("user", "SUPER_HEART"), false);
  assert.equal(await service.hasFeature("user", "MESSAGE_FONT"), false);
});

test("audience policy applies blocks before every inclusion rule", () => {
  const base = {
    ownerId: "owner",
    viewerId: "viewer",
    isFollowing: true,
    isCloseFriend: true,
    selectedMember: true,
    excluded: false,
    blocked: false,
  };

  assert.equal(evaluateAudience({ ...base, audience: "public" }).allowed, true);
  assert.equal(evaluateAudience({ ...base, audience: "followers" }).allowed, true);
  assert.equal(evaluateAudience({ ...base, audience: "close_friends" }).allowed, true);
  assert.equal(evaluateAudience({ ...base, audience: "selected_people" }).allowed, true);
  assert.equal(evaluateAudience({ ...base, audience: "everyone_except", excluded: true }).allowed, false);
  assert.equal(evaluateAudience({ ...base, audience: "public", blocked: true }).allowed, false);
  assert.equal(evaluateAudience({ ...base, ownerId: "viewer", audience: "selected_people", blocked: true }).allowed, false);
});
