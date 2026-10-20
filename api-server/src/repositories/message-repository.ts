import { eq, or, and, asc, desc, inArray, gt, lt, isNull, sql } from "drizzle-orm";
import { messagesTable, messageReadsTable, messagePreviewEventsTable, conversationsTable, conversationMembersTable,
  conversationInvitationsTable, conversationInvitationApprovalsTable } from "@workspace/db/schema";
import { db, runInDatabaseTransaction } from "@workspace/db";
import { lockActiveUser } from "../utils/active-user-lock.js";
import type { ConversationRecord, MessageRecord } from "../types/index.js";
import { randomUUID } from "crypto";
import { visibleMessagePredicate, toMessageTombstone } from "../utils/message-visibility.js";

const currentVisibility = () => visibleMessagePredicate(sql`clock_timestamp()`);
const membershipPredicate = (userId: string) => sql`EXISTS (
  SELECT 1 FROM conversations c WHERE c.id = ${messagesTable.conversationId} AND
  CASE WHEN c.is_group
    THEN EXISTS (SELECT 1 FROM conversation_members cm WHERE cm.conversation_id=c.id AND cm.user_id=${userId})
    ELSE EXISTS (SELECT 1 FROM conversation_members cm WHERE cm.conversation_id=c.id AND cm.user_id=${userId})
      OR c.participant_a=${userId}::uuid OR c.participant_b=${userId}::uuid
  END
)`;
const unreadPredicate = (userId: string) => and(
  sql`${messagesTable.senderId} <> ${userId}::uuid`,
  sql`(${messagesTable.recipientId} <> ${userId}::uuid OR ${messagesTable.seenAt} IS NULL)`,
  sql`NOT EXISTS (SELECT 1 FROM message_reads mr WHERE mr.message_id=${messagesTable.id} AND mr.user_id=${userId})`,
)!;
class PreviewNoLongerVisible extends Error {}
export class GroupInvitationConflictError extends Error {}
type LockedGroupInvitation={conversation:typeof conversationsTable.$inferSelect;invitation:typeof conversationInvitationsTable.$inferSelect;
  currentMembers:string[];approvals:Array<typeof conversationInvitationApprovalsTable.$inferSelect>};

export class MessageRepository {
  async create(message: MessageRecord): Promise<MessageRecord> {
    return (await this.createWithResult(message)).message;
  }

