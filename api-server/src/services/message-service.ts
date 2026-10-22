import { randomUUID } from "node:crypto";
import { ConversationRepository, GroupInvitationConflictError, MessageRepository } from "../repositories/message-repository.js";
import { UserRepository } from "../repositories/user-repository.js";
import type { ConversationRecord, MessageRecord, UserRecord } from "../types/index.js";
import { db, runInDatabaseTransaction } from "@workspace/db";
import { messageReadsTable, messagesTable } from "@workspace/db/schema";
import { and, eq, inArray, or } from "drizzle-orm";
import { AIService } from "./ai-service.js";
import { enforceTextContentPolicy } from "./content-policy-service.js";
import { FeatureEntitlementService } from "./feature-entitlement-service.js";
import { isPremiumMessageStyle } from "../features/premium-profile.js";
import { withApprovedMedia, mediaBinding, attachmentFields, rejectRawMedia } from "./media-publication.js";
import { isMessageVisible, toMessageTombstone } from "../utils/message-visibility.js";
import { ContactAuthorizationDeniedError, ContactAuthorizationService } from "./contact-authorization-service.js";
import type { GroupInvitationAuthorityRecord, GroupInvitationApproval } from "./contact-authorization-service.js";
import { EligibilityService } from "./eligibility-service.js";

export class MessageBlockedError extends Error {}
export class InvalidReplyTargetError extends Error {}
export class InvalidMessageContentError extends Error {}
export class InvalidMessageStyleError extends Error {}
export class UnauthorizedError extends Error {}
export class PremiumFeatureUnavailableError extends Error {}
class ReadReceiptUnavailableError extends Error {}
export type SafeGroupInvite={id:string;conversationId:string;inviterId:string;recipientId:string;status:"pending"|"accepted"|"rejected"|"revoked";
  memberIds:string[];createdAt:string;updatedAt:string;requiresYourAcceptance:boolean;guardianApprovalRequired:boolean};
export type SafeGroupAcceptanceResult={invitation:SafeGroupInvite;refreshedInvitations:SafeGroupInvite[]};

type MessageSendOptions = Pick<Partial<MessageRecord>, "replyToId" | "textStyleId"> & { idempotencyKey?: string; mediaId?: string };

const normalizeMessageContent = (content: string, hasMedia = false): string => {
  if (typeof content !== "string") throw new InvalidMessageContentError("Message must be between 1 and 4000 characters");
  const normalized = content.trim();
  if ((!normalized && !hasMedia) || normalized.length > 4000) {
    throw new InvalidMessageContentError("Message must be between 1 and 4000 characters");
  }
  return normalized;
};

export class MessageService {
  constructor(
    private readonly conversationRepository: ConversationRepository,
    private readonly messageRepository: MessageRepository,
    private readonly userRepository?: UserRepository,
    private readonly aiService: AIService = new AIService(),
    private readonly entitlementService: FeatureEntitlementService = new FeatureEntitlementService(),
    private readonly contactAuthorization: ContactAuthorizationService = new ContactAuthorizationService(),
    private readonly eligibilityService: EligibilityService = new EligibilityService(),
  ) {}

  async createConversation(participantA: string, participantB: string): Promise<ConversationRecord> {
    await this.requireContact(participantA,participantB,'send');
    return this.conversationRepository.findOrCreateDirect(participantA, participantB,
      ()=>this.lockConversationContacts([participantA,participantB],'send'));
  }

  private async requireContact(userAId:string,userBId:string,action:'read'|'send'|'deliver') {
    try { await this.contactAuthorization.requireContact(userAId,userBId,action); }
    catch(error) { if(error instanceof ContactAuthorizationDeniedError) throw new UnauthorizedError(error.message); throw error; }
  }

  private async requireConversationContacts(memberIds:string[],action:'read'|'send'|'deliver',conversationId?:string){
    try {
      const conversation=conversationId?await this.conversationRepository.findById(conversationId):undefined;
      if(conversation?.isGroup)await this.contactAuthorization.requirePairwiseGroupContacts(memberIds,conversationId!,action);
      else await this.contactAuthorization.requirePairwiseContacts(memberIds,action);
    }
    catch(error) { if(error instanceof ContactAuthorizationDeniedError) throw new UnauthorizedError(error.message); throw error; }
  }

