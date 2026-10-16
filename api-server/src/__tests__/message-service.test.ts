import assert from "node:assert/strict";
import { after, test } from "node:test";
import bcrypt from "bcryptjs";
import { ConversationRepository, MessageRepository } from "../repositories/message-repository.js";
import { RedisRepository } from "../repositories/redis-repository.js";
import { AccountService } from "../services/account-service.js";
import { InvalidMessageContentError, MessageBlockedError, MessageService } from "../services/message-service.js";
import { UserRepository } from "../repositories/user-repository.js";
import { EligibilityService } from "../services/eligibility-service.js";
import { allowTestContacts, authorizeTestAdultAccount, createTestUser } from "./test-helpers.js";
import { pool } from "@workspace/db";

after(() => pool.end());

test("messages support edit, delete, reaction, and pin workflows", async () => {
  const userRepository = new UserRepository();
  const sender = await createTestUser(userRepository);
  const recipient = await createTestUser(userRepository);
  const messageService = new MessageService(new ConversationRepository(), new MessageRepository(), undefined, undefined, undefined, allowTestContacts);
  const sent = await messageService.sendMessage(sender.id, recipient.id, "hello");
  const reply = await messageService.sendMessage(recipient.id, sender.id, "replying", { replyToId: sent.id });
  const edited = await messageService.editMessage(sent.id, sender.id, "hello there");
  const reacted = await messageService.addReaction(sent.id, recipient.id, "thumbs-up");
  const pinned = await messageService.pinMessage(sent.id, sender.id);

  const forged = await messageService.sendMessageToConversation(sender.id, sent.conversationId, "forged fields", {
    replyToId: sent.id,
    senderId: recipient.id,
    recipientId: sender.id,
    pinned: true,
    deletedAt: new Date().toISOString(),
  } as never);
  const deleted = await messageService.deleteMessage(sent.id, sender.id);

  assert.ok(edited);
  assert.equal(reply.replyToId, sent.id);
  assert.equal(edited?.content, "hello there");
  assert.equal(reacted?.reactions?.["thumbs-up"]?.length, 1);
  assert.equal(pinned?.pinned, true);
  assert.equal(deleted?.deletedAt !== null, true);
  assert.equal(forged.senderId, sender.id);
  assert.equal(forged.recipientId, recipient.id);
  assert.equal(forged.pinned, false);
  assert.equal(forged.deletedAt, null);
  assert.equal(forged.replyToId, sent.id);
});

test("concurrent reactions from different users are preserved and repeated reactions are idempotent", async () => {
  const users = new UserRepository();
  const sender = await createTestUser(users);
  const first = await createTestUser(users);
  const second = await createTestUser(users);
  const service = new MessageService(new ConversationRepository(), new MessageRepository());
  const group = await service.createGroupChat(sender.id, [first.id, second.id], "Concurrent reactions");
  const message = await service.sendMessageToConversation(sender.id, group.id, "Concurrent reactions");
  await Promise.all([
    service.addReaction(message.id, first.id, "heart"),
    service.addReaction(message.id, second.id, "heart"),
    service.addReaction(message.id, first.id, "heart"),
  ]);
  const stored = await new MessageRepository().findById(message.id);
  assert.deepEqual(stored?.reactions?.heart?.sort(), [first.id, second.id].sort());
});

test("message content length is bounded before transport-specific persistence", async () => {
  const messageService = new MessageService(new ConversationRepository(), new MessageRepository(), undefined, undefined, undefined, allowTestContacts);

  await assert.rejects(
    () => messageService.sendMessage("sender", "recipient", "x".repeat(4001)),
    InvalidMessageContentError,
  );
  await assert.rejects(() => messageService.editMessage("id", "sender", "x".repeat(4001)), InvalidMessageContentError);
});

