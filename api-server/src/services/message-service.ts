import { randomUUID } from "node:crypto";
import { ConversationRepository, MessageRepository } from "../repositories/message-repository.js";
import type { ConversationRecord, MessageRecord } from "../types/index.js";

export class MessageService {
  constructor(
    private readonly conversationRepository: ConversationRepository,
    private readonly messageRepository: MessageRepository,
  ) {}

  createConversation(participantA: string, participantB: string): ConversationRecord {
    const existing = this.conversationRepository.findBetween(participantA, participantB);
    if (existing) {
      return existing;
    }
    const conversation: ConversationRecord = {
      id: randomUUID(),
      participantA,
      participantB,
      updatedAt: new Date().toISOString(),
    };
    return this.conversationRepository.create(conversation);
  }

  sendMessage(senderId: string, recipientId: string, content: string): MessageRecord {
    const conversation = this.createConversation(senderId, recipientId);
    const message: MessageRecord = {
      id: randomUUID(),
      conversationId: conversation.id,
      senderId,
      recipientId,
      content,
      createdAt: new Date().toISOString(),
      seenAt: null,
    };
    this.messageRepository.create(message);
    return message;
  }

  listConversation(conversationId: string): MessageRecord[] {
    return this.messageRepository.listConversation(conversationId);
  }

  markSeen(messageId: string): MessageRecord | undefined {
    const all = this.messageRepository.listConversation("");
    const message = all.find((entry) => entry.id === messageId);
    if (!message) {
      return undefined;
    }
    message.seenAt = new Date().toISOString();
    return message;
  }
}
