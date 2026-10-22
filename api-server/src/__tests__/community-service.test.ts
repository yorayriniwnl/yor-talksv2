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

test("discussion likes preserve the same author and content visibility as the discussion list", async t => {
  const users = new UserRepository();
  const owner = await createTestUser(users);
  const author = await createTestUser(users);
  const viewer = await createTestUser(users, {
    settings: { theme: "light", notificationsEnabled: true, privateAccount: false, contentFilter: "regular" },
  });
  t.after(async () => {
    await pool.query('DELETE FROM users WHERE id=ANY($1::uuid[])', [[owner.id, author.id, viewer.id]]);
  });
  const service = new CommunityService();
  const community = await service.createCommunity({
    name: "Discussion visibility",
    slug: `visibility-${owner.id.slice(0, 8)}`,
    description: "Discussion visibility checks",
    ownerId: owner.id,
    contentRating: "child_safe",
  });
  await service.joinCommunity(community.id, author.id);
  await service.joinCommunity(community.id, viewer.id);
  const discussion = await service.createDiscussion(community.id, author.id, {
    title: "Restricted discussion", content: "This must follow its author's visibility", tag: "general", contentRating: "regular",
  });
  assert.ok(discussion);

  for (const scenario of ["author block", "viewer block", "private author", "suspended author", "content rating"] as const) {
    await t.test(scenario, async () => {
      if (scenario === "author block") await users.update(author.id, { blockedUsers: [viewer.id] });
      if (scenario === "viewer block") await users.update(viewer.id, { blockedUsers: [author.id] });
      if (scenario === "private author") await users.update(author.id, { privacy: { profileVisibility: "private", messageRequests: true, allowDmFromStrangers: true } });
      if (scenario === "suspended author") await users.update(author.id, { accountStatus: "suspended" });
      if (scenario === "content rating") await users.update(viewer.id, { settings: { ...viewer.settings, contentFilter: "child_safe" } });

      assert.deepEqual(await service.listDiscussions(community.id, viewer.id), []);
      assert.equal(await service.likeDiscussion(community.id, discussion.id, viewer.id), undefined,
        "a known discussion ID must not reveal content excluded from its listing");
      const [stored] = (await pool.query('SELECT announcements FROM communities WHERE id=$1', [community.id])).rows;
      assert.equal(stored.announcements[0].likes, 0);
      assert.deepEqual(stored.announcements[0].likedBy, []);

      await users.update(author.id, { blockedUsers: [], accountStatus: "active", privacy: { profileVisibility: "public", messageRequests: true, allowDmFromStrangers: true } });
      await users.update(viewer.id, { blockedUsers: [], settings: { ...viewer.settings, contentFilter: "regular" } });
    });
  }

  assert.equal((await service.listDiscussions(community.id, viewer.id))[0]?.id, discussion.id);
  const liked = await service.likeDiscussion(community.id, discussion.id, viewer.id);
  assert.equal(liked?.likes, 1);
  assert.deepEqual(liked?.likedBy, [viewer.id]);
  assert.equal((await service.likeDiscussion(community.id, discussion.id, viewer.id))?.likes, 1,
    "an allowed repeat remains idempotent");
});
