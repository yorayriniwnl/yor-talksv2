import { type Request, type Response } from "express";
import { getIo } from "../lib/realtime.js";
import { InvalidReplyTargetError, MessageBlockedError, MessageService, UnauthorizedError } from "../services/message-service.js";
import { createResponse } from "../utils/response.js";

export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  sendMessage = async (req: Request, res: Response) => {
    const recipientId = typeof req.body.recipientId === "string" ? req.body.recipientId : undefined;
    const conversationId = typeof req.body.conversationId === "string" ? req.body.conversationId : undefined;
    const content = typeof req.body.content === "string" ? req.body.content : "";
    const replyToId = typeof req.body.replyToId === "string" ? req.body.replyToId : undefined;
    
    try {
      let message;
      let actualConversationId;
      if (conversationId) {
        message = await this.messageService.sendMessageToConversation(req.user?.id ?? "", conversationId, content, replyToId ? { replyToId } : undefined);
        actualConversationId = conversationId;
      } else if (recipientId) {
        message = await this.messageService.sendMessage(req.user?.id ?? "", recipientId, content, replyToId ? { replyToId } : undefined);
        actualConversationId = message.conversationId;
      } else {
        return res.status(400).json(createResponse("Missing recipientId or conversationId", null, {}, ["Bad request"]));
      }

      // Multicast to group room via Socket.io
      const io = getIo();
      if (io) {
        const room = `conversation:${actualConversationId}`;
        const memberIds = await this.messageService.getConversationMemberIds(actualConversationId, message.senderId);
        for (const memberId of memberIds) io.in(memberId).socketsJoin(room);
        io.to(room).emit("message:receive", message);
      }
      
      return res.status(201).json(createResponse("Message sent", message));
    } catch (error) {
      if (error instanceof MessageBlockedError || error instanceof UnauthorizedError) {
        return res.status(403).json(createResponse("Action forbidden", null, {}, [error.message]));
      }
      if (error instanceof InvalidReplyTargetError) {
        return res.status(400).json(createResponse("Invalid reply target", null, {}, [error.message]));
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
      const group = await this.messageService.createGroupChat(req.user?.id ?? "", memberIds, title);
      
      const io = getIo();
      if (io) {
        // Invite members to room
        for (const id of [req.user?.id, ...memberIds]) {
          io.in(id!).socketsJoin(`conversation:${group.id}`);
          io.to(id!).emit("conversation:created", group);
        }
      }
      
      return res.status(201).json(createResponse("Group chat created", group));
    } catch (error) {
      if (error instanceof MessageBlockedError || error instanceof UnauthorizedError) {
        return res.status(403).json(createResponse("Cannot create group", null, {}, [error.message]));
      }
      return res.status(500).json(createResponse("Failed to create group", null, {}, ["Internal server error"]));
    }
  };

  listConversation = async (req: Request, res: Response) => {
    const conversationId = typeof req.params.conversationId === "string" ? req.params.conversationId : "";
    const messages = await this.messageService.listConversation(conversationId, req.user?.id ?? "");
    return res.status(200).json(createResponse("Conversation loaded", messages));
  };

  listConversations = async (req: Request, res: Response) => {
    const conversations = await this.messageService.getConversationsForUser(req.user?.id ?? "");
    return res.status(200).json(createResponse("Conversations loaded", conversations));
  };

  markSeen = async (req: Request, res: Response) => {
    const messageId = typeof req.params.messageId === "string" ? req.params.messageId : "";
    const message = await this.messageService.markSeen(messageId, req.user?.id ?? "");
    if (!message) {
      return res.status(404).json(createResponse("Message not found", null, {}, ["Message not found"]));
    }
    
    const io = getIo();
    if (io) {
      io.to(`conversation:${message.conversationId}`).emit("message:seen:update", { 
        messageId, 
        userId: req.user?.id, 
        seenAt: message.seenAt 
      });
    }

    return res.status(200).json(createResponse("Message marked as seen", message));
  };

  editMessage = async (req: Request, res: Response) => {
    const messageId = typeof req.params.messageId === "string" ? req.params.messageId : "";
    const message = await this.messageService.editMessage(messageId, req.user?.id ?? "", req.body.content);
    if (!message) {
      return res.status(404).json(createResponse("Message not found", null, {}, ["Message not found"]));
    }
    getIo()?.to(`conversation:${message.conversationId}`).emit("message:update", message);
    return res.status(200).json(createResponse("Message edited", message));
  };

  deleteMessage = async (req: Request, res: Response) => {
    const messageId = typeof req.params.messageId === "string" ? req.params.messageId : "";
    const message = await this.messageService.deleteMessage(messageId, req.user?.id ?? "");
    if (!message) {
      return res.status(404).json(createResponse("Message not found", null, {}, ["Message not found"]));
    }
    getIo()?.to(`conversation:${message.conversationId}`).emit("message:update", message);
    return res.status(200).json(createResponse("Message deleted", message));
  };

  addReaction = async (req: Request, res: Response) => {
    const messageId = typeof req.params.messageId === "string" ? req.params.messageId : "";
    try {
      const message = await this.messageService.addReaction(messageId, req.user?.id ?? "", req.body.reaction);
      if (message) getIo()?.to(`conversation:${message.conversationId}`).emit("message:update", message);
      return res.status(200).json(createResponse("Reaction added", message));
    } catch (error) {
      return res.status(403).json(createResponse("Cannot react to this message", null, {}, [error instanceof Error ? error.message : "Forbidden"]));
    }
  };

  pinMessage = async (req: Request, res: Response) => {
    const messageId = typeof req.params.messageId === "string" ? req.params.messageId : "";
    try {
      const message = await this.messageService.pinMessage(messageId, req.user?.id ?? "");
      if (message) getIo()?.to(`conversation:${message.conversationId}`).emit("message:update", message);
      return res.status(200).json(createResponse("Message pinned", message));
    } catch (error) {
      return res.status(403).json(createResponse("Cannot pin this message", null, {}, [error instanceof Error ? error.message : "Forbidden"]));
    }
  };
}
