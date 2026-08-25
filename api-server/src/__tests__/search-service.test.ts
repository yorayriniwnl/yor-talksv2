import assert from "node:assert/strict";
import crypto from "node:crypto";
import { after, test } from "node:test";
import { PostRepository } from "../repositories/post-repository.js";
import { UserRepository } from "../repositories/user-repository.js";
import { SearchService } from "../services/search-service.js";
import { pool } from "@workspace/db";

after(() => pool.end());

test("search service returns matching users and posts", async () => {
  const userRepository = new UserRepository();
  const postRepository = new PostRepository();
  const unique = crypto.randomUUID();
  const userId = crypto.randomUUID();
  const user = await userRepository.create({
    id: userId,
    username: `jane-${unique.slice(0, 8)}`,
    email: `jane-${unique.slice(0, 8)}@example.com`,
    passwordHash: "hash",
    fullName: "Jane Doe",
    bio: "",
    avatarUrl: null,
    role: "user",
    permissions: ["read:profile"],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    followers: [],
    following: [],
    settings: { theme: "light", notificationsEnabled: true, privateAccount: false }
  });
  await postRepository.create({
    id: crypto.randomUUID(),
    authorId: userId,
    content: `hello from jane-${unique.slice(0, 8)}`,
    images: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    likesCount: 0,
    commentsCount: 0,
    bookmarksCount: 0,
    shareCount: 0,
    reactions: {},
    tags: ["social"],
    mentions: [],
    score: 0
  });

  const searchService = new SearchService(userRepository, postRepository);
  const result = await searchService.search(`jane-${unique.slice(0, 8)}`);

  assert.equal(result.users.length, 1);
  assert.equal(result.users[0].id, userId);
  assert.equal(result.posts.length, 1);
});
