import assert from "node:assert/strict";
import { after, test } from "node:test";
import { CommunityService } from "../services/community-service.js";
import { UserRepository } from "../repositories/user-repository.js";
import { createTestUser } from "./test-helpers.js";
import { pool } from "@workspace/db";

after(() => pool.end());

test("community service creates communities with default roles", async () => {
  const owner = await createTestUser(new UserRepository());
  const communityService = new CommunityService();
  const community = await communityService.createCommunity({
    name: "Design",
    slug: `design-${owner.id.slice(0, 8)}`,
    description: "Design discussions",
    ownerId: owner.id,
  });

  assert.equal(community.slug, `design-${owner.id.slice(0, 8)}`);
  assert.equal(community.memberIds.length, 1);
  assert.ok(community.roles?.owner);
});

test("community membership is persisted and counted through the join table", async () => {
  const userRepository = new UserRepository();
  const owner = await createTestUser(userRepository);
  const member = await createTestUser(userRepository);
  const communityService = new CommunityService();
  const community = await communityService.createCommunity({
    name: "Systems",
    slug: `systems-${owner.id.slice(0, 8)}`,
    description: "Systems discussions",
    ownerId: owner.id,
  });

  const joined = await communityService.joinCommunity(community.id, member.id);
  assert.ok(joined?.memberIds.includes(member.id));
  assert.equal(await communityService.countMemberships(member.id), 1);

  const left = await communityService.leaveCommunity(community.id, member.id);
  assert.equal(left?.memberIds.includes(member.id), false);
  assert.equal(await communityService.countMemberships(member.id), 0);
});
