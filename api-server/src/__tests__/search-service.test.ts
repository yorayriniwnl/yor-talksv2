import assert from "node:assert/strict";
import { test } from "node:test";
import { PostRepository } from "../repositories/post-repository.js";
import { UserRepository } from "../repositories/user-repository.js";
import { SearchService } from "../services/search-service.js";

test("search service returns matching users and posts", () => {
  const userRepository = new UserRepository();
  const postRepository = new PostRepository();
  userRepository.create({
    id: "u1",
    username: "jane",
    email: "jane@example.com",
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
  postRepository.create({
    id: "p1",
    authorId: "u1",
    content: "hello from jane",
    images: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    likedBy: [],
    comments: [],
    bookmarkedBy: [],
    shareCount: 0,
    reactions: {},
    tags: ["social"],
    mentions: [],
    score: 0
  });

  const searchService = new SearchService(userRepository, postRepository);
  const result = searchService.search("jane");

  assert.equal(result.users.length, 1);
  assert.equal(result.posts.length, 1);
});
