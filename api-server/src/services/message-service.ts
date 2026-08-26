import { randomUUID } from "node:crypto";
import { ConversationRepository, MessageRepository } from "../repositories/message-repository.js";
import { UserRepository } from "../repositories/user-repository.js";
import type { ConversationRecord, MessageRecord } from "../types/index.js";
import { db } from "@workspace/db";
import { messageReadsTable, messagesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { AIService } from "./ai-service.js";
import { enforceTextContentPolicy } from "./content-policy-service.js";

export class MessageBlockedError extends Error {}
export class InvalidReplyTargetError extends Error {}
export class UnauthorizedError extends Error {}

export class MessageService {
  constructor(
    private readonly conversationRepository: ConversationRepository,
    private readonly messageRepository: MessageRepository,
    private readonly userRepository?: UserRepository,
    private readonly aiService: AIService = new AIService(),
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
    }
    return this.conversationRepository.createGroupChat(creatorId, uniqueMemberIds, title.trim().slice(0, 120) || "Group Chat");
  }

  // Legacy support for 1-to-1
  async sendMessage(senderId: string, recipientId: string, content: string, options?: Partial<MessageRecord>): Promise<MessageRecord> {
    if (this.userRepository) {
      const recipient = await this.userRepository.findById(recipientId);
      const sender = await this.userRepository.findById(senderId);
      if (!recipient || !sender || recipient.blockedUsers?.includes(senderId) || sender.blockedUsers?.includes(recipientId)) {
        throw new MessageBlockedError("You can't message this user");
      }
      if (recipient.privacy?.allowDmFromStrangers === false && !(await this.userRepository.isFollowing(senderId, recipientId))) {
        throw new MessageBlockedError("This user does not accept messages from strangers");
      }
    }
    const conversation = await this.createConversation(senderId, recipientId);
    return this.sendMessageToConversation(senderId, conversation.id, content, options);
  }

  async sendMessageToConversation(senderId: string, conversationId: string, content: string, options?: Partial<MessageRecord>): Promise<MessageRecord> {
    const conversation = await this.conversationRepository.findById(conversationId);
    if (!conversation) {
      throw new UnauthorizedError("Conversation not found");
    }
    await enforceTextContentPolicy(content, this.aiService, "message");
    const members = await this.conversationRepository.getMembers(conversationId);
    if (!members.includes(senderId)) {
      throw new UnauthorizedError("You are not a member of this conversation");
    }

    if (this.userRepository) {
      const participants = await Promise.all(
        members.filter((memberId) => memberId !== senderId).map((memberId) => this.userRepository!.findById(memberId)),
      );
      const sender = await this.userRepository.findById(senderId);
      if (!sender || participants.some((recipient) => !recipient || recipient.blockedUsers?.includes(senderId) || sender.blockedUsers?.includes(recipient.id))) {
        throw new MessageBlockedError("You can't message this user");
      }
      if (conversation.isGroup !== true && participants.length === 1 && participants[0] && participants[0].privacy?.allowDmFromStrangers === false && !(await this.userRepository.isFollowing(senderId, participants[0].id))) {
        throw new MessageBlockedError("This user does not accept messages from strangers");
      }
    }

    const replyToId = options?.replyToId ?? null;
    if (replyToId) {
      const replyTarget = await this.messageRepository.findById(replyToId);
      if (!replyTarget || replyTarget.conversationId !== conversationId) {
        throw new InvalidReplyTargetError("Reply target must belong to this conversation");
      }
    }
    const message: MessageRecord = {
      id: randomUUID(),
      conversationId,
      senderId,
      recipientId: members.find((memberId) => memberId !== senderId) ?? senderId,
      content: content.trim(),
      createdAt: new Date().toISOString(),
      seenAt: null,
      replyToId,
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
    const members = await this.conversationRepository.getMembers(conversationId);
    if (!members.includes(userId)) {
      return [];
    }
    const messages = await this.messageRepository.listConversation(conversationId);
    return messages.filter((message: MessageRecord) => !message.deletedAt);
  }

  async getConversationsForUser(userId: string): Promise<{ conversation: ConversationRecord; lastMessage: MessageRecord | undefined }[]> {
    const conversations = await this.conversationRepository.listForUser(userId);
    return Promise.all(
      conversations.map(async (conversation) => ({
        conversation,
        lastMessage: await this.messageRepository.lastMessageForConversation(conversation.id),
      })),
    );
  }

  async markSeen(messageId: string, userId: string): Promise<MessageRecord | undefined> {
    const message = await this.messageRepository.findById(messageId);
    if (!message) return undefined;
    
    const members = await this.conversationRepository.getMembers(message.conversationId);
    if (!members.includes(userId)) return undefined;

    // Track read receipt
    const readAt = new Date().toISOString();
    await db.insert(messageReadsTable).values({
      messageId,
      userId,
      readAt,
    }).onConflictDoUpdate({
      target: [messageReadsTable.messageId, messageReadsTable.userId],
      set: { readAt },
    });

    const conversation = await this.conversationRepository.findById(message.conversationId);
    // `seen_at` is a legacy single-recipient field. In a group it would tell
    // every member that everyone has read the message, so keep group read
    // receipts in message_reads and only update the legacy field for DMs.
    if (conversation?.isGroup) return { ...message, seenAt: readAt };
    message.seenAt = readAt;
    return this.messageRepository.update(messageId, { seenAt: readAt });
  }

  async editMessage(messageId: string, userId: string, content: string): Promise<MessageRecord | undefined> {
    const message = await this.messageRepository.findById(messageId);
    if (!message || message.senderId !== userId) {
      return undefined; // Only sender can edit
    }
    await enforceTextContentPolicy(content, this.aiService, "message");
    message.content = content;
    message.editedAt = new Date().toISOString();
    return this.messageRepository.update(messageId, { content: message.content, editedAt: message.editedAt });
  }

  async deleteMessage(messageId: string, userId: string): Promise<MessageRecord | undefined> {
    const message = await this.messageRepository.findById(messageId);
    if (!message || message.senderId !== userId) {
      return undefined; // Only sender can delete for now
    }
    message.deletedAt = new Date().toISOString();
    return this.messageRepository.update(messageId, { deletedAt: message.deletedAt });
  }

  private async assertParticipant(messageId: string, userId: string): Promise<MessageRecord> {
    const message = await this.messageRepository.findById(messageId);
    if (!message) {
      throw new Error("Message not found");
    }
    const members = await this.conversationRepository.getMembers(message.conversationId);
    if (!members.includes(userId)) {
      throw new Error("Not a participant in this conversation");
    }
    return message;
  }

  async addReaction(messageId: string, userId: string, reaction: string): Promise<MessageRecord | undefined> {
    const message = await this.assertParticipant(messageId, userId);
    const reactions = message.reactions ?? {};
    const current = reactions[reaction] ?? [];
    if (!current.includes(userId)) {
      current.push(userId);
      reactions[reaction] = current;
      message.reactions = reactions;
    }
    return this.messageRepository.update(messageId, { reactions: message.reactions });
  }

  async pinMessage(messageId: string, userId: string): Promise<MessageRecord | undefined> {
    await this.assertParticipant(messageId, userId);
    return this.messageRepository.update(messageId, { pinned: true });
  }
}
