import assert from "node:assert/strict";
import { after, test, type TestContext } from "node:test";
import { pool } from "@workspace/db";
import { BroadcastChannelService } from "../services/broadcast-channel-service.js";
import { UserRepository } from "../repositories/user-repository.js";
import { createTestUser } from "./test-helpers.js";

after(() => pool.end());

async function fixture(t: TestContext) {
  const users = new UserRepository();
  const owner = await createTestUser(users);
  const viewer = await createTestUser(users, {
    settings: { theme: "light", notificationsEnabled: true, privateAccount: false, contentFilter: "regular" },
  });
  const other = await createTestUser(users);
  t.after(async () => {
    await pool.query('DELETE FROM users WHERE id=ANY($1::uuid[])', [[owner.id, viewer.id, other.id]]);
  });
  const service = new BroadcastChannelService();
  const channel = await service.createChannel({ ownerId: owner.id, name: "Visibility channel", contentRating: "child_safe" });
  const message = await service.createMessage({ channelId: channel.id, authorId: owner.id, content: "Channel update", contentRating: "regular" });
  assert.ok(message);
  await service.joinChannel(channel.id, viewer.id);
  return { users, owner, viewer, other, service, channel, message };
}

test("broadcast reactions create a new emoji, preserve concurrent actors and toggle only the current actor", async t => {
  const { service, channel, message, viewer, other } = await fixture(t);
  await service.joinChannel(channel.id, other.id);
  const first = await service.reactToMessage(channel.id, message.id, viewer.id, "heart");
  assert.deepEqual(first?.reactions, { heart: [viewer.id] });
  const second = await service.reactToMessage(channel.id, message.id, other.id, "heart");
  assert.deepEqual(new Set(second?.reactions?.heart), new Set([viewer.id, other.id]));
  const toggled = await service.reactToMessage(channel.id, message.id, viewer.id, "heart");
  assert.deepEqual(toggled?.reactions, { heart: [other.id] });

  await Promise.all([
    service.reactToMessage(channel.id, message.id, viewer.id, "celebrate"),
    service.reactToMessage(channel.id, message.id, other.id, "celebrate"),
  ]);
  const [stored] = (await pool.query('SELECT reactions FROM broadcast_channel_messages WHERE id=$1', [message.id])).rows;
  assert.deepEqual(new Set(stored.reactions.celebrate), new Set([viewer.id, other.id]));
  assert.deepEqual(stored.reactions.heart, [other.id]);
});

test("broadcast discovery, subscription, history and reactions enforce current owner visibility", async t => {
  const { users, owner, viewer, other, service, channel, message } = await fixture(t);
  for (const scenario of ["owner block", "viewer block", "private owner", "suspended owner"] as const) {
    await t.test(scenario, async () => {
      if (scenario === "owner block") await users.update(owner.id, { blockedUsers: [viewer.id, other.id] });
      if (scenario === "viewer block") {
        await users.update(viewer.id, { blockedUsers: [owner.id] });
        await users.update(other.id, { blockedUsers: [owner.id] });
      }
      if (scenario === "private owner") await users.update(owner.id, { privacy: { profileVisibility: "private", messageRequests: true, allowDmFromStrangers: true } });
      if (scenario === "suspended owner") await users.update(owner.id, { accountStatus: "suspended" });

      assert.equal((await service.listChannels(viewer.id)).some(item => item.id === channel.id), false);
      assert.equal(await service.joinChannel(channel.id, other.id), undefined);
      assert.equal(await service.listMessages(channel.id, viewer.id), undefined);
      assert.equal(await service.reactToMessage(channel.id, message.id, viewer.id, "heart"), undefined);
      const [stored] = (await pool.query('SELECT reactions FROM broadcast_channel_messages WHERE id=$1', [message.id])).rows;
      assert.deepEqual(stored.reactions, {}, "a denied reaction must not change the stored message");
      const { rows } = await pool.query('SELECT user_id FROM broadcast_channel_members WHERE channel_id=$1 AND user_id=$2', [channel.id, other.id]);
      assert.equal(rows.length, 0, "denied subscriptions must not be inserted");

      await users.update(owner.id, { blockedUsers: [], accountStatus: "active", privacy: { profileVisibility: "public", messageRequests: true, allowDmFromStrangers: true } });
      await users.update(viewer.id, { blockedUsers: [] });
      await users.update(other.id, { blockedUsers: [] });
    });
  }

  await users.update(owner.id, { privacy: { profileVisibility: "private", messageRequests: true, allowDmFromStrangers: true } });
  await users.followUser(viewer.id, owner.id);
  assert.equal((await service.listChannels(viewer.id)).some(item => item.id === channel.id), true);
  assert.equal((await service.listMessages(channel.id, viewer.id))?.[0]?.id, message.id,
    "a subscribed follower keeps authorized access to a private owner's channel");
  assert.deepEqual((await service.reactToMessage(channel.id, message.id, viewer.id, "heart"))?.reactions, { heart: [viewer.id] });
});

test("broadcast message ratings are checked before changing reactions within an allowed channel", async t => {
  const { users, viewer, service, channel, message } = await fixture(t);
  await users.update(viewer.id, { settings: { ...viewer.settings, contentFilter: "child_safe" } });
  assert.equal((await service.listChannels(viewer.id)).some(item => item.id === channel.id), true);
  assert.deepEqual(await service.listMessages(channel.id, viewer.id), []);
  assert.equal(await service.reactToMessage(channel.id, message.id, viewer.id, "heart"), undefined);
  const [stored] = (await pool.query('SELECT reactions FROM broadcast_channel_messages WHERE id=$1', [message.id])).rows;
  assert.deepEqual(stored.reactions, {});
});
