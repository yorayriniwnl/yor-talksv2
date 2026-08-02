import assert from "node:assert/strict";
import { after, test } from "node:test";
import { PostRepository } from "../repositories/post-repository.js";
import { NotificationRepository } from "../repositories/notification-repository.js";
import { UserRepository } from "../repositories/user-repository.js";
import { PostService } from "../services/post-service.js";
import { createTestUser } from "./test-helpers.js";
import { pool } from "@workspace/db";

after(() => pool.end());

test("posts support likes, bookmarks, and trending ranking", async () => {
  const userRepository = new UserRepository();
  const author = await createTestUser(userRepository);
  const liker = await createTestUser(userRepository);
  const postService = new PostService(new PostRepository(), userRepository, new NotificationRepository());

  const post = await postService.createPost(author.id, "Hello world", []);
  await postService.likePost(post.id, liker.id);
  await postService.bookmarkPost(post.id, liker.id);
  await postService.sharePost(post.id);

  const feed = await postService.getTrendingFeed();
  assert.equal(feed[0].id, post.id);
  assert.equal(feed[0].likedBy.length, 1);
  assert.equal(feed[0].bookmarkedBy.length, 1);
  assert.equal(feed[0].shareCount, 1);
});