  async createWithResult(message: MessageRecord, authorize?: () => Promise<void>): Promise<{ message: MessageRecord; created: boolean }> {
    return runInDatabaseTransaction(async (tx) => {
      await authorize?.();
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
  } = {}, authorize?: () => Promise<void>): Promise<MessageRecord[]> {
    const read=async()=>{
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
    };
    if(!authorize)return read();
    return runInDatabaseTransaction(async()=>{await authorize();return read();});
  }

  async lastMessageForConversation(conversationId: string, authorize?: () => Promise<void>): Promise<MessageRecord | undefined> {
    const read=async()=>{
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
    };
    if(!authorize)return read();
    return runInDatabaseTransaction(async()=>{await authorize();return read();});
  }

  async findById(messageId: string): Promise<MessageRecord | undefined> {
    const [message] = await db.select().from(messagesTable).where(eq(messagesTable.id, messageId));
    return message as MessageRecord | undefined;
  }

  async findVisibleById(messageId: string): Promise<MessageRecord | undefined> {
    const [visible] = await db.select().from(messagesTable)
      .where(and(eq(messagesTable.id, messageId), currentVisibility())).limit(1);
    return visible as MessageRecord | undefined;
  }

  async recordPreview(messageId: string, userId: string, previewedAt = new Date().toISOString()): Promise<MessageRecord | undefined> {
    return this.recordVisiblePreview(messageId, userId, new Date(previewedAt));
  }

  async recordVisiblePreview(messageId: string, userId: string, boundary = new Date(), authorize?: () => Promise<void>): Promise<MessageRecord | undefined> {
    try {
      return await runInDatabaseTransaction(async tx => {
        // Serialize previews against reads and erasure. A stale or expired row must not become visible.
        const [visible] = await tx.select().from(messagesTable)
          .where(and(eq(messagesTable.id, messageId), currentVisibility())).for("update");
        if (!visible) return undefined;
        await authorize?.();
        const [read] = await tx.select({ messageId: messageReadsTable.messageId })
          .from(messageReadsTable)
          .where(and(eq(messageReadsTable.messageId, messageId), eq(messageReadsTable.userId, userId))).limit(1);
        if (read || (visible.recipientId === userId && visible.seenAt != null)) return undefined;
        await tx.insert(messagePreviewEventsTable).values({
          messageId, userId, previewedAt: boundary.toISOString(),
        }).onConflictDoUpdate({
          target: [messagePreviewEventsTable.messageId, messagePreviewEventsTable.userId],
          set: { previewedAt: boundary.toISOString() },
        });
        // The database clock may advance past expiry while the insert executes.
        const [stillVisible] = await tx.select().from(messagesTable)
          .where(and(eq(messagesTable.id, messageId), currentVisibility())).limit(1);
        if (!stillVisible) throw new PreviewNoLongerVisible();
        return stillVisible as MessageRecord;
      });
    } catch (error) {
      if (error instanceof PreviewNoLongerVisible) return undefined;
      throw error;
    }
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
  
  async update(messageId: string, updates: Partial<MessageRecord>, authorize?: () => Promise<void>): Promise<MessageRecord | undefined> {
    return runInDatabaseTransaction(async (tx) => {
      await authorize?.();
      const [updated] = await tx.update(messagesTable)
        .set({ ...updates })
        .where(and(
          eq(messagesTable.id, messageId),
          isNull(messagesTable.deletedAt),
          or(isNull(messagesTable.expiresAt), gt(messagesTable.expiresAt, new Date().toISOString())),
        ))
        .returning();
      return updated as MessageRecord | undefined;
    });
  }

  async recordVisibleRead(messageId: string, userId: string, authorize?: () => Promise<void>): Promise<MessageRecord | undefined> {
    return runInDatabaseTransaction(async (tx) => {
      const readAt = new Date().toISOString();
      const [message] = await tx.select().from(messagesTable).where(and(
        eq(messagesTable.id, messageId),
        isNull(messagesTable.deletedAt),
        or(isNull(messagesTable.expiresAt), gt(messagesTable.expiresAt, readAt)),
      )).for("update");
      if (!message) return undefined;
      await authorize?.();
      await tx.insert(messageReadsTable).values({ messageId, userId, readAt }).onConflictDoNothing();
      // A group member reading must never populate the legacy shared seenAt field.
      // Per-member group receipts live exclusively in message_reads.
      const [conversation] = await tx.select({ isGroup: conversationsTable.isGroup })
        .from(conversationsTable).where(eq(conversationsTable.id, message.conversationId)).limit(1);
      if (!conversation || conversation.isGroup || message.recipientId !== userId || message.senderId === userId) return message as MessageRecord;
      const [updated] = await tx.update(messagesTable)
        .set({ seenAt: sql`COALESCE(${messagesTable.seenAt}, ${readAt}::timestamp)` })
        .where(and(
          eq(messagesTable.id, messageId),
          isNull(messagesTable.deletedAt),
          or(isNull(messagesTable.expiresAt), gt(messagesTable.expiresAt, readAt)),
        ))
        .returning();
      return updated as MessageRecord | undefined;
    });
  }

  async updateVisible(messageId: string, updates: Partial<MessageRecord>, authorize?: () => Promise<void>): Promise<MessageRecord | undefined> {
    return runInDatabaseTransaction(async tx=>{
      await authorize?.();
      const [updated] = await tx.update(messagesTable).set(updates)
        .where(and(eq(messagesTable.id, messageId), currentVisibility())).returning();
      return updated as MessageRecord | undefined;
    });
  }

  async addVisibleReaction(messageId: string, userId: string, reaction: string, authorize?: () => Promise<void>): Promise<MessageRecord | undefined> {
    return runInDatabaseTransaction(async tx => {
      if (!(await lockActiveUser(tx, userId))) return undefined;
      await authorize?.();
      const [updated] = await tx.update(messagesTable).set({
        reactions: sql`jsonb_set(
          COALESCE(${messagesTable.reactions}, '{}'::jsonb),
          ARRAY[${reaction}]::text[],
          (
            SELECT COALESCE(jsonb_agg(to_jsonb(users.user_id) ORDER BY users.user_id), '[]'::jsonb)
            FROM (
              SELECT DISTINCT user_id
              FROM (
                SELECT jsonb_array_elements_text(COALESCE(${messagesTable.reactions}->${reaction}, '[]'::jsonb)) AS user_id
                UNION ALL SELECT ${userId}::text
              ) current_users
            ) users
          ),
          true
        )`,
      }).where(and(eq(messagesTable.id, messageId), currentVisibility())).returning();
      return updated as MessageRecord | undefined;
    });
  }
}

export class ConversationRepository {
  async create(conversation: ConversationRecord): Promise<ConversationRecord> {
    const [created] = await db.insert(conversationsTable).values(conversation).returning();
    return created as ConversationRecord;
  }

  async findOrCreateDirect(firstId: string, secondId: string, authorize?: () => Promise<void>): Promise<ConversationRecord> {
    const [participantA, participantB] = [firstId, secondId].sort();
    return runInDatabaseTransaction(async (tx) => {
      await authorize?.();
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

  async createGroupChat(creatorId: string, title: string, authorize?: () => Promise<void>): Promise<ConversationRecord> {
    return runInDatabaseTransaction(async (tx) => {
      await authorize?.();
      const [created] = await tx.insert(conversationsTable).values({
        id: randomUUID(),
        participantA: creatorId, // Legacy column
        participantB: creatorId, // Legacy column
        participantIds: [creatorId],
        isGroup: true,
        title,
      }).returning();
      await tx.insert(conversationMembersTable).values({conversationId:created.id,userId:creatorId,role:"admin"});
      return created as ConversationRecord;
    });
  }

  async inviteToGroup(conversationId:string,inviterId:string,invitees:Array<{id:string;inviteeId:string;
    guardianRequiredUserIds:string[];policyVersions:Record<string,string>}>,authorize:(currentMembers:string[])=>Promise<void>) {
    return runInDatabaseTransaction(async tx=>{
      const [conversation]=await tx.select().from(conversationsTable).where(eq(conversationsTable.id,conversationId)).for("update");
      if(!conversation?.isGroup)throw new Error("Group not found");
      const memberRows=await tx.select({userId:conversationMembersTable.userId}).from(conversationMembersTable)
        .where(eq(conversationMembersTable.conversationId,conversationId));
      const currentMembers=memberRows.map(row=>row.userId).sort();
      if(!currentMembers.includes(inviterId))throw new Error("Only an accepted group member can invite");
      await authorize(currentMembers);
      const created=[];
      for(const invite of invitees){
        if(currentMembers.includes(invite.inviteeId))throw new Error("User is already a group member");
        const [row]=await tx.insert(conversationInvitationsTable).values({
          id:invite.id,conversationId,inviterId,inviteeId:invite.inviteeId,state:"pending",
          memberIdsAtInvite:currentMembers,guardianRequiredUserIds:invite.guardianRequiredUserIds,
          policyVersions:invite.policyVersions,updatedAt:new Date().toISOString(),
        }).returning();
        created.push(row);
      }
      return created;
    });
  }

  async listGroupInvitationsForUser(userId:string){
    return db.select().from(conversationInvitationsTable).where(and(
      eq(conversationInvitationsTable.inviteeId,userId),eq(conversationInvitationsTable.state,"pending")))
      .orderBy(desc(conversationInvitationsTable.createdAt));
  }

  private async lockedGroupInvitation(tx:any,invitationId:string):Promise<LockedGroupInvitation|undefined>{
    const [seed]=await tx.select().from(conversationInvitationsTable).where(eq(conversationInvitationsTable.id,invitationId));
    if(!seed)return undefined;
    const [conversation]=await tx.select().from(conversationsTable).where(eq(conversationsTable.id,seed.conversationId)).for("update");
    const [invitation]=await tx.select().from(conversationInvitationsTable).where(eq(conversationInvitationsTable.id,invitationId)).for("update");
    if(!conversation?.isGroup||!invitation)return undefined;
    const memberRows=await tx.select({userId:conversationMembersTable.userId}).from(conversationMembersTable)
      .where(eq(conversationMembersTable.conversationId,seed.conversationId));
    const approvalRows=await tx.select().from(conversationInvitationApprovalsTable)
      .where(eq(conversationInvitationApprovalsTable.invitationId,invitationId));
    return {conversation,invitation,currentMembers:memberRows.map((row:{userId:string})=>row.userId).sort(),approvals:approvalRows};
  }

  private async insertAcceptedGroupMember(tx:any,invitation:any,currentMembers:string[]){
    const snapshot=[...(invitation.memberIdsAtInvite as string[])].sort();
    if(JSON.stringify(snapshot)!==JSON.stringify(currentMembers)||currentMembers.includes(invitation.inviteeId))
      throw new GroupInvitationConflictError("Group membership changed; request a new invitation");
    await tx.insert(conversationMembersTable).values({conversationId:invitation.conversationId,userId:invitation.inviteeId,role:"member"});
    const participants=[...currentMembers,invitation.inviteeId];
    await tx.update(conversationsTable).set({participantIds:participants,updatedAt:new Date().toISOString()})
      .where(eq(conversationsTable.id,invitation.conversationId));
  }

  private async refreshPendingGroupInvitations(tx:any,conversationId:string,memberIds:string[],exceptId:string,
    refresh:(record:any,currentMembers:string[])=>Promise<{guardianRequiredUserIds:string[];policyVersions:Record<string,string>}>) {
    const pending=await tx.select().from(conversationInvitationsTable).where(and(
      eq(conversationInvitationsTable.conversationId,conversationId),eq(conversationInvitationsTable.state,"pending")));
    const refreshed=[];
    for(const invitation of pending){
      if(invitation.id===exceptId)continue;
      const policy=await refresh(invitation,memberIds);
      const nextUpdatedAt=new Date(Math.max(Date.now(),new Date(invitation.updatedAt).getTime()+1)).toISOString();
      await tx.delete(conversationInvitationApprovalsTable).where(eq(conversationInvitationApprovalsTable.invitationId,invitation.id));
      const [updated]=await tx.update(conversationInvitationsTable).set({memberIdsAtInvite:memberIds,
        guardianRequiredUserIds:policy.guardianRequiredUserIds,policyVersions:policy.policyVersions,
        recipientAcceptedAt:null,updatedAt:nextUpdatedAt}).where(eq(conversationInvitationsTable.id,invitation.id)).returning();
      refreshed.push(updated);
    }
    return refreshed;
  }

  async acceptGroupInvitation(invitationId:string,recipientId:string,expectedUpdatedAt:string,
    authorize:(record:any,approvals:any[],currentMembers:string[])=>Promise<boolean>,
    refresh:(record:any,currentMembers:string[])=>Promise<{guardianRequiredUserIds:string[];policyVersions:Record<string,string>}>) {
    return runInDatabaseTransaction(async tx=>{
      const locked=await this.lockedGroupInvitation(tx,invitationId),invitation=locked?.invitation;
      if(!locked||!invitation||invitation.state!=="pending"||invitation.inviteeId!==recipientId)throw new GroupInvitationConflictError("Invitation unavailable");
      if(new Date(invitation.updatedAt).toISOString()!==expectedUpdatedAt)throw new GroupInvitationConflictError("Group invitation changed; review it again");
      if(invitation.recipientAcceptedAt)throw new GroupInvitationConflictError("Invitation is waiting for guardian approval");
      const acceptedAt=new Date().toISOString();
      const approvals=locked.approvals;
      const candidate={...invitation,state:"accepted",recipientAcceptedAt:acceptedAt};
      const ready=await authorize(candidate,approvals,locked.currentMembers);
      if(ready)await this.insertAcceptedGroupMember(tx,candidate,locked.currentMembers);
      const [updated]=await tx.update(conversationInvitationsTable).set({state:ready?"accepted":"pending",recipientAcceptedAt:acceptedAt,
        updatedAt:new Date().toISOString()}).where(eq(conversationInvitationsTable.id,invitationId)).returning();
      const refreshedInvitations=ready?await this.refreshPendingGroupInvitations(tx,invitation.conversationId,
        [...locked.currentMembers,recipientId].sort(),invitationId,refresh):[];
      return {invitation:updated,refreshedInvitations};
    });
  }

  async approveGroupInvitation(invitationId:string,guardianId:string,expectedUpdatedAt:string,buildApprovals:(record:any,members:string[])=>Promise<Array<{
    childUserId:string;guardianUserId:string;guardianAuthorizationId:string;policyVersions:Record<string,string>}>>,
    authorize:(record:any,approvals:any[],members:string[])=>Promise<boolean>,
    refresh:(record:any,currentMembers:string[])=>Promise<{guardianRequiredUserIds:string[];policyVersions:Record<string,string>}>) {
    return runInDatabaseTransaction(async tx=>{
      const locked=await this.lockedGroupInvitation(tx,invitationId),invitation=locked?.invitation;
      if(!locked||!invitation||invitation.state!=="pending")throw new GroupInvitationConflictError("Invitation unavailable");
      if(new Date(invitation.updatedAt).toISOString()!==expectedUpdatedAt)throw new GroupInvitationConflictError("Group invitation changed; review it again");
      const additions=await buildApprovals(invitation,locked.currentMembers);
      if(!additions.length||additions.some(row=>row.guardianUserId!==guardianId))throw new Error("Verified guardian approval is required");
      for(const approval of additions)await tx.insert(conversationInvitationApprovalsTable).values({id:randomUUID(),invitationId,
        childUserId:approval.childUserId,guardianUserId:approval.guardianUserId,guardianAuthorizationId:approval.guardianAuthorizationId,
        policyVersions:approval.policyVersions});
      const approvals=await tx.select().from(conversationInvitationApprovalsTable)
        .where(eq(conversationInvitationApprovalsTable.invitationId,invitationId));
      if(!invitation.recipientAcceptedAt)return {invitation,refreshedInvitations:[]};
      const candidate={...invitation,state:"accepted"};
      const ready=await authorize(candidate,approvals,locked.currentMembers);
      if(!ready)return {invitation,refreshedInvitations:[]};
      await this.insertAcceptedGroupMember(tx,candidate,locked.currentMembers);
      const [updated]=await tx.update(conversationInvitationsTable).set({state:"accepted",updatedAt:new Date().toISOString()})
        .where(eq(conversationInvitationsTable.id,invitationId)).returning();
      const refreshedInvitations=await this.refreshPendingGroupInvitations(tx,invitation.conversationId,
        [...locked.currentMembers,invitation.inviteeId].sort(),invitationId,refresh);
      return {invitation:updated,refreshedInvitations};
    });
  }

  async rejectGroupInvitation(invitationId:string,recipientId:string){
    return runInDatabaseTransaction(async tx=>{
      const locked=await this.lockedGroupInvitation(tx,invitationId),invitation=locked?.invitation;
      if(!invitation||invitation.state!=="pending"||invitation.inviteeId!==recipientId)return undefined;
      const [updated]=await tx.update(conversationInvitationsTable).set({state:"rejected",rejectedAt:new Date().toISOString(),
        updatedAt:new Date().toISOString()}).where(eq(conversationInvitationsTable.id,invitationId)).returning();
      return updated;
    });
  }

  async revokeGroupInvitation(invitationId:string,actorId:string){
    return runInDatabaseTransaction(async tx=>{
      const locked=await this.lockedGroupInvitation(tx,invitationId),invitation=locked?.invitation;
      if(!locked||!invitation||!locked.currentMembers.includes(actorId))return undefined;
      const [membership]=await tx.select({role:conversationMembersTable.role}).from(conversationMembersTable).where(and(
        eq(conversationMembersTable.conversationId,invitation.conversationId),eq(conversationMembersTable.userId,actorId)));
      if(actorId!==invitation.inviterId&&membership?.role!=="admin")return undefined;
      if(invitation.state==="accepted")await tx.delete(conversationMembersTable).where(and(
        eq(conversationMembersTable.conversationId,invitation.conversationId),eq(conversationMembersTable.userId,invitation.inviteeId)));
      if(invitation.state==="accepted")await tx.update(conversationsTable).set({participantIds:locked.currentMembers
        .filter(id=>id!==invitation.inviteeId),updatedAt:new Date().toISOString()}).where(eq(conversationsTable.id,invitation.conversationId));
      const [updated]=await tx.update(conversationInvitationsTable).set({state:"revoked",revokedAt:new Date().toISOString(),
        updatedAt:new Date().toISOString()}).where(eq(conversationInvitationsTable.id,invitationId)).returning();
      return updated;
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

  async setVanishMode(conversationId: string, enabled: boolean, authorize?: () => Promise<void>): Promise<ConversationRecord | undefined> {
    return runInDatabaseTransaction(async tx=>{
      await authorize?.();
      const [updated] = await tx.update(conversationsTable).set({ vanishMode: enabled }).where(eq(conversationsTable.id, conversationId)).returning();
      return updated as ConversationRecord | undefined;
    });
  }

  async getMembers(conversationId: string): Promise<string[]> {
    const conversation=await this.findById(conversationId);
    if(!conversation)return [];
    const members = await db.select({ userId: conversationMembersTable.userId })
      .from(conversationMembersTable)
      .where(eq(conversationMembersTable.conversationId, conversationId));
    if(members.length>0||conversation.isGroup)return members.map(member=>member.userId);
    return [conversation.participantA,conversation.participantB].filter((id):id is string=>Boolean(id));
  }

  async listForUser(userId: string): Promise<ConversationRecord[]> {
    // 1. Get from new junction table
    const memberRows = await db.select({ conversationId: conversationMembersTable.conversationId })
      .from(conversationMembersTable)
      .where(eq(conversationMembersTable.userId, userId));
    
    const convIds = memberRows.map(r => r.conversationId);
    
    const directMembership=and(eq(conversationsTable.isGroup,false),or(
      eq(conversationsTable.participantA,userId),eq(conversationsTable.participantB,userId)));
    return (await db.select().from(conversationsTable).where(convIds.length
      ?or(directMembership,inArray(conversationsTable.id,convIds))
      :directMembership).orderBy(desc(conversationsTable.updatedAt)).limit(100)) as ConversationRecord[];
  }
}
