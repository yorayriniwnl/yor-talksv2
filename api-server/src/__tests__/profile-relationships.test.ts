import assert from "node:assert/strict";
import { after, test } from "node:test";
import { pool } from "@workspace/db";
import { UserRepository } from "../repositories/user-repository.js";
import { UserService } from "../services/user-service.js";
import { createTestUser } from "./test-helpers.js";

after(() => pool.end());

test("own profile restores canonical follow relationships without exposing them to other viewers", async () => {
  const users = new UserRepository();
  const owner = await createTestUser(users);
  const followed = await createTestUser(users);
  const viewer = await createTestUser(users);
  await users.followUser(owner.id, followed.id);
  const profiles = new UserService(users);
  const own = await profiles.getProfile(owner.id, owner.id);
  assert.deepEqual(own?.following, [followed.id]);
  assert.equal(own?.followingCount, 1);
  const publicProfile = await profiles.getProfile(owner.id, viewer.id);
  assert.equal(publicProfile?.following, undefined);
  await users.unfollowUser(owner.id, followed.id);
  assert.deepEqual((await profiles.getProfile(owner.id, owner.id))?.following, []);
});