test("blocks deny new and existing messages in both blocking directions", async () => {
  const users = new UserRepository();
  const blocker = await createTestUser(users);
  const blocked = await createTestUser(users);
  const service = new MessageService(new ConversationRepository(), new MessageRepository(), users, undefined, undefined, allowTestContacts);
  const conversation = await service.createConversation(blocker.id, blocked.id);

  await users.update(blocker.id, { blockedUsers: [blocked.id] });
  await assert.rejects(() => service.sendMessage(blocker.id, blocked.id, "Blocked outbound"), MessageBlockedError);
  await assert.rejects(() => service.sendMessageToConversation(blocked.id, conversation.id, "Blocked inbound"), MessageBlockedError);
  await users.update(blocker.id, { blockedUsers: [] });
  await users.update(blocked.id, { blockedUsers: [blocker.id] });
  await assert.rejects(() => service.sendMessage(blocker.id, blocked.id, "Blocked by recipient"), MessageBlockedError);
});

test("group read receipts survive reload and stay scoped to each recipient", async () => {
  const users = new UserRepository();
  const sender = await createTestUser(users);
  const first = await createTestUser(users);
  const second = await createTestUser(users);
  await authorizeTestAdultAccount(sender.id);
  await authorizeTestAdultAccount(first.id);
  await authorizeTestAdultAccount(second.id);
  const service = new MessageService(new ConversationRepository(), new MessageRepository(), users, undefined, undefined, allowTestContacts);
  const created = await service.createGroupChat(sender.id, [first.id, second.id], "Read receipt audit");
  const group=created;
  await service.acceptGroupInvitation(created.invitations[0]!.id,first.id,created.invitations[0]!.updatedAt);
  const refreshedSecond=(await service.listGroupInvitations(second.id))[0]!;
  await service.acceptGroupInvitation(refreshedSecond.id,second.id,refreshedSecond.updatedAt);
  const message = await service.sendMessageToConversation(sender.id, group.id, "A shared conversation");
  assert.equal((await service.markSeen(message.id, sender.id))?.seenAt, null);
  const firstDecision = await new EligibilityService().decisionFor(first.id);
  assert.equal(firstDecision.activated,true);
  await service.markSeen(message.id, first.id);
  assert.ok((await service.listConversation(group.id, first.id))[0].seenAt);
  assert.equal((await service.listConversation(group.id, second.id))[0].seenAt, null);
  assert.ok((await service.listConversation(group.id, sender.id))[0].seenAt);
  assert.ok((await service.getConversationsForUser(first.id))[0].lastMessage?.seenAt);
  assert.equal((await service.getConversationsForUser(second.id))[0].lastMessage?.seenAt, null);
});

test("sender history and inbox suppress retained direct receipts after reader withdrawal", async () => {
  const users = new UserRepository();
  const sender = await createTestUser(users);
  const reader = await createTestUser(users);
  await authorizeTestAdultAccount(sender.id);
  await authorizeTestAdultAccount(reader.id);
  const service = new MessageService(new ConversationRepository(), new MessageRepository(), users, undefined, undefined, allowTestContacts);
  const sent = await service.sendMessage(sender.id, reader.id, 'Retained receipt privacy');
  await service.markSeen(sent.id, reader.id);
  assert.ok((await service.listConversation(sent.conversationId, sender.id))[0].seenAt);
  await users.update(reader.id, { settings: { ...reader.settings, readReceiptsEnabled: false } });
  assert.equal((await service.listConversation(sent.conversationId, sender.id))[0].seenAt, null);
  assert.equal((await service.getConversationsForUser(sender.id))[0].lastMessage?.seenAt, null);
  const stored = await pool.query('SELECT seen_at FROM messages WHERE id=$1', [sent.id]);
  assert.ok(stored.rows[0].seen_at, 'withdrawing publication does not erase the retained direct receipt');
  // A legacy row has only messages.seen_at. Its fallback must use the same
  // current reader authority as the normalized message_reads rows.
  await pool.query('DELETE FROM message_reads WHERE message_id=$1', [sent.id]);
  assert.equal((await service.listConversation(sent.conversationId, sender.id))[0].seenAt, null);
  await users.update(reader.id, { settings: { ...reader.settings, readReceiptsEnabled: true } });
  assert.ok((await service.listConversation(sent.conversationId, sender.id))[0].seenAt);
});