  private async lockConversationContacts(memberIds:string[],action:'read'|'send'|'deliver',conversationId?:string){
    try {
      const conversation=conversationId?await this.conversationRepository.findById(conversationId):undefined;
      await this.contactAuthorization.lockCurrentPairwiseContacts(memberIds,action,conversation?.isGroup?conversationId:undefined);
    }
    catch(error) { if(error instanceof ContactAuthorizationDeniedError) throw new UnauthorizedError(error.message); throw error; }
  }

  async authorizeConversationDelivery(conversationId:string,recipientId:string,messageId?:string):Promise<void>{
    const members=await this.conversationRepository.getMembers(conversationId);
    if(!members.includes(recipientId))throw new UnauthorizedError('You are not a member of this conversation');
    await this.requireConversationContacts(members,'deliver',conversationId);
    if (messageId) {
      const message = await this.messageRepository.findVisibleById(messageId);
      if (!message || message.conversationId !== conversationId) throw new UnauthorizedError('Message is unavailable');
    }
  }

  private async assertContactAllowed(senderId: string, recipient: UserRecord): Promise<void> {
    const followersOnly = recipient.privacy?.allowDmFromStrangers === false || recipient.privacy?.messageRequests === false;
    if (followersOnly && this.userRepository && !(await this.userRepository.isFollowing(senderId, recipient.id))) {
      throw new MessageBlockedError("This user does not accept messages from non-followers");
    }
  }

  private toSafeGroupInvite(record:any,actorId:string):SafeGroupInvite{
    return {id:record.id,conversationId:record.conversationId,inviterId:record.inviterId,recipientId:record.inviteeId,status:record.state,
      memberIds:[...(record.memberIdsAtInvite as string[])],
      createdAt:new Date(record.createdAt).toISOString(),updatedAt:new Date(record.updatedAt).toISOString(),
      requiresYourAcceptance:record.state==='pending'&&record.inviteeId===actorId&&!record.recipientAcceptedAt,
      guardianApprovalRequired:record.state==='pending'&&record.guardianRequiredUserIds.length>0};
  }

  private async invitationPolicy(inviterId:string,memberIds:string[],inviteeId:string){
    try{return await this.contactAuthorization.groupInvitationPolicy(inviterId,memberIds,inviteeId);}
    catch(error){if(error instanceof ContactAuthorizationDeniedError)throw new UnauthorizedError(error.message);throw error;}
  }

  async createGroupChat(creatorId: string, memberIds: string[], title: string): Promise<ConversationRecord&{invitations:SafeGroupInvite[]}> {
    const uniqueMemberIds = [...new Set(memberIds.filter((id) => id && id !== creatorId))];
    if (uniqueMemberIds.length === 0 || uniqueMemberIds.length > 99) {
      throw new Error("A group must contain between 2 and 100 people");
    }
    if (this.userRepository) {
      const memberIds = [creatorId, ...uniqueMemberIds];
      const memberRecords = await this.userRepository.findByIds(memberIds);
      const membersById = new Map(memberRecords.map((member) => [member.id, member]));
      const members = memberIds.map((id) => membersById.get(id));
      if (members.some((member) => !member)) throw new Error("One or more group members do not exist");
      const creator = members[0]!;
      if (members.slice(1).some((member) => member!.blockedUsers?.includes(creatorId) || creator.blockedUsers?.includes(member!.id))) {
        throw new MessageBlockedError("A group member has blocked this account");
      }
      await Promise.all(members.slice(1).map((member) => this.assertContactAllowed(creatorId, member!)));
    }
    for(const memberId of uniqueMemberIds)await this.invitationPolicy(creatorId,[creatorId],memberId);
    return runInDatabaseTransaction(async()=>{
      const conversation=await this.conversationRepository.createGroupChat(creatorId,title.trim().slice(0,120)||"Group Chat",
        async()=>{if(!uniqueMemberIds.length)throw new UnauthorizedError("A group needs at least one invitee");
          for(const memberId of uniqueMemberIds)await this.invitationPolicy(creatorId,[creatorId],memberId);});
      const invitations=await this.inviteToGroup(conversation.id,creatorId,uniqueMemberIds);
      return {...conversation,invitations};
    });
  }

