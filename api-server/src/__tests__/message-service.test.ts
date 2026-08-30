import assert from "node:assert/strict";
import { after, test } from "node:test";
import { ConversationRepository, MessageRepository } from "../repositories/message-repository.js";
import { InvalidMessageContentError, MessageService } from "../services/message-service.js";
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
});
