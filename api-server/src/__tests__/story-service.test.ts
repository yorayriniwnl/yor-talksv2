import assert from "node:assert/strict";
import { after, test } from "node:test";
import { pool } from "@workspace/db";
import { StoryRepository } from "../repositories/story-repository.js";
import { UserRepository } from "../repositories/user-repository.js";
import { StoryService } from "../services/story-service.js";
import { createTestUser } from "./test-helpers.js";

after(() => pool.end());

test("story views and reactions are persisted but scoped to the viewer", async () => {
  const userRepository = new UserRepository();
  const author = await createTestUser(userRepository);
  const viewer = await createTestUser(userRepository);
  const otherViewer = await createTestUser(userRepository);
  const service = new StoryService(new StoryRepository(), undefined, undefined, userRepository);
  const story = await service.createStory({
    authorId: author.id,
    mediaUrl: "https://example.test/story.jpg",
    type: "image",
    textContent: "A public story",
    isHighlight: false,
    audience: "public",
  });

  const viewed = await service.addView(story.id, viewer.id);
  assert.deepEqual(viewed?.viewerIds, [viewer.id]);
  const reacted = await service.react(story.id, viewer.id, "🔥");
  assert.deepEqual(reacted?.reactions, [{ userId: viewer.id, emoji: "🔥" }]);

  const otherView = (await service.listActiveStories(otherViewer.id)).find((candidate) => candidate.id === story.id);
  assert.deepEqual(otherView?.viewerIds, []);
  assert.deepEqual(otherView?.reactions, []);
});