  async inviteToGroup(conversationId:string,inviterId:string,inviteeIds:string[]):Promise<SafeGroupInvite[]>{
    const members=await this.conversationRepository.getMembers(conversationId);
    if(!members.includes(inviterId))throw new UnauthorizedError("Only an accepted group member can invite");
    const uniqueInvitees=[...new Set(inviteeIds.filter(id=>id&&id!==inviterId))];
    if(!uniqueInvitees.length||uniqueInvitees.length+members.length>100)throw new Error("Group size must stay between 2 and 100 people");
    if(this.userRepository){
      const userIds=[inviterId,...uniqueInvitees];
      const userRecords=await this.userRepository.findByIds(userIds);
      const usersById=new Map(userRecords.map(user=>[user.id,user]));
      const [inviter,...invitees]=userIds.map(id=>usersById.get(id));
      if(!inviter||invitees.some(user=>!user))throw new Error("One or more group members do not exist");
      if(invitees.some(user=>user!.blockedUsers?.includes(inviterId)||inviter.blockedUsers?.includes(user!.id)))
        throw new MessageBlockedError("A group member has blocked this account");
      await Promise.all(invitees.map(user=>this.assertContactAllowed(inviterId,user!)));
    }
    const policies=new Map<string,Awaited<ReturnType<MessageService['invitationPolicy']>>>();
    for(const inviteeId of uniqueInvitees)policies.set(inviteeId,await this.invitationPolicy(inviterId,members,inviteeId));
    try{
      const created=await this.conversationRepository.inviteToGroup(conversationId,inviterId,uniqueInvitees.map(inviteeId=>({
        id:randomUUID(),inviteeId,guardianRequiredUserIds:policies.get(inviteeId)!.guardianRequiredUserIds,
        policyVersions:policies.get(inviteeId)!.policyVersions,
      })),async currentMembers=>{
        if(JSON.stringify([...currentMembers].sort())!==JSON.stringify([...members].sort()))throw new UnauthorizedError("Group membership changed; invite again");
        for(const inviteeId of uniqueInvitees){
          await this.contactAuthorization.lockGroupInvitationPairs(currentMembers,inviteeId,conversationId);
          const current=await this.invitationPolicy(inviterId,currentMembers,inviteeId),snapshot=policies.get(inviteeId)!;
          if(JSON.stringify(current)!==JSON.stringify(snapshot))throw new UnauthorizedError("Group policy changed; invite again");
        }
      });
      return created.map(row=>this.toSafeGroupInvite(row,inviterId));
    }catch(error){if(error instanceof ContactAuthorizationDeniedError||error instanceof GroupInvitationConflictError)throw new UnauthorizedError(error.message);throw error;}
  }

  async listGroupInvitations(userId:string):Promise<SafeGroupInvite[]>{
    return (await this.conversationRepository.listGroupInvitationsForUser(userId)).map(row=>this.toSafeGroupInvite(row,userId));
  }

  async acceptGroupInvitation(invitationId:string,recipientId:string,expectedUpdatedAt:string):Promise<SafeGroupAcceptanceResult>{
    try{
      const accepted=await this.conversationRepository.acceptGroupInvitation(invitationId,recipientId,expectedUpdatedAt,async(record,approvals,members)=>{
        if(JSON.stringify([...members].sort())!==JSON.stringify([...(record.memberIdsAtInvite as string[])].sort()))
          throw new UnauthorizedError("Group membership changed; request a new invitation");
        if(members.length>1)await this.lockConversationContacts(members,'read',record.conversationId);
        await this.contactAuthorization.lockGroupInvitationPairs(members,record.inviteeId,record.conversationId);
        return this.contactAuthorization.authorizeGroupInvitation(record as GroupInvitationAuthorityRecord,approvals as GroupInvitationApproval[]);
      },async(record,currentMembers)=>{
        await this.contactAuthorization.lockGroupInvitationPairs(currentMembers,record.inviteeId,record.conversationId);
        return this.invitationPolicy(record.inviterId,currentMembers,record.inviteeId);
      });
      return {invitation:this.toSafeGroupInvite(accepted.invitation,recipientId),
        refreshedInvitations:accepted.refreshedInvitations.map((row:any)=>this.toSafeGroupInvite(row,row.inviteeId))};
    }catch(error){if(error instanceof ContactAuthorizationDeniedError||error instanceof GroupInvitationConflictError)throw new UnauthorizedError(error.message);throw error;}
  }

