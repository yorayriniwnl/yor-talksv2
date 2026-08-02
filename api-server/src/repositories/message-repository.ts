import { eq, or, and, desc } from "drizzle-orm";
import { messagesTable, conversationsTable } from "@workspace/db/schema";
import { db } from "@workspace/db";
import type { ConversationRecord, MessageRecord } from "../types/index.js";

export class MessageRepository {
  async create(message: MessageRecord): Promise<MessageRecord> {
    const [created] = await db.insert(messagesTable).values(message).returning();
    return created as MessageRecord;
  }

  /** Fixed: this previously had no ORDER BY at all, so chat messages could come back in any order. */
  async listConversation(conversationId: string): Promise<MessageRecord[]> {
    return (await db.select().from(messagesTable).where(eq(messagesTable.conversationId, conversationId)).orderBy(messagesTable.createdAt)) as MessageRecord[];
  }

  async lastMessageForConversation(conversationId: string): Promise<MessageRecord | undefined> {
    const [message] = await db
      .select()
      .from(messagesTable)
      .where(eq(messagesTable.conversationId, conversationId))
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

  /** Didn't exist before — there was no way to list "my conversations" at all. */
  async listForUser(userId: string): Promise<ConversationRecord[]> {
    return (await db
      .select()
      .from(conversationsTable)
      .where(or(eq(conversationsTable.participantA, userId), eq(conversationsTable.participantB, userId)))
      .orderBy(desc(conversationsTable.updatedAt))) as ConversationRecord[];
  }
}
