import { eq, or, and, asc, desc, inArray, isNull, gt, lt, sql } from "drizzle-orm";
import { messagesTable, messageReadsTable, messagePreviewEventsTable, conversationsTable, conversationMembersTable, usersTable } from "@workspace/db/schema";
import { db } from "@workspace/db";
import type { ConversationRecord, MessageRecord } from "../types/index.js";
import { randomUUID } from "crypto";

/** Timestamp-without-time-zone message columns contain UTC, independent of the server timezone. */
export function isMessageAvailable(message: Pick<MessageRecord, "deletedAt" | "expiresAt">, now = Date.now()): boolean {
  if (message.deletedAt) return false;
  if (!message.expiresAt) return true;
  const value = message.expiresAt.replace(" ", "T");
  const expiry = Date.parse(/(?:Z|[+-]\d{2}:?\d{2})$/i.test(value) ? value : `${value}Z`);
  return Number.isFinite(expiry) && expiry > now;
}

export const availableMessageCondition = () => and(
  isNull(messagesTable.deletedAt),
  or(isNull(messagesTable.expiresAt), gt(messagesTable.expiresAt, sql`timezone('UTC', clock_timestamp())`)),
);

// Use the same normalized membership rule as getMembers, including old direct
// conversations whose membership junction was never populated.
const memberCondition = (userId: string) => sql`EXISTS (
  SELECT 1 FROM conversations c WHERE c.id=${messagesTable.conversationId} AND (
    EXISTS (SELECT 1 FROM conversation_members cm WHERE cm.conversation_id=c.id AND cm.user_id=${userId})
    OR (NOT EXISTS (SELECT 1 FROM conversation_members cm WHERE cm.conversation_id=c.id)
      AND (c.participant_ids ? ${userId} OR c.participant_a=${userId} OR c.participant_b=${userId}))
  )
)`;

export class MessageRepository {
  async create(message: MessageRecord): Promise<MessageRecord> {
    return (await this.createWithResult(message)).message;
  }

  async createWithResult(message: MessageRecord): Promise<{ message: MessageRecord; created: boolean }> {
    return db.transaction(async (tx) => {
      const [created] = await tx.insert(messagesTable).values(message).onConflictDoNothing().returning();
      if (!created) {
        const [existing] = await tx.select().from(messagesTable).where(eq(messagesTable.id, message.id));
        if (!existing) throw new Error("Message insert conflicted without an existing message");
        return { message: existing as MessageRecord, created: false };
      }
      await tx.update(conversationsTable).set({
        updatedAt: sql`greatest(${conversationsTable.updatedAt}, ${message.createdAt}::timestamp)`,
      }).where(eq(conversationsTable.id, message.conversationId));
      return { message: created as MessageRecord, created: true };
    });
  }

  async listConversation(conversationId: string, options: {
    direction?: "latest" | "older" | "newer";
    cursorAt?: string;
    cursorId?: string;
    limit?: number;
  } = {}): Promise<MessageRecord[]> {
    const direction = options.direction ?? "latest";
    const conditions = [
      eq(messagesTable.conversationId, conversationId),
      availableMessageCondition(),
    ];
    if (options.cursorAt && options.cursorId && direction === "older") {
      conditions.push(or(
        lt(messagesTable.createdAt, options.cursorAt),
        and(eq(messagesTable.createdAt, options.cursorAt), lt(messagesTable.id, options.cursorId)),
      )!);
    } else if (options.cursorAt && options.cursorId && direction === "newer") {
      conditions.push(or(
        gt(messagesTable.createdAt, options.cursorAt),
        and(eq(messagesTable.createdAt, options.cursorAt), gt(messagesTable.id, options.cursorId)),
      )!);
    }

    const messages = await db
      .select()
      .from(messagesTable)
      .where(and(...conditions))
      .orderBy(
        direction === "newer" ? asc(messagesTable.createdAt) : desc(messagesTable.createdAt),
        direction === "newer" ? asc(messagesTable.id) : desc(messagesTable.id),
      )
      .limit(Math.max(1, Math.min(200, options.limit ?? 200)));
    return direction === "newer" ? messages as MessageRecord[] : messages.reverse() as MessageRecord[];
  }

  async lastMessageForConversation(conversationId: string): Promise<MessageRecord | undefined> {
    const [message] = await db
      .select()
      .from(messagesTable)
      .where(and(
        eq(messagesTable.conversationId, conversationId),
        availableMessageCondition(),
      ))
      .orderBy(desc(messagesTable.createdAt))
      .limit(1);
    return message as MessageRecord | undefined;
  }

  async findById(messageId: string): Promise<MessageRecord | undefined> {
    const [message] = await db.select().from(messagesTable).where(eq(messagesTable.id, messageId));
    return message as MessageRecord | undefined;
  }

  async findAvailableByIds(messageIds: string[]): Promise<MessageRecord[]> {
    if (!messageIds.length) return [];
    return await db.select().from(messagesTable).where(and(
      inArray(messagesTable.id, messageIds), availableMessageCondition(),
    )) as MessageRecord[];
  }