test("group receipt aggregation includes only currently permitted adult readers", async t => {
  const users = new UserRepository();
  const sender = await createTestUser(users);
  const first = await createTestUser(users);
  const second = await createTestUser(users);
  for (const user of [sender, first, second]) await authorizeTestAdultAccount(user.id);
  const eligibility = new EligibilityService();
  const service = new MessageService(new ConversationRepository(), new MessageRepository(), users, undefined, undefined, allowTestContacts, eligibility);
  const group = await service.createGroupChat(sender.id, [first.id, second.id], 'Receipt privacy audit');
  await service.acceptGroupInvitation(group.invitations[0].id, first.id, group.invitations[0].updatedAt);
  const secondInvite = (await service.listGroupInvitations(second.id))[0];
  await service.acceptGroupInvitation(secondInvite.id, second.id, secondInvite.updatedAt);
  const sent = await service.sendMessageToConversation(sender.id, group.id, 'Group reader privacy');
  await service.markSeen(sent.id, first.id);
  await service.markSeen(sent.id, second.id);
  await pool.query(`UPDATE message_reads SET read_at=CASE WHEN user_id=$2 THEN '2026-01-01'::timestamp
    ELSE '2026-02-01'::timestamp END WHERE message_id=$1`, [sent.id, first.id]);
  assert.match((await service.listConversation(group.id, sender.id))[0].seenAt!, /^2026-01-01/);
  await users.update(first.id, { settings: { ...first.settings, readReceiptsEnabled: false } });
  assert.match((await service.listConversation(group.id, sender.id))[0].seenAt!, /^2026-02-01/);
  const decisionsFor = eligibility.decisionForMany.bind(eligibility);
  t.mock.method(eligibility, 'decisionForMany', async (ids: string[]) => {
    const decisions = await decisionsFor(ids);
    const decision = decisions.get(second.id);
    if (decision) decisions.set(second.id, { ...decision, experience: 'teen_13_17' });
    return decisions;
  });
  assert.equal((await service.listConversation(group.id, sender.id))[0].seenAt, null);
  assert.equal((await service.getConversationsForUser(sender.id))[0].lastMessage?.seenAt, null);
});

test("concurrent first messages share one direct conversation in either direction", async () => {
  const users = new UserRepository();
  const first = await createTestUser(users);
  const second = await createTestUser(users);
  const service = new MessageService(new ConversationRepository(), new MessageRepository(), undefined, undefined, undefined, allowTestContacts);
  const conversations = await Promise.all(Array.from({ length: 12 }, (_, index) =>
    index % 2 === 0
      ? service.createConversation(first.id, second.id)
      : service.createConversation(second.id, first.id),
  ));
  assert.equal(new Set(conversations.map((conversation) => conversation.id)).size, 1);
  assert.deepEqual((await service.getConversationsForUser(first.id)).map((item) => item.conversation.id), [conversations[0].id]);
});

test("new messages move old conversations to the top of the inbox", async () => {
  const users = new UserRepository();
  const sender = await createTestUser(users);
  const recipient = await createTestUser(users);
  const other = await createTestUser(users);
  const repository = new ConversationRepository();
  const service = new MessageService(repository, new MessageRepository(), undefined, undefined, undefined, allowTestContacts);
  const older = await service.createConversation(sender.id, recipient.id);
  await pool.query('update conversations set updated_at = $1 where id = $2', ['2020-01-01T00:00:00Z', older.id]);
  await service.createConversation(sender.id, other.id);
  assert.notEqual((await repository.listForUser(sender.id))[0].id, older.id);
  await service.sendMessageToConversation(sender.id, older.id, 'Returning to an older conversation');
  assert.equal((await repository.listForUser(sender.id))[0].id, older.id);
});

