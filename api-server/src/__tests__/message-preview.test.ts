import assert from "node:assert/strict";
import { test } from "node:test";
import type { FeatureEntitlementService } from "../services/feature-entitlement-service.js";
import { MessageService, PremiumFeatureUnavailableError } from "../services/message-service.js";
import type { ConversationRepository, MessageRepository } from "../repositories/message-repository.js";
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

function createPreviewService(enabled: boolean, alreadyRead = false) {
  let recordedPreview: { messageId: string; userId: string } | undefined;
  const conversationRepository = {
    getMembers: async () => [message.senderId, message.recipientId],
  } as unknown as ConversationRepository;
  const messageRepository = {
    findById: async () => message,
    hasReadReceipt: async () => alreadyRead,
    recordPreview: async (messageId: string, userId: string) => {
      recordedPreview = { messageId, userId };
      return message;
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

  const preview = await service.previewMessage(message.id, message.recipientId);

  assert.equal(preview?.messageState, "MESSAGE_PREVIEWED");
  assert.equal(preview?.seenAt, null);
  assert.match(preview?.previewedAt ?? "", /^2026|^20/);
  assert.deepEqual(getRecordedPreview(), { messageId: message.id, userId: message.recipientId });
});

test("message preview is entitlement-gated before any preview event is recorded", async () => {
  const { service, getRecordedPreview } = createPreviewService(false);

  await assert.rejects(
    () => service.previewMessage(message.id, message.recipientId),
    PremiumFeatureUnavailableError,
  );
  assert.equal(getRecordedPreview(), undefined);
});

test("message preview does not reopen a message that already has a recipient read receipt", async () => {
  const { service, getRecordedPreview } = createPreviewService(true, true);

  const preview = await service.previewMessage(message.id, message.recipientId);

  assert.equal(preview, undefined);
  assert.equal(getRecordedPreview(), undefined);
});

test("message preview cannot be used on the sender's own message", async () => {
  const { service, getRecordedPreview } = createPreviewService(true);

  const preview = await service.previewMessage(message.id, message.senderId);

  assert.equal(preview, undefined);
  assert.equal(getRecordedPreview(), undefined);
});