  async approveGroupInvitation(invitationId:string,guardianId:string,expectedUpdatedAt:string):Promise<SafeGroupAcceptanceResult>{
    try{
      const updated=await this.conversationRepository.approveGroupInvitation(invitationId,guardianId,expectedUpdatedAt,async(record,members)=>{
        if(JSON.stringify([...members].sort())!==JSON.stringify([...(record.memberIdsAtInvite as string[])].sort()))
          throw new UnauthorizedError("Group membership changed; request a new invitation");
        if(members.length>1)await this.lockConversationContacts(members,'read',record.conversationId);
        await this.contactAuthorization.lockGroupInvitationPairs(members,record.inviteeId,record.conversationId);
        return this.contactAuthorization.groupGuardianApprovals(invitationId,record.inviterId,record.memberIdsAtInvite as string[],record.inviteeId,guardianId);
      },async(record,approvals,members)=>{
        if(JSON.stringify([...members].sort())!==JSON.stringify([...(record.memberIdsAtInvite as string[])].sort()))
          throw new UnauthorizedError("Group membership changed; request a new invitation");
        if(members.length>1)await this.lockConversationContacts(members,'read',record.conversationId);
        await this.contactAuthorization.lockGroupInvitationPairs(members,record.inviteeId,record.conversationId);
        return this.contactAuthorization.authorizeGroupInvitation(record as GroupInvitationAuthorityRecord,approvals as GroupInvitationApproval[]);
      },async(record,currentMembers)=>{
        await this.contactAuthorization.lockGroupInvitationPairs(currentMembers,record.inviteeId,record.conversationId);
        return this.invitationPolicy(record.inviterId,currentMembers,record.inviteeId);
      });
      if(!updated)throw new UnauthorizedError("Invitation unavailable");
      return {invitation:this.toSafeGroupInvite(updated.invitation,guardianId),
        refreshedInvitations:updated.refreshedInvitations.map((row:any)=>this.toSafeGroupInvite(row,row.inviteeId))};
    }catch(error){if(error instanceof ContactAuthorizationDeniedError||error instanceof GroupInvitationConflictError)throw new UnauthorizedError(error.message);throw error;}
  }

  async rejectGroupInvitation(invitationId:string,recipientId:string):Promise<void>{
    if(!await this.conversationRepository.rejectGroupInvitation(invitationId,recipientId))throw new UnauthorizedError("Invitation unavailable");
  }

  async revokeGroupInvitation(invitationId:string,actorId:string):Promise<void>{
    if(!await this.conversationRepository.revokeGroupInvitation(invitationId,actorId))throw new UnauthorizedError("Invitation unavailable");
  }

  async setVanishMode(conversationId: string, userId: string, enabled: boolean): Promise<ConversationRecord | undefined> {
    const members = await this.conversationRepository.getMembers(conversationId);
    if (!members.includes(userId)) throw new UnauthorizedError("You are not a member of this conversation");
    await this.requireConversationContacts(members,'send',conversationId);
    return this.conversationRepository.setVanishMode(conversationId, enabled,
      () => this.lockConversationContacts(members,'send',conversationId));
  }

  // Legacy support for 1-to-1
  async sendMessage(senderId: string, recipientId: string, content: string, options?: MessageSendOptions): Promise<MessageRecord> {
    rejectRawMedia(options ?? {}, ["mediaUrl"]);
    const normalizedContent = normalizeMessageContent(content, Boolean(options?.mediaId));
    await this.requireContact(senderId,recipientId,'send');
    if (this.userRepository) {
      const recipient = await this.userRepository.findById(recipientId);
      const sender = await this.userRepository.findById(senderId);
      if (!recipient || !sender || recipient.blockedUsers?.includes(senderId) || sender.blockedUsers?.includes(recipientId)) {
        throw new MessageBlockedError("You can't message this user");
      }
      await this.assertContactAllowed(senderId, recipient);
    }
    const conversation = await this.createConversation(senderId, recipientId);
    return this.sendMessageToConversation(senderId, conversation.id, normalizedContent, options);
  }