for (const disabledSetting of ['allowDmFromStrangers', 'messageRequests'] as const) {
  test(`${disabledSetting} opt-outs cannot be bypassed by direct or group conversations`, async () => {
    const users = new UserRepository();
    const sender = await createTestUser(users);
    const recipient = await createTestUser(users, { privacy: { profileVisibility: 'public', allowDmFromStrangers: true, messageRequests: true, [disabledSetting]: false } });
    const service = new MessageService(new ConversationRepository(), new MessageRepository(), users, undefined, undefined, allowTestContacts);
    await assert.rejects(() => service.sendMessage(sender.id, recipient.id, 'Unwanted contact'), MessageBlockedError);
    const direct = await service.createConversation(sender.id, recipient.id);
    await assert.rejects(() => service.sendMessageToConversation(sender.id, direct.id, 'Existing thread bypass'), MessageBlockedError);
    await assert.rejects(() => service.createGroupChat(sender.id, [recipient.id], 'Group bypass'), MessageBlockedError);
    await users.followUser(sender.id, recipient.id);
    const created = await service.createGroupChat(sender.id, [recipient.id], 'Known followers');
    const group=created;
    await service.acceptGroupInvitation(created.invitations[0]!.id,recipient.id,created.invitations[0]!.updatedAt);
    await service.sendMessageToConversation(sender.id, group.id, 'Allowed contact');
    await users.unfollowUser(sender.id, recipient.id);
    await assert.rejects(() => service.sendMessageToConversation(sender.id, group.id, 'Stale group bypass'), MessageBlockedError);
  });
}

test("deleting a group creator or member preserves shared group history and removes the departed account data", async () => {
  const users = new UserRepository();
  const redis = new RedisRepository();
  const accountService = new AccountService(users, redis);
  const service = new MessageService(new ConversationRepository(), new MessageRepository(), users);

  const creator = await createTestUser(users, { passwordHash: await bcrypt.hash('creator-password', 10) });
  const memberA = await createTestUser(users, { passwordHash: await bcrypt.hash('member-a-password', 10) });
  const memberB = await createTestUser(users, { passwordHash: await bcrypt.hash('member-b-password', 10) });

  const creatorGroup = await service.createGroupChat(creator.id, [memberA.id, memberB.id], 'Creator retention');
  await service.sendMessageToConversation(creator.id, creatorGroup.id, 'Creator message');
  await service.sendMessageToConversation(memberA.id, creatorGroup.id, 'Survivor message');
  assert.equal(await accountService.deleteAccount(creator.id, 'creator-password'), true);
  const creatorMembers = await new ConversationRepository().getMembers(creatorGroup.id);
  assert.deepEqual([...creatorMembers].sort(), [memberA.id, memberB.id].sort());
  assert.equal(await accountService.deleteAccount(creator.id, 'creator-password'), false);
  const creatorHistory = await service.listConversation(creatorGroup.id, memberA.id);
  assert.ok(creatorHistory.some((message) => message.content === 'Survivor message'));
  assert.equal(creatorHistory.some((message) => message.content === 'Creator message'), false);
  await assert.rejects(() => service.sendMessageToConversation(creator.id, creatorGroup.id, 'Creator rejoin attempt'), /not a member/);

  const survivor = await createTestUser(users, { passwordHash: await bcrypt.hash('survivor-password', 10) });
  const target = await createTestUser(users, { passwordHash: await bcrypt.hash('target-password', 10) });
  const other = await createTestUser(users, { passwordHash: await bcrypt.hash('other-password', 10) });
  const targetGroup = await service.createGroupChat(survivor.id, [target.id, other.id], 'Member retention');
  await service.sendMessageToConversation(target.id, targetGroup.id, 'Departing member message');
  await service.sendMessageToConversation(other.id, targetGroup.id, 'Other member message');
  assert.equal(await accountService.deleteAccount(target.id, 'target-password'), true);
  const remainingTargetMembers = await new ConversationRepository().getMembers(targetGroup.id);
  assert.deepEqual([...remainingTargetMembers].sort(), [survivor.id, other.id].sort());
  const targetHistory = await service.listConversation(targetGroup.id, survivor.id);
  assert.ok(targetHistory.some((message) => message.content === 'Other member message'));
  assert.equal(targetHistory.some((message) => message.content === 'Departing member message'), false);
  assert.equal(await accountService.deleteAccount(target.id, 'target-password'), false);
  assert.ok((await service.listConversation(targetGroup.id, survivor.id)).some((message) => message.content === 'Other member message'));

  await redis.disconnect();
});
