import assert from "node:assert/strict";
import { test } from "node:test";
import { PostRepository } from "../repositories/post-repository.js";
import { NotificationRepository } from "../repositories/notification-repository.js";
import { UserRepository } from "../repositories/user-repository.js";
import { PostService } from "../services/post-service.js";

test("posts support likes, bookmarks, and trending ranking", () => {
  const postService = new PostService(new PostRepository(), new UserRepository(), new NotificationRepository());

  const post = postService.createPost("user-1", "Hello world", []);
  postService.likePost(post.id, "user-2");
  postService.bookmarkPost(post.id, "user-2");
  postService.sharePost(post.id);

  const feed = postService.getTrendingFeed();
  assert.equal(feed[0].id, post.id);
  assert.equal(feed[0].likedBy.length, 1);
  assert.equal(feed[0].bookmarkedBy.length, 1);
  assert.equal(feed[0].shareCount, 1);
});