  async sendMessageToConversation(senderId: string, conversationId: string, content: string, options?: MessageSendOptions): Promise<MessageRecord> {
    rejectRawMedia(options ?? {}, ["mediaUrl"]);
    const normalizedContent = normalizeMessageContent(content, Boolean(options?.mediaId));
    const conversation = await this.conversationRepository.findById(conversationId);
    if (!conversation) {
      throw new UnauthorizedError("Conversation not found");
    }
    const members = await this.conversationRepository.getMembers(conversationId);
    if (!members.includes(senderId)) {
      throw new UnauthorizedError("You are not a member of this conversation");
    }
    await this.requireConversationContacts(members,'send',conversationId);

    let senderProfile: UserRecord | undefined;
    // A request can time out after the database committed. Reusing the same
    // client key returns that exact row without invoking moderation or writing
    // a second message.
    if (options?.idempotencyKey) {
      const existing = await this.messageRepository.findById(options.idempotencyKey);
      if (existing) {
        if (existing.senderId !== senderId || existing.conversationId !== conversationId) {
          throw new UnauthorizedError("This message key is already in use");
        }
        return await this.messageRepository.findVisibleById(existing.id) ?? toMessageTombstone(existing);
      }
    }

    if (this.userRepository) {
      const userIds = [...new Set([senderId, ...members])];
      const userRecords = await this.userRepository.findByIds(userIds);
      const usersById = new Map(userRecords.map((user) => [user.id, user]));
      const participants = members.filter((memberId) => memberId !== senderId).map((memberId) => usersById.get(memberId));
      const sender = usersById.get(senderId);
      senderProfile = sender;
      if (!sender || participants.some((recipient) => !recipient || recipient.blockedUsers?.includes(senderId) || sender.blockedUsers?.includes(recipient.id))) {
        throw new MessageBlockedError("You can't message this user");
      }
      // A pre-existing direct thread or group must not bypass a recipient's
      // current privacy settings after an unfollow or settings change.
      await Promise.all(participants.map((recipient) => this.assertContactAllowed(senderId, recipient!)));
    }

    // Authorize the conversation and its participants before invoking the
    // moderation provider. This prevents unauthorized requests from spending
    // moderation quota on arbitrary conversations.
    await enforceTextContentPolicy(normalizedContent, this.aiService, "message");
    await this.requireConversationContacts(members,'send',conversationId);

    let textStyleId = options?.textStyleId ?? senderProfile?.messageFontId ?? "default";
    if (!isPremiumMessageStyle(textStyleId)) {
      throw new InvalidMessageStyleError("Message style is not supported");
    }
    if (textStyleId !== "default" && !(await this.entitlementService.hasFeature(senderId, "MESSAGE_FONT"))) {
      textStyleId = 'default';
    }

    const replyToId = options?.replyToId ?? null;
    if (replyToId) {
      const replyTarget = await this.messageRepository.findById(replyToId);
      if (!replyTarget || replyTarget.conversationId !== conversationId) {
        throw new InvalidReplyTargetError("Reply target must belong to this conversation");
      }
    }
    const createdAt = new Date();
    const message: MessageRecord = {
      id: options?.idempotencyKey ?? randomUUID(),
      conversationId,
      senderId,
      recipientId: members.find((memberId) => memberId !== senderId) ?? senderId,
      content: normalizedContent,
      textStyleId,
      createdAt: createdAt.toISOString(),
      seenAt: null,
      replyToId,
      forwardedFromId: null,
      reactions: {},
      editedAt: null,
      deletedAt: null,
      expiresAt: conversation.vanishMode ? new Date(createdAt.getTime() + 24 * 60 * 60 * 1000).toISOString() : null,
      pinned: false,
      mediaLegacy: false,
    };
    let persisted: MessageRecord | undefined;
    await withApprovedMedia(senderId, mediaBinding(options?.mediaId, "message", "mediaUrl"), { type: "messages", id: message.id }, async media => {
      const attachment = media.mediaUrl?.[0];
      await this.requireConversationContacts(members,'send',conversationId);
      const result = await this.messageRepository.createWithResult(
        { ...message, ...attachmentFields(attachment), mediaId: attachment?.id ?? null },
        () => this.lockConversationContacts(members,'send',conversationId),
      );
      persisted = result.message;
      // Conflict losers return the winning row without creating or replacing
      // its attachment references, including a text-only winning message.
      return result.created ? result.message : undefined;
    });
    if (!persisted) throw new Error("Message was not persisted");
    if (persisted.senderId !== senderId || persisted.conversationId !== conversationId) {
      throw new UnauthorizedError("This message key is already in use");
    }
    // A replayed idempotency key must never resurrect expired or deleted content,
    // including after the earlier visible-row lookup misses it.
    return this.isMessageVisible(persisted) ? persisted : toMessageTombstone(persisted);
  }

  async listConversation(conversationId: string, userId: string): Promise<MessageRecord[]> {
    return this.listConversationPage(conversationId, userId, { direction: "latest", limit: 200 });
  }

