import { eq, or, and, asc, desc, inArray, isNull, gt, lt, sql } from "drizzle-orm";
import { messagesTable, messageReadsTable, messagePreviewEventsTable, conversationsTable, conversationMembersTable, usersTable } from "@workspace/db/schema";
import { db } from "@workspace/db";
import type { ConversationRecord, MessageRecord } from "../types/index.js";
import { randomUUID } from "crypto";
import { currentMessageCondition, conversationMembershipCondition, previewEntitlementCondition } from './message-visibility.js';
import { messageTombstone, type MessageTombstone } from '../services/message-view.js';
import { visibleMessagePredicate, toMessageTombstone } from "../utils/message-visibility.js";

const currentVisibility = () => currentMessageCondition();
const membershipPredicate = (userId: string) => conversationMembershipCondition(userId);
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
      const [sender]=await tx.select({id:usersTable.id,status:usersTable.accountStatus}).from(usersTable).where(eq(usersTable.id,message.senderId)).for('share');
      if(!sender||(sender.status??'active')!=='active')throw new Error('Sender unavailable');
      // This transaction updates inbox ordering. Take UPDATE up front so two
      // simultaneous sends cannot deadlock while upgrading shared locks.
      const [conversation] = await tx.select().from(conversationsTable).where(eq(conversationsTable.id,message.conversationId)).for('update');
      if(!conversation)throw new Error('Conversation unavailable');
      const memberships=await tx.select().from(conversationMembersTable).where(and(eq(conversationMembersTable.conversationId,message.conversationId),eq(conversationMembersTable.userId,message.senderId))).for('share');
      if(conversation.isGroup?!memberships.length:conversation.participantA!==message.senderId&&conversation.participantB!==message.senderId&&!memberships.length)
        throw new Error('Conversation membership unavailable');
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
      currentMessageCondition(),
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
        currentMessageCondition(),
      ))
      .orderBy(desc(messagesTable.createdAt), desc(messagesTable.id))
      .limit(1);
    return message as MessageRecord | undefined;
  }

  async findById(messageId: string): Promise<MessageRecord | undefined> {
    const [message] = await db.select().from(messagesTable).where(and(eq(messagesTable.id, messageId), currentMessageCondition()));
    return message as MessageRecord | undefined;
  }

  /** Internal idempotency lookup only. Never serialize a retained row. */
  async findRetainedById(messageId: string): Promise<MessageRecord | undefined> {
    const [message] = await db.select().from(messagesTable).where(eq(messagesTable.id, messageId));
    return message as MessageRecord | undefined;
  }

  async findVisibleById(messageId: string): Promise<MessageRecord | undefined> {
    const [message] = await db.select().from(messagesTable).where(and(eq(messagesTable.id, messageId), currentVisibility()));
    return message as MessageRecord | undefined;
  }

  async findCurrentForUser(messageId: string, userId: string): Promise<MessageRecord | undefined> {
    const [message] = await db.select().from(messagesTable).where(and(eq(messagesTable.id, messageId), currentMessageCondition(), conversationMembershipCondition(userId)));
    return message as MessageRecord | undefined;
  }

  private async withCurrent<T>(messageId: string, userId: string,
    work: (tx: Parameters<Parameters<typeof db.transaction>[0]>[0], message: MessageRecord) => Promise<T>): Promise<T | undefined> {
    return db.transaction(async tx => {
      const [viewer]=await tx.select({id:usersTable.id,status:usersTable.accountStatus}).from(usersTable).where(eq(usersTable.id,userId)).for('share');
      if(!viewer||(viewer.status??'active')!=='active')return undefined;
      const [message] = await tx.select().from(messagesTable).where(and(eq(messagesTable.id, messageId), currentMessageCondition(), conversationMembershipCondition(userId)));
      if (!message) return undefined;
      const [conversation] = await tx.select().from(conversationsTable).where(eq(conversationsTable.id, message.conversationId)).for('share');
      if (!conversation) return undefined;
      const membership = await tx.select().from(conversationMembersTable).where(and(eq(conversationMembersTable.conversationId, message.conversationId), eq(conversationMembersTable.userId, userId))).for('share');
      if (conversation.isGroup && !membership.length) return undefined;
      if (!conversation.isGroup && conversation.participantA !== userId && conversation.participantB !== userId && !membership.length) return undefined;
      const [current] = await tx.select().from(messagesTable).where(and(eq(messagesTable.id, messageId), currentMessageCondition())).for('update');
      if (!current) return undefined;
      const [available] = await tx.select({id:messagesTable.id}).from(messagesTable).where(and(eq(messagesTable.id,messageId),currentMessageCondition()));
      if(!available)return undefined;
      return work(tx, current as MessageRecord);
    });
  }

  async recordPreview(messageId: string, userId: string, previewedAt = new Date().toISOString()): Promise<MessageRecord | undefined> {
    return this.withCurrent(messageId, userId, async (tx, message) => {
      if (message.senderId === userId || (message.recipientId === userId && message.seenAt != null)) return undefined;
      const [receipt] = await tx.select().from(messageReadsTable).where(and(eq(messageReadsTable.messageId, messageId), eq(messageReadsTable.userId, userId)));
      if (receipt) return undefined;
      const [authorized] = await tx.select({id:messagesTable.id}).from(messagesTable).where(and(eq(messagesTable.id,messageId),currentMessageCondition(),previewEntitlementCondition(userId)));
      if(!authorized)return undefined;
      await tx.insert(messagePreviewEventsTable).values({ messageId, userId, previewedAt }).onConflictDoUpdate({
        target: [messagePreviewEventsTable.messageId, messagePreviewEventsTable.userId], set: { previewedAt },
      });
      const [current] = await tx.select().from(messagesTable).where(and(eq(messagesTable.id, messageId), currentMessageCondition(),previewEntitlementCondition(userId)));
      return current as MessageRecord | undefined;
    });
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
      .where(and(eq(messagesTable.id, messageId), currentMessageCondition()))
      .returning();
    return updated as MessageRecord | undefined;
  }

  async updateVisible(messageId: string, updates: Partial<MessageRecord>): Promise<MessageRecord | undefined> {
    const [updated] = await db.update(messagesTable).set(updates)
      .where(and(eq(messagesTable.id, messageId), currentVisibility())).returning();
    return updated as MessageRecord | undefined;
  }
  async updateForUser(messageId: string, userId: string, updates: Partial<MessageRecord>, senderOnly = false): Promise<MessageRecord | undefined> {
    return this.withCurrent(messageId, userId, async (tx, message) => {
      if (senderOnly && message.senderId !== userId) return undefined;
      const [updated] = await tx.update(messagesTable).set(updates).where(and(eq(messagesTable.id, messageId), currentMessageCondition())).returning();
      return updated as MessageRecord | undefined;
    });
  }

  async deleteForUser(messageId: string, userId: string): Promise<MessageTombstone | undefined> {
    return this.withCurrent(messageId, userId, async (tx, message) => {
      if (message.senderId !== userId) return undefined;
      const [updated] = await tx.update(messagesTable).set({ deletedAt: sql`clock_timestamp()` }).where(and(eq(messagesTable.id, messageId), currentMessageCondition())).returning();
      return updated ? messageTombstone(updated as MessageRecord) : undefined;
    });
  }

  async markSeenForUser(messageId: string, userId: string): Promise<MessageRecord | MessageTombstone | undefined> {
    return this.withCurrent(messageId, userId, async (tx, message) => {
      if (message.senderId === userId) return message;
      const [conversation] = await tx.select().from(conversationsTable).where(eq(conversationsTable.id, message.conversationId));
      const readAt = new Date().toISOString();
      await tx.insert(messageReadsTable).values({ messageId, userId, readAt }).onConflictDoNothing();
      if (conversation.vanishMode) {
        const [updated] = await tx.update(messagesTable).set({ seenAt: readAt, deletedAt: sql`clock_timestamp()` }).where(and(eq(messagesTable.id, messageId), currentMessageCondition())).returning();
        return updated ? messageTombstone(updated as MessageRecord) : undefined;
      }
      const [current] = await tx.select().from(messagesTable).where(and(eq(messagesTable.id, messageId), currentMessageCondition()));
      if (!current) return undefined;
      if (conversation.isGroup) return { ...current, seenAt: readAt } as MessageRecord;
      const [updated] = await tx.update(messagesTable).set({ seenAt: readAt }).where(and(eq(messagesTable.id, messageId), currentMessageCondition())).returning();
      return updated as MessageRecord | undefined;
    });
  }

  async addReactionForUser(messageId: string, userId: string, reaction: string): Promise<MessageRecord | undefined> {
    return this.withCurrent(messageId, userId, async (tx, message) => {
      const reactions = { ...(message.reactions ?? {}) };
      reactions[reaction] = [...new Set([...(reactions[reaction] ?? []), userId])];
      const [updated] = await tx.update(messagesTable).set({ reactions }).where(and(eq(messagesTable.id, messageId), currentMessageCondition())).returning();
      return updated as MessageRecord | undefined;
    });
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
        participantA: null, // Legacy direct-only columns
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
    
    // Groups have one membership authority; stale JSON never restores access.
    const conv = await this.findById(conversationId);
    return !conv || conv.isGroup ? [] : [conv.participantA, conv.participantB].filter((id): id is string => Boolean(id));
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
          and(eq(conversationsTable.isGroup, false), or(eq(conversationsTable.participantA, userId), eq(conversationsTable.participantB, userId))),
          inArray(conversationsTable.id, convIds)
        ))
        .orderBy(desc(conversationsTable.updatedAt))
        .limit(100)) as ConversationRecord[];
    } else {
      return (await db
        .select()
        .from(conversationsTable)
        .where(and(eq(conversationsTable.isGroup, false), or(eq(conversationsTable.participantA, userId), eq(conversationsTable.participantB, userId))))
        .orderBy(desc(conversationsTable.updatedAt))
        .limit(100)) as ConversationRecord[];
    }
  }
}
