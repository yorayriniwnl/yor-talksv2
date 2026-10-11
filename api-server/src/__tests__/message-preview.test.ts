import type { MessageTombstone } from "../services/message-view.js";
import assert from "node:assert/strict";
import { after, test } from "node:test";
import { randomUUID } from "node:crypto";
import { pool } from "@workspace/db";
import type { FeatureEntitlementService } from "../services/feature-entitlement-service.js";
import { MessageService, PremiumFeatureUnavailableError } from "../services/message-service.js";
import { ConversationRepository, MessageRepository } from "../repositories/message-repository.js";
import { UserRepository } from "../repositories/user-repository.js";
import { createTestUser } from "./test-helpers.js";
import type { MessageRecord } from "../types/index.js";

const message: MessageRecord = {
  id: "11111111-1111-4111-8111-111111111111",
  conversationId: "22222222-2222-4222-8222-222222222222",
  senderId: "33333333-3333-4333-8333-333333333333",
  recipientId: "44444444-4444-4444-8444-444444444444",
  content: "A message that can be previewed",
  createdAt: "2026-09-13T00:00:00.000Z",
  seenAt: null,
};

function createPreviewService(enabled: boolean, alreadyRead = false, row: MessageRecord = message, returnedRow = row) {
  let recordedPreview: { messageId: string; userId: string } | undefined;
  const conversationRepository = {
    getMembers: async () => [message.senderId, message.recipientId],
  } as unknown as ConversationRepository;
  const messageRepository = {
    findById: async () => row,
    hasReadReceipt: async () => alreadyRead,
    recordPreview: async (messageId: string, userId: string) => {
      recordedPreview = { messageId, userId };
      return returnedRow;
    },
    recordVisiblePreview: async (messageId: string, userId: string) => {
      if (alreadyRead || (row.recipientId === userId && row.seenAt !== null)) return undefined;
      recordedPreview = { messageId, userId };
      return returnedRow;
    },
  } as unknown as MessageRepository;
  const entitlementService = {
    hasFeature: async () => enabled,
  } as unknown as FeatureEntitlementService;
  return {
    service: new MessageService(conversationRepository, messageRepository, undefined, undefined, entitlementService),
    getRecordedPreview: () => recordedPreview,
  };
}

test("message preview records a preview lifecycle without creating a read receipt", async () => {
  const { service, getRecordedPreview } = createPreviewService(true);

  const preview = await service.previewMessage(message.id, message.recipientId!);

  assert.equal(preview?.messageState, "MESSAGE_PREVIEWED");
  assert.equal(preview?.seenAt, null);
  assert.match(preview?.previewedAt ?? "", /^2026|^20/);
  assert.deepEqual(getRecordedPreview(), { messageId: message.id, userId: message.recipientId });
});

test("message preview is entitlement-gated before any preview event is recorded", async () => {
  const { service, getRecordedPreview } = createPreviewService(false);

  await assert.rejects(
    () => service.previewMessage(message.id, message.recipientId!),
    PremiumFeatureUnavailableError,
  );
  assert.equal(getRecordedPreview(), undefined);
});

test("message preview does not reopen a message that already has a recipient read receipt", async () => {
  const { service, getRecordedPreview } = createPreviewService(true, true);

  const preview = await service.previewMessage(message.id, message.recipientId!);

  assert.equal(preview, undefined);
  assert.equal(getRecordedPreview(), undefined);
});

test("message preview cannot be used on the sender's own message", async () => {
  const { service, getRecordedPreview } = createPreviewService(true);

  const preview = await service.previewMessage(message.id, message.senderId);

  assert.equal(preview, undefined);
  assert.equal(getRecordedPreview(), undefined);
});

test("premium cannot reopen expired or deleted messages or preview as a non-member", async () => {
  for (const row of [
    { ...message, expiresAt: new Date(Date.now() - 1).toISOString() },
    { ...message, deletedAt: new Date().toISOString() },
  ]) {
    const { service, getRecordedPreview } = createPreviewService(true, false, row);
    assert.equal(await service.previewMessage(row.id, row.recipientId!), undefined);
    assert.equal(getRecordedPreview(), undefined);
  }
  const { service, getRecordedPreview } = createPreviewService(true);
  assert.equal(await service.previewMessage(message.id, randomUUID()), undefined);
  assert.equal(getRecordedPreview(), undefined);
});

test("preview return boundary rejects a row that expired or was deleted during the write", async () => {
  for (const returnedRow of [
    { ...message, expiresAt: new Date(Date.now() - 1).toISOString(), mediaId: randomUUID() },
    { ...message, deletedAt: new Date().toISOString(), mediaUrl: "private-attachment" },
  ]) {
    const { service } = createPreviewService(true, false, message, returnedRow);
    assert.equal(await service.previewMessage(message.id, message.recipientId!), undefined);
  }
});

const fixtureUsers: string[] = [];
after(async () => {
  await pool.query("DELETE FROM users WHERE id = ANY($1::uuid[])", [fixtureUsers]);
  await pool.end();
});

async function createPreviewFixture() {
  const users = new UserRepository();
  const sender = await createTestUser(users);
  const recipient = await createTestUser(users);
  fixtureUsers.push(sender.id, recipient.id);
  const conversations = new ConversationRepository();
  const messages = new MessageRepository();
  const service = new MessageService(conversations, messages, undefined, undefined, {
    hasFeature: async () => true,
  } as unknown as FeatureEntitlementService);
  const conversation = await conversations.findOrCreateDirect(sender.id, recipient.id);
  const row = await messages.create({ ...message, id: randomUUID(), conversationId: conversation.id,
    senderId: sender.id, recipientId: recipient.id, createdAt: new Date().toISOString() });
  await pool.query("INSERT INTO user_feature_overrides(user_id,feature_key,enabled,expires_at) VALUES($1,'MESSAGE_UNREAD_PREVIEW',true,now()+interval '1 hour')", [recipient.id]);
  return { sender, recipient, service, messages, conversation, row };
}