  async listConversationPage(conversationId: string, userId: string, options: {
    direction?: "latest" | "older" | "newer";
    cursorAt?: string;
    cursorId?: string;
    limit?: number;
  }): Promise<MessageRecord[]> {
    const members = await this.conversationRepository.getMembers(conversationId);
    if (!members.includes(userId)) {
      return [];
    }
    // Deny stale legacy threads and revoked group approvals at both the
    // service and transactional storage boundaries, including concurrent revocation.
    try { await this.requireConversationContacts(members, 'read', conversationId); }
    catch (error) { if (error instanceof UnauthorizedError) return []; throw error; }
    let messages: MessageRecord[];
    try {
      messages = await this.messageRepository.listConversation(
        conversationId, options,
        () => this.lockConversationContacts(members, 'read', conversationId),
      );
    } catch (error) { if (error instanceof UnauthorizedError) return []; throw error; }
    const withReceipts = await this.withReadReceipts(messages.filter((message: MessageRecord) => this.isMessageVisible(message)), userId);
    return withReceipts.filter((message) => this.isMessageVisible(message));
  }

  private isMessageVisible(message: MessageRecord): boolean {
    if (message.deletedAt) return false;
    if (message.expiresAt == null) return true;
    const expiresAt = Date.parse(message.expiresAt);
    return Number.isFinite(expiresAt) && expiresAt > Date.now();
  }

  async previewMessage(messageId: string, userId: string): Promise<MessageRecord | undefined> {
    const message = await this.messageRepository.findVisibleById(messageId);
    if (!message || !isMessageVisible(message, new Date())) return undefined;
    const members = await this.conversationRepository.getMembers(message.conversationId);
    if (!members.includes(userId)) return undefined;
    try { await this.requireConversationContacts(members,'read',message.conversationId); }
    catch(error) { if(error instanceof UnauthorizedError)return undefined; throw error; }
    if (message.senderId === userId) return undefined;
    if (!(await this.entitlementService.hasFeature(userId, "MESSAGE_UNREAD_PREVIEW"))) {
      throw new PremiumFeatureUnavailableError("Unread message previews are not enabled for this account");
    }
    // Direct messages retain a legacy single-recipient timestamp while group
    // conversations use the per-user message_reads table. Check both so a
    // preview can never be used to reopen an already-read message.
    if ((message.recipientId === userId && message.seenAt !== null) || await this.messageRepository.hasReadReceipt(messageId, userId)) {
      return undefined;
    }
    const boundary = new Date();
    try {
      const previewed = await this.messageRepository.recordVisiblePreview(messageId, userId, boundary,
        ()=>this.lockConversationContacts(members,'read',message.conversationId));
      return previewed && isMessageVisible(previewed, new Date())
        ? { ...previewed, messageState: "MESSAGE_PREVIEWED", previewedAt: previewed.previewedAt ?? boundary.toISOString() }
        : undefined;
    } catch(error) { if(error instanceof UnauthorizedError)return undefined; throw error; }
  }

  async getConversationMemberIds(conversationId: string, userId: string): Promise<string[]> {
    const members = await this.conversationRepository.getMembers(conversationId);
    if (!members.includes(userId)) throw new UnauthorizedError("You are not a member of this conversation");
    await this.requireConversationContacts(members,'deliver',conversationId);
    return members;
  }

  async getConversationsForUser(userId: string): Promise<{ conversation: ConversationRecord; lastMessage: MessageRecord | undefined }[]> {
    const conversations = await this.conversationRepository.listForUser(userId);
    const results = await Promise.all(
      conversations.map(async (conversation) => {
        const members=await this.conversationRepository.getMembers(conversation.id);
        if(!members.includes(userId))return undefined;
        try{await this.requireConversationContacts(members,'read',conversation.id);}
        catch(error){if(error instanceof UnauthorizedError)return undefined;throw error;}
        try {
          const lastMessage=await this.messageRepository.lastMessageForConversation(conversation.id,()=>this.lockConversationContacts(members,'read',conversation.id));
          return {conversation,lastMessage};
        } catch(error) { if(error instanceof UnauthorizedError)return undefined;throw error; }
      }),
    );
    const visibleResults=results.filter((result):result is NonNullable<typeof result>=>Boolean(result));
    const lastMessages = visibleResults.flatMap((result) => result.lastMessage ? [result.lastMessage] : []);
    const receipts = new Map((await this.withReadReceipts(lastMessages, userId)).map((message) => [message.id, message]));
    return visibleResults.map((result) => {
      const lastMessage = result.lastMessage ? receipts.get(result.lastMessage.id) : undefined;
      return { ...result, lastMessage: lastMessage && this.isMessageVisible(lastMessage) ? lastMessage : undefined };
    });
  }

