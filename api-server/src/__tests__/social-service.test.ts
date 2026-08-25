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

  try {
    const post = await postService.createPost(author.id, "Hello world", []);
    await postService.likePost(post.id, liker.id);
    await postService.bookmarkPost(post.id, liker.id);
    await postService.sharePost(post.id);

    const feed = await postService.getFeed(undefined, 20, liker.id);
    const createdPost = feed.find((item) => item.id === post.id);
    assert.ok(createdPost);
    assert.equal(createdPost.likedByMe, true);
    assert.equal(createdPost.savedByMe, true);
    assert.equal(createdPost.shareCount, 1);

    const trending = await postService.getTrendingFeed();
    assert.ok(trending.length > 0);
  } finally {
    postService.close();
  }
});
