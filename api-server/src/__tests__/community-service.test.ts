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
