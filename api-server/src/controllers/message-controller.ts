import { MediaLifecycleError } from "../services/media-service.js";
import { hydrateMediaValue } from "../services/media-response.js";
import { type Request, type Response } from "express";
import { getIo } from "../lib/realtime.js";
import { dispatchSocketToUsers, type SocketRequester } from "../socket/policy.js";
import { InvalidMessageContentError, InvalidMessageStyleError, InvalidReplyTargetError, MessageBlockedError, MessageService, PremiumFeatureUnavailableError, UnauthorizedError } from "../services/message-service.js";
import { conversationMessagesQuerySchema } from "../validators/message.js";
import { createResponse } from "../utils/response.js";
import { toMessageTombstone } from "../utils/message-visibility.js";

export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  private async emitMessage(io:NonNullable<ReturnType<typeof getIo>>,message:Awaited<ReturnType<MessageService['sendMessage']>>,actorId:string,event:string) {
    const members=await this.messageService.getConversationMemberIds(message.conversationId,actorId);
    await dispatchSocketToUsers(io,members,event,async(requester:SocketRequester)=>{
      await this.messageService.authorizeConversationDelivery(message.conversationId,requester.userId);
      return hydrateMediaValue(message,undefined,requester);
    },'message:deliver',undefined,requester=>this.messageService.authorizeConversationDelivery(message.conversationId,requester.userId));
  }

  sendMessage = async (req: Request, res: Response) => {
    const recipientId = typeof req.body.recipientId === "string" ? req.body.recipientId : undefined;
    const conversationId = typeof req.body.conversationId === "string" ? req.body.conversationId : undefined;
    const content = typeof req.body.content === "string" ? req.body.content : "";
    const replyToId = typeof req.body.replyToId === "string" ? req.body.replyToId : undefined;
    const textStyleId = typeof req.body.textStyleId === "string" ? req.body.textStyleId : undefined;
    const idempotencyKey = typeof req.body.idempotencyKey === "string" ? req.body.idempotencyKey : undefined;
    const mediaId = typeof req.body.mediaId === "string" ? req.body.mediaId : undefined;
    const sendOptions = { ...(mediaId ? { mediaId } : {}), ...(replyToId ? { replyToId } : {}), ...(textStyleId ? { textStyleId } : {}), ...(idempotencyKey ? { idempotencyKey } : {}) };
    
    try {
      let message;
      let actualConversationId;
      if (conversationId) {
        message = await this.messageService.sendMessageToConversation(req.user?.id ?? "", conversationId, content, sendOptions);
        actualConversationId = conversationId;
      } else if (recipientId) {
        message = await this.messageService.sendMessage(req.user?.id ?? "", recipientId, content, sendOptions);
        actualConversationId = message.conversationId;
      } else {
        return res.status(400).json(createResponse("Missing recipientId or conversationId", null, {}, ["Bad request"]));
      }

      // Multicast to group room via Socket.io
      const io = getIo();
      if (io) {
        const memberIds = await this.messageService.getConversationMemberIds(actualConversationId, message.senderId);
        await dispatchSocketToUsers(io,memberIds,"message:receive",async(requester:SocketRequester)=>{
          await this.messageService.authorizeConversationDelivery(message.conversationId,requester.userId,message.id);
          return hydrateMediaValue(message,undefined,requester);
        },'message:deliver',undefined,requester=>this.messageService.authorizeConversationDelivery(message.conversationId,requester.userId,message.id));
      }
      
      if (message.content || message.mediaId) await this.messageService.authorizeConversationDelivery(message.conversationId,req.user!.id,message.id);
      return res.status(201).json(createResponse("Message sent", message));
    } catch (error) {
      if (error instanceof MediaLifecycleError) return res.status(error.status).json(createResponse(error.message, null, {}, [error.code]));
      if (error instanceof MessageBlockedError || error instanceof UnauthorizedError) {
        return res.status(403).json(createResponse("Action forbidden", null, {}, [error.message]));
      }
      if (error instanceof InvalidReplyTargetError) {
        return res.status(400).json(createResponse("Invalid reply target", null, {}, [error.message]));
      }
      if (error instanceof InvalidMessageContentError) {
        return res.status(400).json(createResponse("Invalid message", null, {}, [error.message]));
      }
      if (error instanceof InvalidMessageStyleError) {
        return res.status(400).json(createResponse("Invalid message style", null, {}, [error.message]));
      }
      if (error instanceof PremiumFeatureUnavailableError) {
        return res.status(403).json(createResponse(error.message, null, {}, ["premium_feature_unavailable"]));
      }
      return res.status(500).json(createResponse("Failed to send message", null, {}, ["Internal server error"]));
    }
  };

  createGroupChat = async (req: Request, res: Response) => {
    try {
      const title = typeof req.body.title === "string" ? req.body.title : "Group Chat";
      const memberIds = req.body.memberIds || [];
      if (!Array.isArray(memberIds) || memberIds.length === 0) {
        return res.status(400).json(createResponse("Missing memberIds", null, {}, ["Bad Request"]));
      }
      const created = await this.messageService.createGroupChat(req.user?.id ?? "", memberIds, title);
      
      const io = getIo();
      if (io) {
        const creatorId=req.user?.id??"";
        await this.messageService.authorizeConversationDelivery(created.id,creatorId);
        io.in(creatorId).socketsJoin(`conversation:${created.id}`);
        await dispatchSocketToUsers(io,[creatorId],"conversation:created",async(requester:SocketRequester)=>{
          await this.messageService.authorizeConversationDelivery(created.id,requester.userId);
          return created;
        },'message:deliver',undefined,requester=>this.messageService.authorizeConversationDelivery(created.id,requester.userId));
        for(const invitation of created.invitations)await dispatchSocketToUsers(io,[invitation.recipientId],"group:invitation",invitation,'message:deliver');
      }
      
      return res.status(201).json(createResponse("Group created; invitations are pending", created));
    } catch (error) {
      if (error instanceof MessageBlockedError || error instanceof UnauthorizedError) {
        return res.status(403).json(createResponse("Cannot create group", null, {}, [error.message]));
      }
      return res.status(500).json(createResponse("Failed to create group", null, {}, ["Internal server error"]));
    }
  };

  listGroupInvitations = async (req:Request,res:Response)=>{
    const invitations=await this.messageService.listGroupInvitations(req.user?.id??"");
    return res.status(200).json(createResponse("Group invitations loaded",invitations));
  };

  inviteToGroup = async (req:Request,res:Response)=>{
    try{
      const conversationId=typeof req.params.conversationId==='string'?req.params.conversationId:"";
      const invitations=await this.messageService.inviteToGroup(conversationId,req.user?.id??"",req.body.inviteeIds);
      const io=getIo();if(io)for(const invitation of invitations)
        await dispatchSocketToUsers(io,[invitation.recipientId],"group:invitation",invitation,'message:deliver');
      return res.status(201).json(createResponse("Group invitations created",invitations));
    }catch(error){
      if(error instanceof MessageBlockedError||error instanceof UnauthorizedError)return res.status(403).json(createResponse("Cannot invite to group",null,{},[error.message]));
      return res.status(400).json(createResponse("Cannot invite to group",null,{},[error instanceof Error?error.message:"Invalid invitation"]));
    }
  };

  private async notifyGroupMemberAdded(invitation:Awaited<ReturnType<MessageService['acceptGroupInvitation']>>['invitation']){
    const io=getIo();if(!io)return;
    const memberIds=await this.messageService.getConversationMemberIds(invitation.conversationId,invitation.recipientId);
    io.in(invitation.recipientId).socketsJoin(`conversation:${invitation.conversationId}`);
    await dispatchSocketToUsers(io,memberIds,"conversation:member-added",async(requester:SocketRequester)=>{
      await this.messageService.authorizeConversationDelivery(invitation.conversationId,requester.userId);
      return {conversationId:invitation.conversationId,userId:invitation.recipientId};
    },'message:deliver',undefined,requester=>this.messageService.authorizeConversationDelivery(invitation.conversationId,requester.userId));
  }

  private async notifyRefreshedGroupInvitations(invitations:Awaited<ReturnType<MessageService['acceptGroupInvitation']>>['refreshedInvitations']){
    const io=getIo();if(io)for(const invitation of invitations)
      await dispatchSocketToUsers(io,[invitation.recipientId],"group:invitation:updated",invitation,'message:deliver');
  }

  acceptGroupInvitation = async (req:Request,res:Response)=>{
    try{
      const invitationId=typeof req.params.invitationId==='string'?req.params.invitationId:"";
      const result=await this.messageService.acceptGroupInvitation(invitationId,req.user?.id??"",req.body.updatedAt);
      if(result.invitation.status==='accepted')await this.notifyGroupMemberAdded(result.invitation);
      await this.notifyRefreshedGroupInvitations(result.refreshedInvitations);
      return res.status(200).json(createResponse(result.invitation.status==='accepted'?"Group invitation accepted":"Guardian approval is still required",result));
    }catch(error){
      if(error instanceof UnauthorizedError)return res.status(403).json(createResponse("Cannot accept invitation",null,{},[error.message]));
      return res.status(400).json(createResponse("Cannot accept invitation",null,{},[error instanceof Error?error.message:"Invalid invitation"]));
    }
  };

  approveGroupInvitation = async (req:Request,res:Response)=>{
    try{
      const invitationId=typeof req.params.invitationId==='string'?req.params.invitationId:"";
      const result=await this.messageService.approveGroupInvitation(invitationId,req.user?.id??"",req.body.updatedAt);
      if(result.invitation.status==='accepted')await this.notifyGroupMemberAdded(result.invitation);
      await this.notifyRefreshedGroupInvitations(result.refreshedInvitations);
      return res.status(200).json(createResponse("Guardian approval recorded",result));
    }catch(error){
      if(error instanceof UnauthorizedError)return res.status(403).json(createResponse("Cannot approve invitation",null,{},[error.message]));
      return res.status(400).json(createResponse("Cannot approve invitation",null,{},[error instanceof Error?error.message:"Invalid approval"]));
    }
  };

  rejectGroupInvitation = async (req:Request,res:Response)=>{
    try{
      await this.messageService.rejectGroupInvitation(typeof req.params.invitationId==='string'?req.params.invitationId:"",req.user?.id??"");
      return res.status(200).json(createResponse("Group invitation declined",null));
    }catch(error){
      if(error instanceof UnauthorizedError)return res.status(403).json(createResponse("Cannot decline invitation",null,{},[error.message]));
      throw error;
    }
  };

  revokeGroupInvitation = async (req:Request,res:Response)=>{
    try{
      await this.messageService.revokeGroupInvitation(typeof req.params.invitationId==='string'?req.params.invitationId:"",req.user?.id??"");
      return res.status(200).json(createResponse("Group invitation revoked",null));
    }catch(error){
      if(error instanceof UnauthorizedError)return res.status(403).json(createResponse("Cannot revoke invitation",null,{},[error.message]));
      throw error;
    }
  };

  listConversation = async (req: Request, res: Response) => {
    const conversationId = typeof req.params.conversationId === "string" ? req.params.conversationId : "";
    const query = conversationMessagesQuerySchema.parse(req.query);
    const messages = await this.messageService.listConversationPage(conversationId, req.user?.id ?? "", {
      direction: query.direction ?? "latest",
      cursorAt: query.cursorAt,
      cursorId: query.cursorId,
      limit: query.limit ?? 200,
    });
    return res.status(200).json(createResponse("Conversation loaded", messages));
  };

  listConversations = async (req: Request, res: Response) => {
    const conversations = await this.messageService.getConversationsForUser(req.user?.id ?? "");
    return res.status(200).json(createResponse("Conversations loaded", conversations));
  };

  preview = async (req: Request, res: Response) => {
    const messageId = typeof req.params.messageId === "string" ? req.params.messageId : "";
    try {
      const message = await this.messageService.previewMessage(messageId, req.user?.id ?? "");
      if (!message) return res.status(404).json(createResponse("Message not found", null, {}, ["Message not found"]));
      return res.status(200).json(createResponse("Message preview loaded", message));
    } catch (error) {
      if (error instanceof PremiumFeatureUnavailableError) {
        return res.status(403).json(createResponse(error.message, null, {}, ["premium_feature_unavailable"]));
      }
      throw error;
    }
  };

  setVanishMode = async (req: Request, res: Response) => {
    const conversationId = typeof req.params.conversationId === "string" ? req.params.conversationId : "";
    try {
      const conversation = await this.messageService.setVanishMode(conversationId, req.user?.id ?? "", req.body.enabled);
      if (!conversation) return res.status(404).json(createResponse("Conversation not found", null, {}, ["Conversation not found"]));
      const io=getIo();
      if(io){
        const memberIds=await this.messageService.getConversationMemberIds(conversationId,req.user?.id??"");
        await dispatchSocketToUsers(io,memberIds,"conversation:vanish:update",async(requester:SocketRequester)=>{
          await this.messageService.authorizeConversationDelivery(conversationId,requester.userId);
          return conversation;
        },'message:deliver',undefined,requester=>this.messageService.authorizeConversationDelivery(conversationId,requester.userId));
      }
      return res.status(200).json(createResponse("Vanish mode updated", conversation));
    } catch (error) {
      if (error instanceof UnauthorizedError) return res.status(403).json(createResponse("Cannot update vanish mode", null, {}, [error.message]));
      throw error;
    }
  };

  markSeen = async (req: Request, res: Response) => {
    const messageId = typeof req.params.messageId === "string" ? req.params.messageId : "";
    const message = await this.messageService.markSeen(messageId, req.user?.id ?? "");
    if (!message) {
      return res.status(404).json(createResponse("Message not found", null, {}, ["Message not found"]));
    }
    
    const io = getIo();
    if (io) {
      if (message.deletedAt) {
        await this.emitMessage(io,message,req.user?.id??"","message:update");
      } else if (await this.messageService.canPublishReadReceipt(message, req.user?.id ?? "")) {
        const members=await this.messageService.getConversationMemberIds(message.conversationId,req.user?.id??"");
        await dispatchSocketToUsers(io,members, "message:seen:update", async(requester:SocketRequester)=>{
          await this.messageService.authorizeConversationDelivery(message.conversationId,requester.userId);
          return {
          messageId,
          userId: req.user?.id,
          seenAt: message.seenAt,
          };
        },'message:deliver',undefined,async requester=>{
          await this.messageService.authorizeConversationDelivery(message.conversationId,requester.userId);
          return this.messageService.canPublishReadReceipt(message,req.user?.id??"");
        });
      }
    }

    return res.status(200).json(createResponse("Message marked as seen", message));
  };

  editMessage = async (req: Request, res: Response) => {
    const messageId = typeof req.params.messageId === "string" ? req.params.messageId : "";
    const message = await this.messageService.editMessage(messageId, req.user?.id ?? "", req.body.content);
    if (!message) {
      return res.status(404).json(createResponse("Message not found", null, {}, ["Message not found"]));
    }
    const io=getIo();if(io)await this.emitMessage(io,message,req.user?.id??"","message:update");
    return res.status(200).json(createResponse("Message edited", message));
  };

  deleteMessage = async (req: Request, res: Response) => {
    const messageId = typeof req.params.messageId === "string" ? req.params.messageId : "";
    const message = await this.messageService.deleteMessage(messageId, req.user?.id ?? "");
    if (!message) {
      return res.status(404).json(createResponse("Message not found", null, {}, ["Message not found"]));
    }
    const responseMessage = toMessageTombstone(message);
    getIo()?.to(`conversation:${message.conversationId}`).emit("message:update", responseMessage);
    return res.status(200).json(createResponse("Message deleted", responseMessage));
  };

  addReaction = async (req: Request, res: Response) => {
    const messageId = typeof req.params.messageId === "string" ? req.params.messageId : "";
    try {
      const message = await this.messageService.addReaction(messageId, req.user?.id ?? "", req.body.reaction);
      const io=getIo();if(message&&io)await this.emitMessage(io,message,req.user?.id??"","message:update");
      return res.status(200).json(createResponse("Reaction added", message));
    } catch (error) {
      return res.status(403).json(createResponse("Cannot react to this message", null, {}, [error instanceof Error ? error.message : "Forbidden"]));
    }
  };

  pinMessage = async (req: Request, res: Response) => {
    const messageId = typeof req.params.messageId === "string" ? req.params.messageId : "";
    try {
      const message = await this.messageService.pinMessage(messageId, req.user?.id ?? "");
      const io=getIo();if(message&&io)await this.emitMessage(io,message,req.user?.id??"","message:update");
      return res.status(200).json(createResponse("Message pinned", message));
    } catch (error) {
      return res.status(403).json(createResponse("Cannot pin this message", null, {}, [error instanceof Error ? error.message : "Forbidden"]));
    }
  };
}
