import assert from "node:assert/strict";
import { test } from "node:test";
import {
  assertPremiumProfileSelection,
  canAddProfilePin,
  PREMIUM_APP_ICONS,
  PREMIUM_BIO_STYLES,
  PREMIUM_MESSAGE_STYLES,
  PREMIUM_STORY_STYLES,
  requiredPremiumFeatures,
} from "../features/premium-profile.js";
import { UserService, PremiumProfileFeatureUnavailableError } from "../services/user-service.js";
import type { UserRepository } from "../repositories/user-repository.js";
import type { FeatureEntitlementService } from "../services/feature-entitlement-service.js";
import type { UserRecord } from "../types/index.js";

test("premium profile styles come from a curated safe catalog", () => {
  assert.ok(PREMIUM_BIO_STYLES.some((style) => style.id === "editorial"));
  assert.ok(PREMIUM_MESSAGE_STYLES.some((style) => style.id === "mono"));
  assert.ok(PREMIUM_STORY_STYLES.some((style) => style.id === "cinematic"));
  assert.ok(PREMIUM_APP_ICONS.some((icon) => icon.id === "crimson"));
  assert.deepEqual(assertPremiumProfileSelection({
    bioStyleId: "editorial",
    messageFontId: "mono",
    storyFontId: "cinematic",
    appIconId: "crimson",
  }), {
    bioStyleId: "editorial",
    messageFontId: "mono",
    storyFontId: "cinematic",
    appIconId: "crimson",
  });
  assert.throws(() => assertPremiumProfileSelection({ bioStyleId: "url(javascript:alert(1))" }), /unsupported/);
});

test("profile pin capacity stops at six without changing existing pin order", () => {
  assert.equal(canAddProfilePin(5), true);
  assert.equal(canAddProfilePin(6), false);
  assert.equal(canAddProfilePin(7), false);
});

test("non-default profile selections resolve to the exact entitlements they need", () => {
  assert.deepEqual(requiredPremiumFeatures({
    bioStyleId: "editorial",
    messageFontId: "default",
    storyFontId: "cinematic",
    appIconId: "yor-default",
  }), ["CUSTOM_BIO_FONT", "STORY_FONT"]);
});

test("premium profile updates are entitlement-gated while keeping bio text independent", async () => {
  const user: UserRecord = {
    id: "11111111-1111-4111-8111-111111111111",
    username: "ayush",
    email: "ayush@example.com",
    passwordHash: "hash",
    fullName: "Ayush",
    bio: "Keep the original characters",
    avatarUrl: null,
    role: "user",
    permissions: [],
    createdAt: "2026-09-13T00:00:00.000Z",
    updatedAt: "2026-09-13T00:00:00.000Z",
    settings: { theme: "dark", notificationsEnabled: true, privateAccount: false },
    bioStyleId: "default",
    messageFontId: "default",
    storyFontId: "default",
    appIconId: "yor-default",
  };
  let updated: Partial<UserRecord> | undefined;
  const userRepository = {
    findById: async () => user,
    update: async (_id: string, changes: Partial<UserRecord>) => {
      updated = changes;
      return { ...user, ...changes };
    },
  } as unknown as UserRepository;
  const entitlementService = {
    hasFeature: async (_id: string, feature: string) => feature === "CUSTOM_BIO_FONT",
  } as unknown as FeatureEntitlementService;
  const service = new UserService(userRepository, undefined, undefined, undefined, undefined, entitlementService);

  const selected = await service.updatePremiumProfile(user.id, { bioStyleId: "editorial" });

  assert.equal(selected?.bio, user.bio);
  assert.equal(selected?.bioStyleId, "editorial");
  assert.deepEqual(updated, {
    bioStyleId: "editorial",
    messageFontId: "default",
    storyFontId: "default",
    appIconId: "yor-default",
  });
  await assert.rejects(
    () => service.updatePremiumProfile(user.id, { messageFontId: "mono" }),
    PremiumProfileFeatureUnavailableError,
  );
});
