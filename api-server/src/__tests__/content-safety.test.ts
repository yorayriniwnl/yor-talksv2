import assert from "node:assert/strict";
import test from "node:test";
import { canViewContent, normalizeContentRating } from "../utils/content-safety.js";
import { ContentSafetyService } from "../services/content-safety-service.js";

test("content ratings default to regular", () => {
  assert.equal(normalizeContentRating(undefined), "regular");
  assert.equal(normalizeContentRating("unknown"), "regular");
});

test("viewer filters are cumulative by audience level", () => {
  assert.equal(canViewContent("child_safe", "child_safe"), true);
  assert.equal(canViewContent("regular", "child_safe"), false);
  assert.equal(canViewContent("regular", "regular"), true);
  assert.equal(canViewContent("mature", "regular"), false);
  assert.equal(canViewContent("mature", "mature"), true);
});

test("author visibility is enforced consistently for public and private content", async () => {
  const users = new Map([
    ["owner", { id: "owner", privacy: { profileVisibility: "private" }, settings: { privateAccount: true } }],
    ["follower", { id: "follower", privacy: { profileVisibility: "public" }, settings: { privateAccount: false } }],
  ]);
  const repository = {
    findById: async (id: string) => users.get(id),
    isFollowing: async (followerId: string, followingId: string) => followerId === "follower" && followingId === "owner",
  };
  const service = new ContentSafetyService(repository as never);
  const content = { contentRating: "regular" };

  assert.equal(await service.isVisible(content, undefined, "owner"), false);
  assert.equal(await service.isVisible(content, "follower", "owner"), true);
  assert.equal(await service.isVisible(content, "owner", "owner"), true);
});

test("author visibility denies content across a mutual block", async () => {
  const author = {
    id: "owner",
    privacy: { profileVisibility: "public" },
    blockedUsers: ["viewer"],
  };
  const viewer = {
    id: "viewer",
    privacy: { profileVisibility: "public" },
    blockedUsers: [],
  };
  const repository = {
    findById: async (id: string) => id === author.id ? author : id === viewer.id ? viewer : undefined,
    isFollowing: async () => true,
  } as any;
  const service = new ContentSafetyService(repository);

  assert.equal(await service.isVisible({ contentRating: "regular" }, viewer.id, author.id), false);
});