  private async withReadReceipts(messages: MessageRecord[], userId: string): Promise<MessageRecord[]> {
    if (!messages.length) return messages;
    if (!(await this.readReceiptsEnabled(userId))) {
      return messages.filter(message => isMessageVisible(message, new Date()))
        .map(message => ({ ...message, seenAt: null }));
    }
    const receipts = await db.select({ messageId: messageReadsTable.messageId, userId: messageReadsTable.userId, readAt: messageReadsTable.readAt })
      .from(messageReadsTable)
      .innerJoin(messagesTable, eq(messagesTable.id, messageReadsTable.messageId))
      .where(and(
        inArray(messageReadsTable.messageId, messages.map((message) => message.id)),
        or(eq(messageReadsTable.userId, userId), eq(messagesTable.senderId, userId)),
      ));
    // A retained receipt is not authority to publish it forever. Project each
    // reader's current eligibility and choice, including the legacy direct
    // recipient timestamp, before exposing it to the sender on reload.
    const readerIds = [...new Set([
      ...receipts.map(receipt => receipt.userId),
      ...messages.map(message => message.recipientId),
    ])];
    let permittedReaders = new Set<string>();
    try {
      const [decisions, users] = await Promise.all([
        this.eligibilityService.decisionForMany(readerIds),
        (this.userRepository ?? new UserRepository()).findByIds(readerIds),
      ]);
      permittedReaders = new Set(users.filter(user => {
        const decision = decisions.get(user.id);
        return (user.accountStatus ?? 'active') === 'active' && decision?.activated
          && decision.experience === 'adult_18_plus' && user.settings.readReceiptsEnabled !== false;
      }).map(user => user.id));
    } catch { /* Receipt authority is optional; unavailable readers stay private. */ }
    const byId = new Map<string, string>();
    for (const receipt of receipts) {
      if (!permittedReaders.has(receipt.userId)) continue;
      const previous = byId.get(receipt.messageId);
      if (!previous || receipt.readAt < previous) byId.set(receipt.messageId, receipt.readAt);
    }
    const boundary = new Date();
    return messages.filter(message => isMessageVisible(message, boundary))
      .map((message) => ({ ...message, seenAt: byId.get(message.id)
        ?? (permittedReaders.has(message.recipientId) ? message.seenAt : null) }));
  }

  async markSeen(messageId: string, userId: string): Promise<MessageRecord | undefined> {
    const candidate=await this.messageRepository.findVisibleById(messageId);
    if(!candidate||!isMessageVisible(candidate,new Date()))return undefined;
    const members=await this.conversationRepository.getMembers(candidate.conversationId);
    if(!members.includes(userId))return undefined;
    try { await this.requireConversationContacts(members,'read',candidate.conversationId); }
    catch(error) { if(error instanceof UnauthorizedError)return undefined; throw error; }
    const conversation = await this.conversationRepository.findById(candidate.conversationId);
    if (conversation?.vanishMode && candidate.senderId !== userId) {
      // Vanish mode is an expiry of visible content, not merely a read receipt.
      // Mark the row deleted atomically after reauthorizing its contacts; keep
      // the stored bytes for controlled retention, but never return them.
      try {
        const vanished = await this.messageRepository.updateVisible(
          messageId, { deletedAt: new Date().toISOString() },
          () => this.lockConversationContacts(members, 'read', candidate.conversationId),
        );
        return vanished ? toMessageTombstone(vanished) : undefined;
      } catch (error) {
        if (error instanceof UnauthorizedError) return undefined;
        throw error;
      }
    }
    // A minor or unverified account may read messages without creating a
    // sender-visible receipt. Keep this decision at the storage boundary.
    if (!(await this.readReceiptsEnabled(userId))) return candidate;
    let message:MessageRecord|undefined;
    try { message = await this.messageRepository.recordVisibleRead(messageId, userId,
      async()=>{
        if (!(await this.readReceiptsEnabled(userId))) throw new ReadReceiptUnavailableError();
        await this.lockConversationContacts(members,'read',candidate.conversationId);
      }); }
    catch(error) {
      if (error instanceof ReadReceiptUnavailableError) return candidate;
      if(error instanceof UnauthorizedError)return undefined;
      throw error;
    }
    if (!message || message.deletedAt) return message;
    return isMessageVisible(message, new Date()) ? message : undefined;
  }

