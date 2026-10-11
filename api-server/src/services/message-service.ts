import { randomUUID } from "node:crypto";
import { ConversationRepository, MessageRepository } from "../repositories/message-repository.js";
import { UserRepository } from "../repositories/user-repository.js";
import type { ConversationRecord, MessageRecord, UserRecord } from "../types/index.js";
import { db } from "@workspace/db";
import { messageReadsTable, messagesTable } from "@workspace/db/schema";
import { and, eq, inArray, or, sql } from "drizzle-orm";
import { AIService } from "./ai-service.js";
import { enforceTextContentPolicy } from "./content-policy-service.js";
import { FeatureEntitlementService } from "./feature-entitlement-service.js";
import { isPremiumMessageStyle } from "../features/premium-profile.js";
import { withApprovedMedia, mediaBinding, attachmentFields, rejectRawMedia } from "./media-publication.js";
import { isMessageVisible, toMessageTombstone } from "../utils/message-visibility.js";
import type { MessageTombstone } from './message-view.js';
import { currentMessageResponse } from './media-response.js';

export class MessageBlockedError extends Error {}
export class InvalidReplyTargetError extends Error {}
export class InvalidMessageContentError extends Error {}
export class InvalidMessageStyleError extends Error {}
export class UnauthorizedError extends Error {}
export class PremiumFeatureUnavailableError extends Error {}
export class MessageUnavailableError extends Error {}

type MessageSendOptions = Pick<Partial<MessageRecord>, "replyToId" | "textStyleId"> & { idempotencyKey?: string; mediaId?: string };

const normalizeMessageContent = (content: string, hasMedia = false): string => {
  if (typeof content !== "string") throw new InvalidMessageContentError("Message must be between 1 and 4000 characters");
  const normalized = content.trim();
  if ((!normalized && !hasMedia) || normalized.length > 4000) {
    throw new InvalidMessageContentError("Message must be between 1 and 4000 characters");
  }
  return normalized;
};

export class MessageService {
  private readonly newPublications = new WeakSet<MessageRecord>();

  /** Only the winner of an idempotent insert may publish a receive event. */
  consumeNewPublication(message: MessageRecord): boolean {
    const created = this.newPublications.has(message);
    this.newPublications.delete(message);
    return created;
  }
  constructor(
    private readonly conversationRepository: ConversationRepository,
    private readonly messageRepository: MessageRepository,
    private readonly userRepository?: UserRepository,
    private readonly aiService: AIService = new AIService(),
    private readonly entitlementService: FeatureEntitlementService = new FeatureEntitlementService(),
  ) {}

  async createConversation(participantA: string, participantB: string): Promise<ConversationRecord> {
    return this.conversationRepository.findOrCreateDirect(participantA, participantB);
  }

  private async assertContactAllowed(senderId: string, recipient: UserRecord): Promise<void> {
    const followersOnly = recipient.privacy?.allowDmFromStrangers === false || recipient.privacy?.messageRequests === false;
    if (followersOnly && this.userRepository && !(await this.userRepository.isFollowing(senderId, recipient.id))) {
      throw new MessageBlockedError("This user does not accept messages from non-followers");
    }
  }

  async createGroupChat(creatorId: string, memberIds: string[], title: string): Promise<ConversationRecord> {
    const uniqueMemberIds = [...new Set(memberIds.filter((id) => id && id !== creatorId))];
    if (uniqueMemberIds.length === 0 || uniqueMemberIds.length > 99) {
      throw new Error("A group must contain between 2 and 100 people");
    }
    if (this.userRepository) {
      const members = await Promise.all([creatorId, ...uniqueMemberIds].map((id) => this.userRepository!.findById(id)));
      if (members.some((member) => !member)) throw new Error("One or more group members do not exist");
      const creator = members[0]!;
      if (members.slice(1).some((member) => member!.blockedUsers?.includes(creatorId) || creator.blockedUsers?.includes(member!.id))) {
        throw new MessageBlockedError("A group member has blocked this account");
      }
      await Promise.all(members.slice(1).map((member) => this.assertContactAllowed(creatorId, member!)));
    }
    return this.conversationRepository.createGroupChat(creatorId, uniqueMemberIds, title.trim().slice(0, 120) || "Group Chat");
  }

