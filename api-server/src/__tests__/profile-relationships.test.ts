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
import { env } from "../config/env.js";
import { EligibilityService } from "../services/eligibility-service.js";
import type { EligibilityDecision } from "../eligibility/types.js";

after(() => pool.end());

test("own profile restores canonical follow relationships without exposing them to other viewers", async () => {
  const users = new UserRepository();
  const owner = await createTestUser(users);
  const followed = await createTestUser(users);
  const viewer = await createTestUser(users);
  const pending = await createTestUser(users);
  await users.followUser(owner.id, followed.id);
  await users.createFollowRequest(owner.id, pending.id);
  await users.addFavoriteCreator(owner.id, followed.id);
  const profiles = new UserService(users);
  const own = await profiles.getProfile(owner.id, owner.id);
  assert.deepEqual(own?.following, [followed.id]);
  assert.equal(own?.followingCount, 1);
  assert.deepEqual(own?.pendingFollowIds, [pending.id]);
  assert.deepEqual(own?.favoriteCreatorIds, [followed.id]);
  const byUsername = await profiles.getProfileByUsername(owner.username, owner.id);
  assert.deepEqual(byUsername?.pendingFollowIds, [pending.id]);
  assert.deepEqual(byUsername?.favoriteCreatorIds, [followed.id]);
  const publicProfile = await profiles.getProfile(owner.id, viewer.id);
  assert.equal(publicProfile?.following, undefined);
  assert.equal(publicProfile?.pendingFollowIds, undefined);
  assert.equal(publicProfile?.favoriteCreatorIds, undefined);
  await users.unfollowUser(owner.id, followed.id);
  await users.removeFollowRequest(owner.id, pending.id);
  assert.deepEqual((await profiles.getProfile(owner.id, owner.id))?.following, []);
  assert.deepEqual((await profiles.getProfile(owner.id, owner.id))?.pendingFollowIds, []);
});

test('production profile discovery requires current authority and keeps minor profiles private by default', async t => {
  const originalNodeEnv = env.NODE_ENV;
  env.NODE_ENV = 'test';
  t.after(() => { env.NODE_ENV = originalNodeEnv; });
  const users = new UserRepository(), viewer = await createTestUser(users), target = await createTestUser(users);
  t.after(async () => { await pool.query('DELETE FROM users WHERE id=ANY($1::uuid[])', [[viewer.id, target.id]]); });
  await users.followUser(viewer.id,target.id);
  env.NODE_ENV = 'production';
  const adult: EligibilityDecision = {
    experience: 'adult_18_plus', activated: true,
    capabilities: { social: true, publish: true, messaging: true, payments: false, seller: false,
      memberships: false, live: false, rtc: false, ai: false, analytics: false, profiling: false },
    maximumContentRating: 'mature', policyVersions: ['fixture:1'], revision: 'adult', reason: null, publicBrowsingAllowed: true,
  };
  const teen: EligibilityDecision = { ...adult, experience: 'teen_13_17', maximumContentRating: 'regular', revision: 'teen' };
  t.mock.method(EligibilityService.prototype, 'decisionFor', async (userId: string) => userId === target.id ? teen : adult);
  t.mock.method(EligibilityService.prototype, 'decisionForMany', async (ids: string[]) => new Map(ids.map(id => [id, id === target.id ? teen : adult])));
  await users.update(target.id, { privacy: { profileVisibility: 'public', messageRequests: true, allowDmFromStrangers: true },
    settings: { ...target.settings, privateAccount: false } });
  const profiles = new UserService(users);
  assert.equal((await profiles.getProfile(target.id, viewer.id))?.id, target.id,
    'an existing follower may see the profile while the minor profile remains unavailable to discovery');
  assert.deepEqual(await profiles.searchUsers(target.username, viewer.id), []);
});

test('production follow requests do not create public follow edges to minors with legacy public settings', async t => {
  const originalNodeEnv = env.NODE_ENV;
  env.NODE_ENV = 'production';
  t.after(() => { env.NODE_ENV = originalNodeEnv; });
  const users = new UserRepository(), viewer = await createTestUser(users), target = await createTestUser(users);
  t.after(async () => { await pool.query('DELETE FROM users WHERE id=ANY($1::uuid[])', [[viewer.id, target.id]]); });
  const adult: EligibilityDecision = {
    experience: 'adult_18_plus', activated: true,
    capabilities: { social: true, publish: true, messaging: true, payments: false, seller: false,
      memberships: false, live: false, rtc: false, ai: false, analytics: false, profiling: false },
    maximumContentRating: 'mature', policyVersions: ['fixture:1'], revision: 'adult', reason: null, publicBrowsingAllowed: true,
  };
  const teen: EligibilityDecision = { ...adult, experience: 'teen_13_17', maximumContentRating: 'regular', revision: 'teen' };
  t.mock.method(EligibilityService.prototype,'decisionFor',async (userId: string) => userId===target.id?teen:adult);
  await users.update(target.id,{privacy:{profileVisibility:'public',messageRequests:true,allowDmFromStrangers:true},settings:{...target.settings,privateAccount:false}});
  const result=await new UserService(users).followUser(viewer.id,target.id);
  assert.equal(result?.status,'pending');
  assert.equal(await users.isFollowing(viewer.id,target.id),false);
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