  async recordPreview(messageId: string, userId: string, previewedAt = new Date().toISOString()): Promise<MessageRecord | undefined> {
    return db.transaction(async tx => {
      // Serialize account removal, opening, deletion and reaction changes with
      // this preview. A receipt checked before waiting on this lock is stale.
      const [actor] = await tx.select({ id: usersTable.id }).from(usersTable)
        .where(eq(usersTable.id, userId)).for('key share');
      if (!actor) return undefined;
      const [message] = await tx.select().from(messagesTable).where(and(
        eq(messagesTable.id, messageId), availableMessageCondition(), memberCondition(userId),
        sql`${messagesTable.senderId} <> ${userId}`,
      )).for('update');
      if (!message || !isMessageAvailable(message as MessageRecord)) return undefined;
      const [receipt] = await tx.select().from(messageReadsTable).where(and(
        eq(messageReadsTable.messageId, messageId), eq(messageReadsTable.userId, userId),
      ));
      if (receipt || (message.recipientId === userId && message.seenAt !== null)) return undefined;
      await tx.insert(messagePreviewEventsTable).values({ messageId, userId, previewedAt }).onConflictDoUpdate({
        target: [messagePreviewEventsTable.messageId, messagePreviewEventsTable.userId], set: { previewedAt },
      });
      return isMessageAvailable(message as MessageRecord) ? message as MessageRecord : undefined;
    });
  }

  async recordRead(messageId: string, userId: string, readAt: string): Promise<MessageRecord | undefined> {
    return db.transaction(async tx => {
      const [actor] = await tx.select({ id: usersTable.id }).from(usersTable)
        .where(eq(usersTable.id, userId)).for('key share');
      if (!actor) return undefined;
      const [message] = await tx.select().from(messagesTable).where(and(
        eq(messagesTable.id, messageId), availableMessageCondition(), memberCondition(userId),
      )).for('update');
      if (!message || !isMessageAvailable(message as MessageRecord)) return undefined;
      if (message.senderId === userId) return message as MessageRecord;
      await tx.insert(messageReadsTable).values({ messageId, userId, readAt }).onConflictDoUpdate({
        target: [messageReadsTable.messageId, messageReadsTable.userId], set: { readAt },
      });
      const [conversation] = await tx.select().from(conversationsTable).where(eq(conversationsTable.id, message.conversationId));
      if (!isMessageAvailable(message as MessageRecord)) return undefined;
      if (conversation?.vanishMode || !conversation?.isGroup) {
        const [updated] = await tx.update(messagesTable).set({
          seenAt: readAt, ...(conversation?.vanishMode ? { deletedAt: readAt } : {}),
        }).where(and(eq(messagesTable.id, messageId), availableMessageCondition())).returning();
        return updated as MessageRecord | undefined;
      }
      return { ...message, seenAt: readAt } as MessageRecord;
    });
  }

  async addReaction(messageId: string, userId: string, reaction: string): Promise<MessageRecord | undefined> {
    return db.transaction(async tx => {
      const [actor] = await tx.select({ id: usersTable.id }).from(usersTable)
        .where(eq(usersTable.id, userId)).for('key share');
      if (!actor) return undefined;
      const [message] = await tx.select().from(messagesTable).where(and(
        eq(messagesTable.id, messageId), availableMessageCondition(), memberCondition(userId),
      )).for('update');
      if (!message || !isMessageAvailable(message as MessageRecord)) return undefined;
      const reactions = { ...(message.reactions as Record<string, string[]> | null ?? {}) };
      reactions[reaction] = [...new Set([...(reactions[reaction] ?? []), userId])];
      const [updated] = await tx.update(messagesTable).set({ reactions }).where(and(
        eq(messagesTable.id, messageId), availableMessageCondition(),
      )).returning();
      return updated && isMessageAvailable(updated as MessageRecord) ? updated as MessageRecord : undefined;
    });
  }

  async updateAvailable(messageId: string, updates: Partial<MessageRecord>): Promise<MessageRecord | undefined> {
    const [updated] = await db.update(messagesTable).set(updates).where(and(
      eq(messagesTable.id, messageId), availableMessageCondition(),
    )).returning();
    return updated && isMessageAvailable(updated as MessageRecord) ? updated as MessageRecord : undefined;
  }

  async hasReadReceipt(messageId: string, userId: string): Promise<boolean> {
    const [receipt] = await db.select({ messageId: messageReadsTable.messageId })
      .from(messageReadsTable)
      .where(and(
        eq(messageReadsTable.messageId, messageId),
        eq(messageReadsTable.userId, userId),
      ))
      .limit(1);
    return Boolean(receipt);
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

  async findOrCreateDirect(firstId: string, secondId: string): Promise<ConversationRecord> {
    const [participantA, participantB] = [firstId, secondId].sort();
    return db.transaction(async (tx) => {
      // Coordinate across requests AND server replicas, not just this process.
      // The canonical pair makes A->B and B->A acquire the same transaction lock.
      await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`direct:${participantA}:${participantB}`}, 0))`);
      const [existing] = await tx.select().from(conversationsTable).where(and(
        eq(conversationsTable.isGroup, false),
        or(
          and(eq(conversationsTable.participantA, participantA), eq(conversationsTable.participantB, participantB)),
          and(eq(conversationsTable.participantA, participantB), eq(conversationsTable.participantB, participantA)),
        ),
      )).limit(1);
      if (existing) return existing as ConversationRecord;
      const [created] = await tx.insert(conversationsTable).values({
        id: randomUUID(), participantA, participantB,
        participantIds: [participantA, participantB], isGroup: false,
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      }).returning();
      return created as ConversationRecord;
    });
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
    const [conversation] = await db.select().from(conversationsTable).where(and(
      eq(conversationsTable.isGroup, false),
      or(
        and(eq(conversationsTable.participantA, participantA), eq(conversationsTable.participantB, participantB)),
        and(eq(conversationsTable.participantA, participantB), eq(conversationsTable.participantB, participantA))
      )
    ));
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
    return (conv?.participantIds || (conv ? [conv.participantA, conv.participantB] : [])).filter((id): id is string => Boolean(id));
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
