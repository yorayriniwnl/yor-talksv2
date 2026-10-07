import assert from "node:assert/strict";
import { after, test } from "node:test";
import { pool } from "@workspace/db";
import { randomUUID } from "node:crypto";
import { ConversationRepository, MessageRepository } from "../repositories/message-repository.js";
import { UserRepository } from "../repositories/user-repository.js";
import { RedisRepository } from "../repositories/redis-repository.js";
import { AccountService } from "../services/account-service.js";
import { createTestUser } from "./test-helpers.js";
import { MessageService } from "../services/message-service.js";

test("vanish-mode messages receive a bounded expiry", async () => {
  const conversation = {
    id: "conversation-1",
    participantA: "sender",
    participantB: "recipient",
    participantIds: ["sender", "recipient"],
    isGroup: false,
    vanishMode: true,
  };
  let persisted: any;
  const service = new MessageService(
    {
      findById: async () => conversation,
      getMembers: async () => conversation.participantIds,
      setVanishMode: async (_id: string, enabled: boolean) => ({ ...conversation, vanishMode: enabled }),
    } as never,
    {
      createWithResult: async (message: any) => { persisted = message; return { message, created: true }; },
      findById: async () => undefined,
      update: async (_id: string, updates: Record<string, unknown>) => ({ ...persisted, ...updates }),
    } as never,
    undefined,
    { moderate: async () => ({ spam: false, toxicity: false, nsfw: false }) } as never,
  );

  const sent = await service.sendMessageToConversation("sender", "conversation-1", "hello");
  assert.equal(sent.content, "hello");
  assert.ok(sent.expiresAt);
  assert.ok(Date.parse(sent.expiresAt!) - Date.parse(sent.createdAt) === 24 * 60 * 60 * 1000);

  const updatedConversation = await service.setVanishMode("conversation-1", "recipient", false);
  assert.equal(updatedConversation?.vanishMode, false);
});

test("message visibility uses a strict expiry boundary and denies invalid dates", async () => {
  const { isMessageVisible } = await import("../utils/message-visibility.js");
  const now = new Date('2026-10-07T00:00:00.000Z');
  assert.equal(isMessageVisible({}, now), true);
  assert.equal(isMessageVisible({ expiresAt: now.toISOString() }, now), false);
  assert.equal(isMessageVisible({ expiresAt: '2026-10-07T00:00:00.001Z' }, now), true);
  assert.equal(isMessageVisible({ expiresAt: '2026-10-07 00:00:00.001' }, now), true);
  assert.equal(isMessageVisible({ expiresAt: '2026-10-07 00:00:00' }, now), false);
  assert.equal(isMessageVisible({ expiresAt: 'invalid' }, now), false);
  assert.equal(isMessageVisible({ deletedAt: now.toISOString() }, now), false);
  assert.equal(isMessageVisible({}, new Date('invalid')), false);
});

test("expired retained messages cannot leak through send retries, edits, reactions or pins", async () => {
  const users = new UserRepository();
  const sender = await createTestUser(users);
  const recipient = await createTestUser(users);
  fixtureUsers.push(sender.id, recipient.id);
  const conversations = new ConversationRepository();
  const messages = new MessageRepository();
  const service = new MessageService(conversations, messages);
  const conversation = await conversations.findOrCreateDirect(sender.id, recipient.id);
  const expired = await messages.create({ id: randomUUID(), conversationId: conversation.id, senderId: sender.id,
    recipientId: recipient.id, content: 'Retained private expiry body', mediaUrl: 'https://example.test/expired-private.jpg',
    createdAt: new Date().toISOString(), seenAt: null, expiresAt: new Date(Date.now() - 1000).toISOString() });
  const retry = await service.sendMessageToConversation(sender.id, conversation.id, 'Retry', { idempotencyKey: expired.id });
  assert.equal(retry.content, '');
  assert.equal(retry.mediaUrl, null);
  assert.equal(await service.editMessage(expired.id, sender.id, 'Resurrected'), undefined);
  await assert.rejects(() => service.addReaction(expired.id, recipient.id, 'like'), /Message not found/);
  await assert.rejects(() => service.pinMessage(expired.id, recipient.id), /Message not found/);
  assert.equal((await messages.findById(expired.id))?.content, expired.content);
});

const fixtureUsers: string[] = [];
const redis = new RedisRepository();
after(async () => {
  await pool.query("DELETE FROM users WHERE id = ANY($1::uuid[])", [fixtureUsers]);
  await redis.disconnect();
  await pool.end();
});

test("reading vanish-mode content returns a tombstone and hides it from history, inbox, export and preview", async () => {
  const users = new UserRepository();
  const sender = await createTestUser(users);
  const recipient = await createTestUser(users);
  fixtureUsers.push(sender.id, recipient.id);
  const conversations = new ConversationRepository();
  const messages = new MessageRepository();
  const service = new MessageService(conversations, messages, undefined, undefined, { hasFeature: async () => true } as never);
  const conversation = await conversations.findOrCreateDirect(sender.id, recipient.id);
  const previous = await messages.create({ id: randomUUID(), conversationId: conversation.id, senderId: sender.id,
    recipientId: recipient.id, content: 'Still visible', createdAt: '2020-01-01T00:00:00Z', seenAt: null });
  await conversations.setVanishMode(conversation.id, true);
  const vanished = await messages.create({ id: randomUUID(), conversationId: conversation.id, senderId: sender.id,
    recipientId: recipient.id, content: 'Private vanished body', mediaUrl: 'https://example.test/private-vanished.jpg',
    mediaId: null, createdAt: new Date().toISOString(), seenAt: null,
    expiresAt: new Date(Date.now() + 86_400_000).toISOString() });
  const opened = await service.markSeen(vanished.id, recipient.id);
  assert.equal(opened?.content, '');
  assert.equal(opened?.mediaUrl, null);
  assert.equal(opened?.mediaId, null);
  assert.equal(opened?.mediaLegacy, false);
  assert.ok(opened?.deletedAt);
  assert.doesNotMatch(JSON.stringify(opened), /Private vanished body|private-vanished/);
  for (const userId of [sender.id, recipient.id]) {
    assert.deepEqual((await service.listConversation(conversation.id, userId)).map(row => row.id), [previous.id]);
    assert.equal((await service.getConversationsForUser(userId))[0].lastMessage?.id, previous.id);
    assert.doesNotMatch(JSON.stringify(await new AccountService(users, redis).exportAccount(userId)), /Private vanished body|private-vanished/);
  }
  assert.equal(await service.previewMessage(vanished.id, recipient.id), undefined);
  assert.equal((await messages.findById(vanished.id))?.content, 'Private vanished body');
});
