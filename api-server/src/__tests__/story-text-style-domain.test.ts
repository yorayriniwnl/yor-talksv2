import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DEFAULT_STORY_TEXT_STYLE,
  isAdvancedStoryTextStyle,
  normalizeStoryTextStyle,
} from "../features/story-text-style.js";
import type { FeatureEntitlementService } from "../services/feature-entitlement-service.js";
import type { StoryRepository } from "../repositories/story-repository.js";
import { PremiumFeatureUnavailableError, StoryService } from "../services/story-service.js";

test("story text styles normalize to safe curated defaults and controls", () => {
  assert.deepEqual(normalizeStoryTextStyle(undefined), DEFAULT_STORY_TEXT_STYLE);
  assert.deepEqual(normalizeStoryTextStyle({
    size: "xl",
    weight: "black",
    align: "right",
    background: "glass",
    backgroundOpacity: 72,
    positionX: 24,
    positionY: 76,
    rotation: -8,
  }), {
    size: "xl",
    weight: "black",
    align: "right",
    background: "glass",
    backgroundOpacity: 72,
    positionX: 24,
    positionY: 76,
    rotation: -8,
  });
  assert.equal(isAdvancedStoryTextStyle(DEFAULT_STORY_TEXT_STYLE), false);
  assert.equal(isAdvancedStoryTextStyle({ ...DEFAULT_STORY_TEXT_STYLE, size: "xl" }), true);
});

test("story text styles reject arbitrary CSS-like keys and out-of-range values", () => {
  assert.throws(() => normalizeStoryTextStyle({ ...DEFAULT_STORY_TEXT_STYLE, fontFamily: "url(javascript:alert(1))" }), /unrecognized/i);
  assert.throws(() => normalizeStoryTextStyle({ ...DEFAULT_STORY_TEXT_STYLE, positionX: 101 }), /too_big|less than or equal/i);
  assert.throws(() => normalizeStoryTextStyle({ ...DEFAULT_STORY_TEXT_STYLE, rotation: 13 }), /too_big|less than or equal/i);
});

function createStoryStyleService(storyFontEnabled: boolean) {
  let persistedStyle: unknown;
  const repository = {
    create: async (story: { storyTextStyle?: unknown }) => {
      persistedStyle = story.storyTextStyle;
      return story;
    },
    getPolls: async () => new Map(),
  } as unknown as StoryRepository;
  const entitlementService = {
    hasFeature: async (_userId: string, feature: string) => feature === "STORY_FONT" ? storyFontEnabled : true,
  } as unknown as FeatureEntitlementService;
  return {
    service: new StoryService(repository, undefined, undefined, undefined, entitlementService),
    getPersistedStyle: () => persistedStyle,
  };
}

test("advanced story text styling is entitlement-gated and persisted after authorization", async () => {
  const style = { ...DEFAULT_STORY_TEXT_STYLE, size: "xl" as const, positionX: 24 };
  const locked = createStoryStyleService(false);
  await assert.rejects(() => locked.service.createStory({
    authorId: "11111111-1111-4111-8111-111111111111",
    mediaUrl: "https://example.test/story.jpg",
    type: "text",
    textContent: "Safe story text",
    isHighlight: false,
    contentCategory: "other",
    contentRating: "regular",
    storyTextStyle: style,
  }), PremiumFeatureUnavailableError);

  const enabled = createStoryStyleService(true);
  await enabled.service.createStory({
    authorId: "11111111-1111-4111-8111-111111111111",
    mediaUrl: "https://example.test/story.jpg",
    type: "text",
    textContent: "Safe story text",
    isHighlight: false,
    contentCategory: "other",
    contentRating: "regular",
    storyTextStyle: style,
  });
  assert.deepEqual(enabled.getPersistedStyle(), style);
});
