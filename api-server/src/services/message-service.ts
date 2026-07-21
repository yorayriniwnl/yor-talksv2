import { randomUUID } from "node:crypto";
import { ConversationRepository, MessageRepository } from "../repositories/message-repository.js";
import type { ConversationRecord, MessageRecord } from "../types/index.js";

export class MessageService {
  constructor(
    private readonly conversationRepository: ConversationRepository,
    private readonly messageRepository: MessageRepository,
  ) {}

  async createConversation(participantA: string, participantB: string): Promise<ConversationRecord> {
    const existing = await this.conversationRepository.findBetween(participantA, participantB);
    if (existing) {
      return existing;
    }
    const conversation: ConversationRecord = {
      id: randomUUID(),
      participantA,
      participantB,
      updatedAt: new Date().toISOString(),
      participantIds: [participantA, participantB],
      isGroup: false,
      title: null,
      createdAt: new Date().toISOString(),
    };
    return this.conversationRepository.create(conversation);
  }

  async sendMessage(senderId: string, recipientId: string, content: string, options?: Partial<MessageRecord>): Promise<MessageRecord> {
    const conversation = await this.createConversation(senderId, recipientId);
    const message: MessageRecord = {
      id: randomUUID(),
      conversationId: conversation.id,
      senderId,
      recipientId,
      content,
      createdAt: new Date().toISOString(),
      seenAt: null,
      replyToId: options?.replyToId ?? null,
      forwardedFromId: options?.forwardedFromId ?? null,
      reactions: options?.reactions ?? {},
      editedAt: null,
      deletedAt: null,
      pinned: false,
      ...options,
    };
    await this.messageRepository.create(message);
    return message;
  }

  async listConversation(conversationId: string, userId: string): Promise<MessageRecord[]> {
    const conversation = await this.conversationRepository.findById(conversationId);
    if (!conversation || !conversation.participantIds.includes(userId)) {
      return [];
    }
    const messages = await this.messageRepository.listConversation(conversationId);
    return messages.filter((message: MessageRecord) => !message.deletedAt);
  }

  async markSeen(messageId: string, userId: string): Promise<MessageRecord | undefined> {
    const message = await this.messageRepository.findById(messageId);
    if (!message || (message.senderId !== userId && message.recipientId !== userId)) {
      return undefined;
    }
    message.seenAt = new Date().toISOString();
    return this.messageRepository.update(messageId, { seenAt: message.seenAt });
  }

  async editMessage(messageId: string, userId: string, content: string): Promise<MessageRecord | undefined> {
    const message = await this.messageRepository.findById(messageId);
    if (!message || (message.senderId !== userId && message.recipientId !== userId)) {
      return undefined;
    }
    message.content = content;
    message.editedAt = new Date().toISOString();
    return this.messageRepository.update(messageId, { content: message.content, editedAt: message.editedAt });
  }

  async deleteMessage(messageId: string, userId: string): Promise<MessageRecord | undefined> {
    const message = await this.messageRepository.findById(messageId);
    if (!message || (message.senderId !== userId && message.recipientId !== userId)) {
      return undefined;
    }
    message.deletedAt = new Date().toISOString();
    return this.messageRepository.update(messageId, { deletedAt: message.deletedAt });
  }

  async addReaction(messageId: string, userId: string, reaction: string): Promise<MessageRecord | undefined> {
    const message = await this.messageRepository.findById(messageId);
    if (!message) {
      return undefined;
    }
    const reactions = message.reactions ?? {};
    const current = reactions[reaction] ?? [];
    if (!current.includes(userId)) {
      current.push(userId);
      reactions[reaction] = current;
      message.reactions = reactions;
    }
    return this.messageRepository.update(messageId, { reactions: message.reactions });
  }

  async pinMessage(messageId: string): Promise<MessageRecord | undefined> {
    const message = await this.messageRepository.findById(messageId);
    if (!message) {
      return undefined;
    }
    message.pinned = true;
    return this.messageRepository.update(messageId, { pinned: message.pinned });
  }
}
