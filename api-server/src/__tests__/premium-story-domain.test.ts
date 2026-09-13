import assert from "node:assert/strict";
import { test } from "node:test";
import {
  calculateStoryAnalytics,
  calculateStoryScore,
  resolveStoryDurationHours,
  selectViewerExposure,
  type StoryViewEventInput,
} from "../services/story-analytics-service.js";
import { shouldNotifySuperHeart, StoryService } from "../services/story-service.js";
import type { StoryRepository } from "../repositories/story-repository.js";

test("story analytics count every idempotent event, unique viewers, and rewatches", () => {
  const events: StoryViewEventInput[] = [
    { viewerId: "viewer-a", exposure: "identified", viewedAt: "2026-09-12T10:00:00.000Z" },
    { viewerId: "viewer-a", exposure: "identified", viewedAt: "2026-09-12T10:03:00.000Z" },
    { viewerId: "viewer-b", exposure: "private", viewedAt: "2026-09-12T10:04:00.000Z" },
    { viewerId: null, exposure: "private", viewedAt: "2026-09-12T10:05:00.000Z" },
  ];

  assert.deepEqual(calculateStoryAnalytics(events), {
    totalViews: 4,
    uniqueViewers: 3,
    rewatches: 1,
    rewatchRate: 25,
    identifiedViews: 2,
    privateViews: 2,
  });
});

test("viewer exposure is selected from the viewer preference, not a client identity claim", () => {
  assert.equal(selectViewerExposure({ storyPrivateViewEnabled: true, storyViewMode: "private" }), "private");
  assert.equal(selectViewerExposure({ storyPrivateViewEnabled: true, storyViewMode: "identified" }), "identified");
  assert.equal(selectViewerExposure({ storyPrivateViewEnabled: false, storyViewMode: "private" }), "identified");
});

test("story duration is limited to the entitlement ceiling and ranking boost is capped", () => {
  assert.equal(resolveStoryDurationHours(72, true, 72), 72);
  assert.equal(resolveStoryDurationHours(undefined, false, 72), 24);
  assert.throws(() => resolveStoryDurationHours(72, false, 72), /entitlement/i);
  assert.throws(() => resolveStoryDurationHours(168, true, 72), /maximum/i);
  assert.equal(calculateStoryScore({ relationshipScore: 12, recencyScore: 30, engagementScore: 5, priorityBoost: 99 }), 67);
});

test("duplicate Super Hearts are idempotent while a changed reaction can notify again", () => {
  assert.equal(shouldNotifySuperHeart({ emoji: "💖", reactionType: "SUPER_HEART" }, "💖"), false);
  assert.equal(shouldNotifySuperHeart({ emoji: "💖", reactionType: "SUPER_HEART" }, "💘"), true);
  assert.equal(shouldNotifySuperHeart({ emoji: "❤️", reactionType: "NORMAL_HEART" }, "💖"), true);
});

test("highlight management stays owner-scoped and preserves ordered story ids", async () => {
  const highlight = {
    id: "33333333-3333-4333-8333-333333333333",
    ownerId: "11111111-1111-4111-8111-111111111111",
    title: "Field notes",
    coverUrl: null,
    storyIds: ["44444444-4444-4444-8444-444444444444"],
    createdAt: "2026-09-13T00:00:00.000Z",
    updatedAt: "2026-09-13T00:00:00.000Z",
  };
  let createdOwner = "";
  const repository = {
    listHighlights: async (ownerId: string) => ownerId === highlight.ownerId ? [highlight] : [],
    createHighlight: async (ownerId: string, title: string) => { createdOwner = ownerId; return { ...highlight, ownerId, title, storyIds: [] }; },
  } as unknown as StoryRepository;
  const service = new StoryService(repository);

  assert.deepEqual(await service.listHighlights(highlight.ownerId), [highlight]);
  assert.deepEqual(await service.listHighlights("55555555-5555-4555-8555-555555555555"), []);
  assert.equal((await service.createHighlight(highlight.ownerId, "  New signal  ")).title, "New signal");
  assert.equal(createdOwner, highlight.ownerId);
});
