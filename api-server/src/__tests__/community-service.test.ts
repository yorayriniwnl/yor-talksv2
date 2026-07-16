import assert from "node:assert/strict";
import { test } from "node:test";
import { CommunityService } from "../services/community-service.js";

test("community service creates communities with default roles", () => {
  const communityService = new CommunityService();
  const community = communityService.createCommunity({
    name: "Design",
    slug: "design",
    description: "Design discussions",
    ownerId: "u1",
  });

  assert.equal(community.slug, "design");
  assert.equal(community.memberIds.length, 1);
  assert.ok(community.roles?.owner);
});
