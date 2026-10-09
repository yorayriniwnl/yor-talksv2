import { eq, or, and, asc, desc, inArray, gt, lt, sql } from "drizzle-orm";
import { messagesTable, messageReadsTable, messagePreviewEventsTable, conversationsTable, conversationMembersTable } from "@workspace/db/schema";
import { db } from "@workspace/db";
import type { ConversationRecord, MessageRecord } from "../types/index.js";
import { randomUUID } from "crypto";
import { visibleMessagePredicate, toMessageTombstone } from "../utils/message-visibility.js";

const currentVisibility = () => visibleMessagePredicate(sql`(clock_timestamp() AT TIME ZONE 'UTC')`);
const membershipPredicate = (userId: string) => sql`EXISTS (
  SELECT 1 FROM conversations c WHERE c.id = ${messagesTable.conversationId} AND
  CASE WHEN EXISTS (SELECT 1 FROM conversation_members cm WHERE cm.conversation_id=c.id)
    THEN EXISTS (SELECT 1 FROM conversation_members cm WHERE cm.conversation_id=c.id AND cm.user_id=${userId})
    ELSE CASE WHEN jsonb_typeof(c.participant_ids)='array' THEN c.participant_ids ? ${userId}
      WHEN c.participant_ids IS NULL THEN c.participant_a=${userId}::uuid OR c.participant_b=${userId}::uuid
      ELSE false END
  END
)`;
const unreadPredicate = (userId: string) => and(
  sql`${messagesTable.senderId} <> ${userId}::uuid`,
  sql`(${messagesTable.recipientId} <> ${userId}::uuid OR ${messagesTable.seenAt} IS NULL)`,
  sql`NOT EXISTS (SELECT 1 FROM message_reads mr WHERE mr.message_id=${messagesTable.id} AND mr.user_id=${userId})`,
)!;
class PreviewNoLongerVisible extends Error {}

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
      visibleMessagePredicate(new Date()),
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
        visibleMessagePredicate(new Date()),
      ))
      .orderBy(desc(messagesTable.createdAt), desc(messagesTable.id))
      .limit(1);
    return message as MessageRecord | undefined;
  }

  async findById(messageId: string): Promise<MessageRecord | undefined> {
    const [message] = await db.select().from(messagesTable).where(eq(messagesTable.id, messageId));
    return message as MessageRecord | undefined;
  }

  async findVisibleById(messageId: string): Promise<MessageRecord | undefined> {
    const [message] = await db.select().from(messagesTable).where(and(eq(messagesTable.id, messageId), currentVisibility()));
    return message as MessageRecord | undefined;
  }

  async recordVisiblePreview(messageId: string, userId: string, _now: Date): Promise<MessageRecord | undefined> {
    try {
      return await db.transaction(async tx => {
        // Serialize previews with deletion and recipient reads. Re-evaluate
        // current facts after waiting; now() would freeze the transaction clock.
        await tx.select({ id: messagesTable.id }).from(messagesTable).where(eq(messagesTable.id, messageId)).for("update");
        const allowed = () => and(eq(messagesTable.id, messageId), currentVisibility(), membershipPredicate(userId), unreadPredicate(userId));
        const [current] = await tx.select().from(messagesTable).where(allowed());
        if (!current) return undefined;
        const previewedAt = new Date().toISOString();
        await tx.insert(messagePreviewEventsTable).values({ messageId, userId, previewedAt }).onConflictDoUpdate({
          target: [messagePreviewEventsTable.messageId, messagePreviewEventsTable.userId], set: { previewedAt },
        });
        const [visible] = await tx.select().from(messagesTable).where(allowed());
        if (!visible) throw new PreviewNoLongerVisible(); // Also roll back the event.
        return { ...visible, previewedAt } as MessageRecord;
      }, { isolationLevel: "read committed" });
    } catch (error) {
      if (error instanceof PreviewNoLongerVisible) return undefined;
      throw error;
    }
  }

  async recordVisibleRead(messageId: string, userId: string): Promise<MessageRecord | undefined> {
    return db.transaction(async tx => {
      await tx.select({ id: messagesTable.id }).from(messagesTable).where(eq(messagesTable.id, messageId)).for("update");
      const [message] = await tx.select().from(messagesTable).where(and(eq(messagesTable.id, messageId), currentVisibility(), membershipPredicate(userId)));
      if (!message) return undefined;
      if (message.senderId === userId) return message as MessageRecord;
      const readAt = new Date().toISOString();
      await tx.insert(messageReadsTable).values({ messageId, userId, readAt }).onConflictDoUpdate({
        target: [messageReadsTable.messageId, messageReadsTable.userId], set: { readAt },
      });
      const [conversation] = await tx.select().from(conversationsTable).where(eq(conversationsTable.id, message.conversationId));
      if (conversation?.vanishMode) {
        const [deleted] = await tx.update(messagesTable).set({ seenAt: readAt, deletedAt: readAt }).where(eq(messagesTable.id, messageId)).returning();
        return toMessageTombstone(deleted as MessageRecord);
      }
      if (conversation?.isGroup) return { ...message, seenAt: readAt } as MessageRecord;
      const [updated] = await tx.update(messagesTable).set({ seenAt: readAt }).where(eq(messagesTable.id, messageId)).returning();
      return updated as MessageRecord;
    }, { isolationLevel: "read committed" });
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

  async updateVisible(messageId: string, updates: Partial<MessageRecord>): Promise<MessageRecord | undefined> {
    const [updated] = await db.update(messagesTable).set(updates)
      .where(and(eq(messagesTable.id, messageId), currentVisibility())).returning();
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
        participantA: null,
        participantB: null,
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
    return conv?.participantIds || (conv ? [conv.participantA, conv.participantB].filter((id): id is string => Boolean(id)) : []);
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
