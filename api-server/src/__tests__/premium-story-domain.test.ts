import assert from "node:assert/strict";
import { test } from "node:test";
import {
  calculateStoryAnalytics,
  calculateStoryScore,
  resolveStoryDurationHours,
  selectViewerExposure,
  type StoryViewEventInput,
} from "../services/story-analytics-service.js";

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
