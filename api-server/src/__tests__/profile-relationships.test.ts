import assert from "node:assert/strict";
import { after, test } from "node:test";
import { pool } from "@workspace/db";
import { UserRepository } from "../repositories/user-repository.js";
import { UserService } from "../services/user-service.js";
import { createTestUser } from "./test-helpers.js";
import { UserController } from "../controllers/user-controller.js";
import type { AuthService } from "../services/auth-service.js";
import type { AccountService } from "../services/account-service.js";
import type { Request, Response } from "express";

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

test("private follow requests remain pending at the HTTP boundary", async () => {
  const users = new UserRepository();
  const follower = await createTestUser(users);
  const target = await createTestUser(users);
  await users.update(target.id, { settings: { ...target.settings, privateAccount: true } });
  const controller = new UserController(new UserService(users), {} as AuthService, {} as AccountService);
  let body: { data: { status: string } } | undefined;
  const response = { status() { return this; }, json(value: typeof body) { body = value; return this; } } as unknown as Response;
  await controller.followUser({ user: { id: follower.id }, params: { userId: target.id } } as unknown as Request, response);
  assert.equal(body?.data.status, "pending");
  assert.equal(await users.isFollowing(follower.id, target.id), false);
});
