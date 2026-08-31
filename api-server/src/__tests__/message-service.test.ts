import assert from "node:assert/strict";
import { after, test } from "node:test";
import { ConversationRepository, MessageRepository } from "../repositories/message-repository.js";
import { InvalidMessageContentError, MessageBlockedError, MessageService } from "../services/message-service.js";
import { UserRepository } from "../repositories/user-repository.js";
import { createTestUser } from "./test-helpers.js";
import { pool } from "@workspace/db";

after(() => pool.end());

test("messages support edit, delete, reaction, and pin workflows", async () => {
  const userRepository = new UserRepository();
  const sender = await createTestUser(userRepository);
  const recipient = await createTestUser(userRepository);
  const messageService = new MessageService(new ConversationRepository(), new MessageRepository());
  const sent = await messageService.sendMessage(sender.id, recipient.id, "hello");
  const reply = await messageService.sendMessage(recipient.id, sender.id, "replying", { replyToId: sent.id });
  const edited = await messageService.editMessage(sent.id, sender.id, "hello there");
  const reacted = await messageService.addReaction(sent.id, recipient.id, "thumbs-up");
  const pinned = await messageService.pinMessage(sent.id, sender.id);
  const deleted = await messageService.deleteMessage(sent.id, sender.id);

  const forged = await messageService.sendMessageToConversation(sender.id, sent.conversationId, "forged fields", {
    replyToId: sent.id,
    senderId: recipient.id,
    recipientId: sender.id,
    pinned: true,
    deletedAt: new Date().toISOString(),
  } as never);

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

test("message content length is bounded before transport-specific persistence", async () => {
  const messageService = new MessageService(new ConversationRepository(), new MessageRepository());

  await assert.rejects(
    () => messageService.sendMessage("sender", "recipient", "x".repeat(4001)),
    InvalidMessageContentError,
  );
  await assert.rejects(() => messageService.editMessage("id", "sender", "x".repeat(4001)), InvalidMessageContentError);
});

test("group read receipts survive reload and stay scoped to each recipient", async () => {
  const users = new UserRepository();
  const sender = await createTestUser(users);
  const first = await createTestUser(users);
  const second = await createTestUser(users);
  const service = new MessageService(new ConversationRepository(), new MessageRepository(), users);
  const group = await service.createGroupChat(sender.id, [first.id, second.id], "Read receipt audit");
  const message = await service.sendMessageToConversation(sender.id, group.id, "A shared conversation");
  assert.equal((await service.markSeen(message.id, sender.id))?.seenAt, null);
  await service.markSeen(message.id, first.id);
  assert.ok((await service.listConversation(group.id, first.id))[0].seenAt);
  assert.equal((await service.listConversation(group.id, second.id))[0].seenAt, null);
  assert.ok((await service.listConversation(group.id, sender.id))[0].seenAt);
  assert.ok((await service.getConversationsForUser(first.id))[0].lastMessage?.seenAt);
  assert.equal((await service.getConversationsForUser(second.id))[0].lastMessage?.seenAt, null);
});

test("concurrent first messages share one direct conversation in either direction", async () => {
  const users = new UserRepository();
  const first = await createTestUser(users);
  const second = await createTestUser(users);
  const service = new MessageService(new ConversationRepository(), new MessageRepository());
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
  const service = new MessageService(repository, new MessageRepository());
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
    const service = new MessageService(new ConversationRepository(), new MessageRepository(), users);
    await assert.rejects(() => service.sendMessage(sender.id, recipient.id, 'Unwanted contact'), MessageBlockedError);
    const direct = await service.createConversation(sender.id, recipient.id);
    await assert.rejects(() => service.sendMessageToConversation(sender.id, direct.id, 'Existing thread bypass'), MessageBlockedError);
    await assert.rejects(() => service.createGroupChat(sender.id, [recipient.id], 'Group bypass'), MessageBlockedError);
    await users.followUser(sender.id, recipient.id);
    const group = await service.createGroupChat(sender.id, [recipient.id], 'Known followers');
    await service.sendMessageToConversation(sender.id, group.id, 'Allowed contact');
    await users.unfollowUser(sender.id, recipient.id);
    await assert.rejects(() => service.sendMessageToConversation(sender.id, group.id, 'Stale group bypass'), MessageBlockedError);
  });
}