  async setVanishMode(conversationId: string, userId: string, enabled: boolean): Promise<ConversationRecord | undefined> {
    const members = await this.conversationRepository.getMembers(conversationId);
    if (!members.includes(userId)) throw new UnauthorizedError("You are not a member of this conversation");
    return this.conversationRepository.setVanishMode(conversationId, enabled);
  }

  // Legacy support for 1-to-1
  async sendMessage(senderId: string, recipientId: string, content: string, options?: MessageSendOptions): Promise<MessageRecord> {
    rejectRawMedia(options ?? {}, ["mediaUrl"]);
    const normalizedContent = normalizeMessageContent(content, Boolean(options?.mediaId));
    if (this.userRepository) {
      const recipient = await this.userRepository.findById(recipientId);
      const sender = await this.userRepository.findById(senderId);
      if (!recipient || !sender || recipient.blockedUsers?.includes(senderId) || sender.blockedUsers?.includes(recipientId)) {
        throw new MessageBlockedError("You can't message this user");
      }
      await this.assertContactAllowed(senderId, recipient);
    }
    const conversation = await this.createConversation(senderId, recipientId);
    return this.sendMessageToConversation(senderId, conversation.id, normalizedContent, options);
  }

  async sendMessageToConversation(senderId: string, conversationId: string, content: string, options?: MessageSendOptions): Promise<MessageRecord> {
    rejectRawMedia(options ?? {}, ["mediaUrl"]);
    const normalizedContent = normalizeMessageContent(content, Boolean(options?.mediaId));
    const conversation = await this.conversationRepository.findById(conversationId);
    if (!conversation) {
      throw new UnauthorizedError("Conversation not found");
    }
    const members = await this.conversationRepository.getMembers(conversationId);
    if (!members.includes(senderId)) {
      throw new UnauthorizedError("You are not a member of this conversation");
    }

    let senderProfile: UserRecord | undefined;
    // A request can time out after the database committed. Reusing the same
    // client key returns that exact row without invoking moderation or writing
    // a second message.
    if (options?.idempotencyKey) {
      const existing = await this.messageRepository.findRetainedById(options.idempotencyKey);
      if (existing) {
        if (existing.senderId !== senderId || existing.conversationId !== conversationId) {
          throw new UnauthorizedError("This message key is already in use");
        }
        const current = await this.messageRepository.findCurrentForUser(existing.id, senderId);
        if (!current) throw new MessageUnavailableError('This message is no longer available');
        return isMessageVisible(current, new Date()) ? current : toMessageTombstone(current);
      }
    }

    if (this.userRepository) {
      const participants = await Promise.all(
        members.filter((memberId) => memberId !== senderId).map((memberId) => this.userRepository!.findById(memberId)),
      );
      const sender = await this.userRepository.findById(senderId);
      senderProfile = sender;
      if (!sender || participants.some((recipient) => !recipient || recipient.blockedUsers?.includes(senderId) || sender.blockedUsers?.includes(recipient.id))) {
        throw new MessageBlockedError("You can't message this user");
      }
      // A pre-existing direct thread or group must not bypass a recipient's
      // current privacy settings after an unfollow or settings change.
      await Promise.all(participants.map((recipient) => this.assertContactAllowed(senderId, recipient!)));
    }

    // Authorize the conversation and its participants before invoking the
    // moderation provider. This prevents unauthorized requests from spending
    // moderation quota on arbitrary conversations.
    await enforceTextContentPolicy(normalizedContent, this.aiService, "message");

    let textStyleId = options?.textStyleId ?? senderProfile?.messageFontId ?? "default";
    if (!isPremiumMessageStyle(textStyleId)) {
      throw new InvalidMessageStyleError("Message style is not supported");
    }
    if (textStyleId !== "default" && !(await this.entitlementService.hasFeature(senderId, "MESSAGE_FONT"))) {
      textStyleId = 'default';
    }

    const replyToId = options?.replyToId ?? null;
    if (replyToId) {
      const replyTarget = await this.messageRepository.findById(replyToId);
      if (!replyTarget || replyTarget.conversationId !== conversationId) {
        throw new InvalidReplyTargetError("Reply target must belong to this conversation");
      }
    }
    const createdAt = new Date();
    const message: MessageRecord = {
      id: options?.idempotencyKey ?? randomUUID(),
      conversationId,
      senderId,
      recipientId: conversation.isGroup ? null : members.find((memberId) => memberId !== senderId) ?? senderId,
      content: normalizedContent,
      textStyleId,
      createdAt: createdAt.toISOString(),
      seenAt: null,
      replyToId,
      forwardedFromId: null,
      reactions: {},
      editedAt: null,
      deletedAt: null,
      expiresAt: conversation.vanishMode ? new Date(createdAt.getTime() + 24 * 60 * 60 * 1000).toISOString() : null,
      pinned: false,
      mediaLegacy: false,
    };
    let persisted: MessageRecord | undefined;
    await withApprovedMedia(senderId, mediaBinding(options?.mediaId, "message", "mediaUrl"), { type: "messages", id: message.id }, async media => {
      const attachment = media.mediaUrl?.[0];
      const result = await this.messageRepository.createWithResult({ ...message, ...attachmentFields(attachment), mediaId: attachment?.id ?? null });
      persisted = result.message;
      if (result.created) this.newPublications.add(result.message);
      // Conflict losers return the winning row without creating or replacing
      // its attachment references, including a text-only winning message.
      return result.created ? result.message : undefined;
    });
    if (!persisted) throw new Error("Message was not persisted");
    if (persisted.senderId !== senderId || persisted.conversationId !== conversationId) {
      throw new UnauthorizedError("This message key is already in use");
    }
    if (!this.newPublications.has(persisted)) {
      const current = await this.messageRepository.findCurrentForUser(persisted.id, senderId);
      if (!current) throw new MessageUnavailableError('This message is no longer available');
      return isMessageVisible(current, new Date()) ? current : toMessageTombstone(current);
    }
    return persisted;
  }

