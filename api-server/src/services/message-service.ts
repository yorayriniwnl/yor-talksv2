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
      participantIds: [participantA, participantB],
      isGroup: false,
      title: null,
      createdAt: new Date().toISOString(),
    };
    return this.conversationRepository.create(conversation);
  }

  sendMessage(senderId: string, recipientId: string, content: string, options?: Partial<MessageRecord>): MessageRecord {
    const conversation = this.createConversation(senderId, recipientId);
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
    this.messageRepository.create(message);
    return message;
  }

  listConversation(conversationId: string): MessageRecord[] {
    return this.messageRepository.listConversation(conversationId).filter((message) => !message.deletedAt);
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

  editMessage(messageId: string, content: string): MessageRecord | undefined {
    const message = this.findMessage(messageId);
    if (!message) {
      return undefined;
    }
    message.content = content;
    message.editedAt = new Date().toISOString();
    return message;
  }

  deleteMessage(messageId: string): MessageRecord | undefined {
    const message = this.findMessage(messageId);
    if (!message) {
      return undefined;
    }
    message.deletedAt = new Date().toISOString();
    return message;
  }

  addReaction(messageId: string, userId: string, reaction: string): MessageRecord | undefined {
    const message = this.findMessage(messageId);
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
    return message;
  }

  pinMessage(messageId: string): MessageRecord | undefined {
    const message = this.findMessage(messageId);
    if (!message) {
      return undefined;
    }
    message.pinned = true;
    return message;
  }

  private findMessage(messageId: string): MessageRecord | undefined {
    return this.messageRepository.listConversation("").find((entry) => entry.id === messageId);
  }
}