async function waitForMessageLock() {
  const deadline = Date.now() + 3000;
  while (Date.now() < deadline) {
    const waiting = await pool.query("SELECT 1 FROM pg_stat_activity WHERE datname = current_database() AND wait_event_type = 'Lock' AND query ILIKE '%messages%' AND pid <> pg_backend_pid()");
    if (waiting.rowCount) return;
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  assert.fail("preview did not wait for the message row lock");
}

test("preview checks committed deletion after waiting for a real message lock", async () => {
  const { row, recipient, service } = await createPreviewFixture();
  const blocker = await pool.connect();
  let pending: Promise<MessageRecord | undefined> | undefined;
  try {
    await blocker.query("BEGIN");
    await blocker.query("SELECT id FROM messages WHERE id=$1 FOR UPDATE", [row.id]);
    pending = service.previewMessage(row.id, recipient.id);
    await waitForMessageLock();
    await blocker.query("UPDATE messages SET deleted_at=clock_timestamp() AT TIME ZONE 'UTC' WHERE id=$1", [row.id]);
    await blocker.query("COMMIT");
    assert.equal(await pending, undefined);
    assert.equal((await pool.query("SELECT 1 FROM message_preview_events WHERE message_id=$1", [row.id])).rowCount, 0);
  } finally {
    await blocker.query("ROLLBACK");
    blocker.release();
    await pending;
  }
});

test("expiry during preview insertion denies content and rolls back the preview event", async () => {
  const { row, recipient, service } = await createPreviewFixture();
  await pool.query(`CREATE OR REPLACE FUNCTION delay_privacy_preview_fn() RETURNS trigger AS $$
    BEGIN IF NEW.message_id = '${row.id}'::uuid THEN PERFORM pg_sleep(0.7); END IF; RETURN NEW; END;
    $$ LANGUAGE plpgsql`);
  await pool.query("CREATE TRIGGER delay_privacy_preview BEFORE INSERT ON message_preview_events FOR EACH ROW EXECUTE FUNCTION delay_privacy_preview_fn()");
  try {
    await pool.query("UPDATE messages SET expires_at=(clock_timestamp() AT TIME ZONE 'UTC') + interval '300 milliseconds' WHERE id=$1", [row.id]);
    assert.equal(await service.previewMessage(row.id, recipient.id), undefined);
    assert.equal((await pool.query("SELECT 1 FROM message_preview_events WHERE message_id=$1", [row.id])).rowCount, 0);
  } finally {
    await pool.query("DROP TRIGGER delay_privacy_preview ON message_preview_events");
    await pool.query("DROP FUNCTION delay_privacy_preview_fn()");
  }
});

test("real previews remain unread and cannot bypass a committed recipient receipt", async () => {
  const { row, recipient, sender, service } = await createPreviewFixture();
  assert.equal((await service.previewMessage(row.id, recipient.id))?.content, row.content);
  assert.equal((await pool.query("SELECT 1 FROM message_reads WHERE message_id=$1", [row.id])).rowCount, 0);
  await pool.query("DELETE FROM message_preview_events WHERE message_id=$1", [row.id]);
  await service.markSeen(row.id, recipient.id);
  assert.equal(await service.previewMessage(row.id, recipient.id), undefined);
  assert.equal(await service.previewMessage(row.id, sender.id), undefined);
  assert.equal((await pool.query("SELECT 1 FROM message_preview_events WHERE message_id=$1", [row.id])).rowCount, 0);
});

test("recipient reads serialize with previews using the same real message row lock", async () => {
  for (const firstOperation of ['read', 'preview'] as const) {
    const { row, recipient, service } = await createPreviewFixture();
    const blocker = await pool.connect();
    let reading: Promise<MessageRecord | MessageTombstone | undefined> | undefined;
    let previewing: Promise<MessageRecord | undefined> | undefined;
    try {
      await blocker.query('BEGIN');
      await blocker.query('SELECT id FROM messages WHERE id=$1 FOR UPDATE', [row.id]);
      if (firstOperation === 'read') reading = service.markSeen(row.id, recipient.id);
      else previewing = service.previewMessage(row.id, recipient.id);
      await waitForMessageLock();
      if (firstOperation === 'read') previewing = service.previewMessage(row.id, recipient.id);
      else reading = service.markSeen(row.id, recipient.id);
      // Both requests have reached their lock boundary before releasing it.
      const deadline = Date.now() + 3000;
      while (true) {
        const waiting = await pool.query("SELECT count(*)::int AS count FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND query ILIKE '%messages%' AND pid<>pg_backend_pid()");
        if (waiting.rows[0].count === 2) break;
        assert.ok(Date.now() < deadline, 'read and preview must both wait for the row lock');
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      await blocker.query('COMMIT');
      const preview = await previewing;
      assert.ok((await reading)?.seenAt);
      if (firstOperation === 'read') {
        assert.equal(preview, undefined);
        assert.equal((await pool.query('SELECT 1 FROM message_preview_events WHERE message_id=$1', [row.id])).rowCount, 0);
      } else assert.equal(preview?.content, row.content);
      assert.equal(await service.previewMessage(row.id, recipient.id), undefined);
    } finally {
      await blocker.query('ROLLBACK');
      blocker.release();
      await Promise.allSettled([reading, previewing]);
    }
  }
});