  async listConversation(conversationId: string, userId: string): Promise<MessageRecord[]> {
    return this.listConversationPage(conversationId, userId, { direction: "latest", limit: 200 });
  }

  async listConversationPage(conversationId: string, userId: string, options: {
    direction?: "latest" | "older" | "newer";
    cursorAt?: string;
    cursorId?: string;
    limit?: number;
  }): Promise<MessageRecord[]> {
    const members = await this.conversationRepository.getMembers(conversationId);
    if (!members.includes(userId)) {
      return [];
    }
    const messages = await this.messageRepository.listConversation(conversationId, options);
    const visible = messages.filter((message: MessageRecord) => isMessageVisible(message, new Date()));
    return currentMessageResponse(await this.withReadReceipts(visible, userId), userId);
  }

  async previewMessage(messageId: string, userId: string): Promise<MessageRecord | undefined> {
    const message = await this.messageRepository.findById(messageId);
    if (!message || !isMessageVisible(message, new Date())) return undefined;
    const members = await this.conversationRepository.getMembers(message.conversationId);
    if (!members.includes(userId)) return undefined;
    if (message.senderId === userId) return undefined;
    if (!(await this.entitlementService.hasFeature(userId, "MESSAGE_UNREAD_PREVIEW"))) {
      throw new PremiumFeatureUnavailableError("Unread message previews are not enabled for this account");
    }
    // Direct messages retain a legacy single-recipient timestamp while group
    // conversations use the per-user message_reads table. Check both so a
    // preview can never be used to reopen an already-read message.
    if ((message.recipientId === userId && message.seenAt !== null) || await this.messageRepository.hasReadReceipt(messageId, userId)) {
      return undefined;
    }
    const boundary = new Date();
    const previewed = await this.messageRepository.recordVisiblePreview(messageId, userId, boundary);
    return previewed && isMessageVisible(previewed, new Date())
      ? { ...previewed, messageState: "MESSAGE_PREVIEWED", previewedAt: previewed.previewedAt ?? boundary.toISOString() }
      : undefined;
  }

