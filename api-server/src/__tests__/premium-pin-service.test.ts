import assert from "node:assert/strict";
import { test } from "node:test";
import type { FeatureEntitlementService } from "../services/feature-entitlement-service.js";
import { PostService, PremiumFeatureUnavailableError } from "../services/post-service.js";
import type { PostRepository } from "../repositories/post-repository.js";
import type { UserRepository } from "../repositories/user-repository.js";
import type { NotificationRepository } from "../repositories/notification-repository.js";
import type { PostRecord } from "../types/index.js";

const post: PostRecord = {
  id: "11111111-1111-4111-8111-111111111111",
  authorId: "22222222-2222-4222-8222-222222222222",
  content: "Pin me",
  images: [],
  createdAt: "2026-09-13T00:00:00.000Z",
  updatedAt: "2026-09-13T00:00:00.000Z",
  likesCount: 0,
  commentsCount: 0,
  bookmarksCount: 0,
  shareCount: 0,
};

test("pinning is entitlement-gated before a profile mutation is attempted", async () => {
  let pinAttempted = false;
  const postRepository = {
    findById: async () => post,
    pinPost: async () => { pinAttempted = true; return post; },
  } as unknown as PostRepository;
  const entitlementService = {
    hasFeature: async () => false,
  } as unknown as FeatureEntitlementService;
  const service = new PostService(
    postRepository,
    {} as UserRepository,
    {} as NotificationRepository,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    entitlementService,
  );

  await assert.rejects(() => service.pinPost(post.id, post.authorId), PremiumFeatureUnavailableError);
  assert.equal(pinAttempted, false);
});

test("profile-only posts are entitlement-gated before persistence", async () => {
  let createAttempted = false;
  const postRepository = {
    create: async () => { createAttempted = true; return post; },
  } as unknown as PostRepository;
  const entitlementService = {
    hasFeature: async () => false,
  } as unknown as FeatureEntitlementService;
  const service = new PostService(
    postRepository,
    {} as UserRepository,
    {} as NotificationRepository,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    entitlementService,
  );

  await assert.rejects(
    () => service.createPost(post.authorId, "Profile note", [], undefined, undefined, "public", undefined, "profile_only"),
    PremiumFeatureUnavailableError,
  );
  assert.equal(createAttempted, false);
});
