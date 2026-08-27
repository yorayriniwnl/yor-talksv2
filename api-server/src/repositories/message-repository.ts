import { eq, or, and, desc, inArray, isNull, gt } from "drizzle-orm";
import { messagesTable, conversationsTable, conversationMembersTable } from "@workspace/db/schema";
import { db } from "@workspace/db";
import type { ConversationRecord, MessageRecord } from "../types/index.js";
import { randomUUID } from "crypto";

export class MessageRepository {
  async create(message: MessageRecord): Promise<MessageRecord> {
    const [created] = await db.insert(messagesTable).values(message).returning();
    return created as MessageRecord;
  }

  async listConversation(conversationId: string): Promise<MessageRecord[]> {
    const messages = await db
      .select()
      .from(messagesTable)
      .where(and(
        eq(messagesTable.conversationId, conversationId),
        isNull(messagesTable.deletedAt),
        or(isNull(messagesTable.expiresAt), gt(messagesTable.expiresAt, new Date().toISOString())),
      ))
      .orderBy(desc(messagesTable.createdAt))
      .limit(200);
    return messages.reverse() as MessageRecord[];
  }

  async lastMessageForConversation(conversationId: string): Promise<MessageRecord | undefined> {
    const [message] = await db
      .select()
      .from(messagesTable)
      .where(and(
        eq(messagesTable.conversationId, conversationId),
        isNull(messagesTable.deletedAt),
        or(isNull(messagesTable.expiresAt), gt(messagesTable.expiresAt, new Date().toISOString())),
      ))
      .orderBy(desc(messagesTable.createdAt))
      .limit(1);
    return message as MessageRecord | undefined;
  }

  async findById(messageId: string): Promise<MessageRecord | undefined> {
    const [message] = await db.select().from(messagesTable).where(eq(messagesTable.id, messageId));
    return message as MessageRecord | undefined;
  }
  
  async update(messageId: string, updates: Partial<MessageRecord>): Promise<MessageRecord | undefined> {
    const [updated] = await db.update(messagesTable)
      .set({ ...updates })
      .where(eq(messagesTable.id, messageId))
      .returning();
    return updated as MessageRecord | undefined;
  }
}

export class ConversationRepository {
  async create(conversation: ConversationRecord): Promise<ConversationRecord> {
    const [created] = await db.insert(conversationsTable).values(conversation).returning();
    return created as ConversationRecord;
  }

  async createGroupChat(creatorId: string, memberIds: string[], title: string): Promise<ConversationRecord> {
    return db.transaction(async (tx) => {
      const [created] = await tx.insert(conversationsTable).values({
        id: randomUUID(),
        participantA: creatorId, // Legacy column
        participantB: creatorId, // Legacy column
        participantIds: [creatorId, ...memberIds],
        isGroup: true,
        title,
      }).returning();

      const members = [creatorId, ...memberIds].map(id => ({
        conversationId: created.id,
        userId: id,
        role: id === creatorId ? "admin" : "member"
      }));
      await tx.insert(conversationMembersTable).values(members);
      return created as ConversationRecord;
    });
  }

  async findBetween(participantA: string, participantB: string): Promise<ConversationRecord | undefined> {
    const [conversation] = await db.select().from(conversationsTable).where(
      or(
        and(eq(conversationsTable.participantA, participantA), eq(conversationsTable.participantB, participantB)),
        and(eq(conversationsTable.participantA, participantB), eq(conversationsTable.participantB, participantA))
      )
    );
    return conversation as ConversationRecord | undefined;
  }

  async findById(conversationId: string): Promise<ConversationRecord | undefined> {
    const [conversation] = await db.select().from(conversationsTable).where(eq(conversationsTable.id, conversationId));
    return conversation as ConversationRecord | undefined;
  }

  async setVanishMode(conversationId: string, enabled: boolean): Promise<ConversationRecord | undefined> {
    const [updated] = await db.update(conversationsTable)
      .set({ vanishMode: enabled })
      .where(eq(conversationsTable.id, conversationId))
      .returning();
    return updated as ConversationRecord | undefined;
  }

  async getMembers(conversationId: string): Promise<string[]> {
    const members = await db.select({ userId: conversationMembersTable.userId })
      .from(conversationMembersTable)
      .where(eq(conversationMembersTable.conversationId, conversationId));
    
    if (members.length > 0) {
      return members.map(m => m.userId);
    }
    
    // Fallback to legacy array if members table is empty
    const conv = await this.findById(conversationId);
    return conv?.participantIds || (conv ? [conv.participantA, conv.participantB] : []);
  }

  async listForUser(userId: string): Promise<ConversationRecord[]> {
    // 1. Get from new junction table
    const memberRows = await db.select({ conversationId: conversationMembersTable.conversationId })
      .from(conversationMembersTable)
      .where(eq(conversationMembersTable.userId, userId));
    
    const convIds = memberRows.map(r => r.conversationId);
    
    // 2. Query conversations matching those IDs, OR the legacy participantA/B
    if (convIds.length > 0) {
      return (await db
        .select()
        .from(conversationsTable)
        .where(or(
          eq(conversationsTable.participantA, userId),
          eq(conversationsTable.participantB, userId),
          inArray(conversationsTable.id, convIds)
        ))
        .orderBy(desc(conversationsTable.updatedAt))
        .limit(100)) as ConversationRecord[];
    } else {
      return (await db
        .select()
        .from(conversationsTable)
        .where(or(eq(conversationsTable.participantA, userId), eq(conversationsTable.participantB, userId)))
        .orderBy(desc(conversationsTable.updatedAt))
        .limit(100)) as ConversationRecord[];
    }
  }
}