  private async readReceiptsEnabled(userId: string): Promise<boolean> {
    try {
      const decision = await this.eligibilityService.decisionFor(userId);
      if (!decision.activated || decision.experience !== "adult_18_plus") return false;
      const user = await (this.userRepository ?? new UserRepository()).findById(userId);
      return Boolean(user && (user.accountStatus ?? 'active') === 'active' && user.settings.readReceiptsEnabled !== false);
    } catch {
      return false;
    }
  }

  /** Recheck the reader's current choice at delivery, including retained timestamps. */
  async canPublishReadReceipt(message: Pick<MessageRecord, 'senderId' | 'seenAt'>, readerId: string): Promise<boolean> {
    return message.senderId !== readerId && Boolean(message.seenAt) && await this.readReceiptsEnabled(readerId);
  }

  async editMessage(messageId: string, userId: string, content: string): Promise<MessageRecord | undefined> {
    const normalizedContent = normalizeMessageContent(content);
    const message = await this.messageRepository.findVisibleById(messageId);
    if (!message || !isMessageVisible(message, new Date()) || message.senderId !== userId) {
      return undefined; // Only sender can edit
    }
    const members=await this.conversationRepository.getMembers(message.conversationId);
    if(!members.includes(userId))return undefined;
    try { await this.requireConversationContacts(members,'send',message.conversationId); }
    catch(error) { if(error instanceof UnauthorizedError)return undefined; throw error; }
    await enforceTextContentPolicy(normalizedContent, this.aiService, "message");
    message.content = normalizedContent;
    message.editedAt = new Date().toISOString();
    // Compatibility rendering is bound to the historical body. An edit is a
    // new publication and cannot mint an attachment from an arbitrary text URL.
    try {
      return await this.messageRepository.updateVisible(messageId, { content: message.content, editedAt: message.editedAt, mediaLegacy: false },
        ()=>this.lockConversationContacts(members,'send',message.conversationId));
    } catch(error) { if(error instanceof UnauthorizedError)return undefined; throw error; }
  }

  async deleteMessage(messageId: string, userId: string): Promise<MessageRecord | undefined> {
    const message = await this.messageRepository.findById(messageId);
    if (!message || message.senderId !== userId) {
      return undefined; // Only sender can delete for now
    }
    const members=await this.conversationRepository.getMembers(message.conversationId);
    if(!members.includes(userId))return undefined;
    try { await this.requireConversationContacts(members,'send',message.conversationId); }
    catch(error) { if(error instanceof UnauthorizedError)return undefined; throw error; }
    message.deletedAt = new Date().toISOString();
    try {
      const deleted = await this.messageRepository.update(messageId, { deletedAt: message.deletedAt },
        ()=>this.lockConversationContacts(members,'send',message.conversationId));
      return deleted ? toMessageTombstone(deleted) : undefined;
    } catch(error) { if(error instanceof UnauthorizedError)return undefined; throw error; }
  }

  private async assertParticipant(messageId: string, userId: string): Promise<MessageRecord> {
    const message = await this.messageRepository.findVisibleById(messageId);
    if (!message || !isMessageVisible(message, new Date())) {
      throw new Error("Message not found");
    }
    const members = await this.conversationRepository.getMembers(message.conversationId);
    if (!members.includes(userId)) {
      throw new Error("Not a participant in this conversation");
    }
    await this.requireConversationContacts(members,'read',message.conversationId);
    return message;
  }

  async addReaction(messageId: string, userId: string, reaction: string): Promise<MessageRecord | undefined> {
    const message = await this.assertParticipant(messageId, userId);
    return this.messageRepository.addVisibleReaction(messageId, userId, reaction, async()=>{
      const members=await this.conversationRepository.getMembers(message.conversationId);
      await this.lockConversationContacts(members,'send',message.conversationId);
    });
  }

  async pinMessage(messageId: string, userId: string): Promise<MessageRecord | undefined> {
    const message=await this.assertParticipant(messageId, userId);
    const members=await this.conversationRepository.getMembers(message.conversationId);
    return this.messageRepository.updateVisible(messageId, { pinned: true },
      ()=>this.lockConversationContacts(members,'send',message.conversationId));
  }
}