  async getConversationMemberIds(conversationId: string, userId: string): Promise<string[]> {
    const members = await this.conversationRepository.getMembers(conversationId);
    if (!members.includes(userId)) throw new UnauthorizedError("You are not a member of this conversation");
    return members;
  }

  async getConversationsForUser(userId: string): Promise<{ conversation: ConversationRecord; lastMessage: MessageRecord | undefined }[]> {
    const conversations = await this.conversationRepository.listForUser(userId);
    const results = await Promise.all(
      conversations.map(async (conversation) => ({
        conversation,
        lastMessage: await this.messageRepository.lastMessageForConversation(conversation.id),
      })),
    );
    const lastMessages = results.flatMap((result) => result.lastMessage ? [result.lastMessage] : []);
    const receipts = new Map((await this.withReadReceipts(lastMessages, userId)).map((message) => [message.id, message]));
    return currentMessageResponse(results.map((result) => ({ ...result, lastMessage: result.lastMessage ? receipts.get(result.lastMessage.id) : undefined })),userId);
  }

  private async withReadReceipts(messages: MessageRecord[], userId: string): Promise<MessageRecord[]> {
    if (!messages.length) return messages;
    const receipts = await db.select({ messageId: messageReadsTable.messageId, readAt: sql<string>`min(${messageReadsTable.readAt})` })
      .from(messageReadsTable)
      .innerJoin(messagesTable, eq(messagesTable.id, messageReadsTable.messageId))
      .where(and(
        inArray(messageReadsTable.messageId, messages.map((message) => message.id)),
        or(eq(messageReadsTable.userId, userId), eq(messagesTable.senderId, userId)),
      )).groupBy(messageReadsTable.messageId);
    const byId = new Map(receipts.map((receipt) => [receipt.messageId, receipt.readAt]));
    const boundary = new Date();
    return messages.filter(message => isMessageVisible(message, boundary))
      .map((message) => ({ ...message, seenAt: byId.get(message.id) ?? message.seenAt }));
  }

  async markSeen(messageId: string, userId: string): Promise<MessageRecord | MessageTombstone | undefined> {
    return this.messageRepository.markSeenForUser(messageId, userId);
  }

  async editMessage(messageId: string, userId: string, content: string): Promise<MessageRecord | undefined> {
    const normalizedContent = normalizeMessageContent(content);
    const message = await this.messageRepository.findById(messageId);
    if (!message || !isMessageVisible(message, new Date()) || message.senderId !== userId) {
      return undefined; // Only sender can edit
    }
    await enforceTextContentPolicy(normalizedContent, this.aiService, "message");
    message.content = normalizedContent;
    message.editedAt = new Date().toISOString();
    // Compatibility rendering is bound to the historical body. An edit is a
    // new publication and cannot mint an attachment from an arbitrary text URL.
    return this.messageRepository.updateForUser(messageId, userId, { content: message.content, editedAt: message.editedAt, mediaLegacy: false }, true);
  }

  async deleteMessage(messageId: string, userId: string): Promise<MessageTombstone | undefined> {
    return this.messageRepository.deleteForUser(messageId, userId);
  }

  private async assertParticipant(messageId: string, userId: string): Promise<MessageRecord> {
    const message = await this.messageRepository.findById(messageId);
    if (!message || !isMessageVisible(message, new Date())) {
      throw new Error("Message not found");
    }
    const members = await this.conversationRepository.getMembers(message.conversationId);
    if (!members.includes(userId)) {
      throw new Error("Not a participant in this conversation");
    }
    return message;
  }

  async addReaction(messageId: string, userId: string, reaction: string): Promise<MessageRecord | undefined> {
    await this.assertParticipant(messageId, userId);
    return this.messageRepository.addReactionForUser(messageId, userId, reaction);
  }

  async pinMessage(messageId: string, userId: string): Promise<MessageRecord | undefined> {
    await this.assertParticipant(messageId, userId);
    return this.messageRepository.updateForUser(messageId, userId, { pinned: true });
  }
}
