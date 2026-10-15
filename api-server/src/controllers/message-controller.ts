import { type Request, type Response } from "express";
import { getIo } from "../lib/realtime.js";
import { InvalidMessageContentError, InvalidMessageStyleError, InvalidReplyTargetError, MessageBlockedError, MessageService, PremiumFeatureUnavailableError, UnauthorizedError } from "../services/message-service.js";
import { conversationMessagesQuerySchema } from "../validators/message.js";
import { createResponse } from "../utils/response.js";

function isMessageVisibleAtResponse(message: { deletedAt?: string | null; expiresAt?: string | null }): boolean {
  if (message.deletedAt) return false;
  if (message.expiresAt == null) return true;
  const expiresAt = Date.parse(message.expiresAt);
  return Number.isFinite(expiresAt) && expiresAt > Date.now();
}

function isMessageExpiredAtResponse(message: { expiresAt?: string | null }): boolean {
  if (message.expiresAt == null) return false;
  const expiresAt = Date.parse(message.expiresAt);
  return !Number.isFinite(expiresAt) || expiresAt <= Date.now();
}

function redactDeletedMessage<T extends { deletedAt?: string | null; content: string; reactions?: Record<string, string[]> }>(message: T): T {
  return message.deletedAt ? { ...message, content: "", reactions: {} } : message;
}

export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  sendMessage = async (req: Request, res: Response) => {
    const recipientId = typeof req.body.recipientId === "string" ? req.body.recipientId : undefined;
    const conversationId = typeof req.body.conversationId === "string" ? req.body.conversationId : undefined;
    const content = typeof req.body.content === "string" ? req.body.content : "";
    const replyToId = typeof req.body.replyToId === "string" ? req.body.replyToId : undefined;
    const textStyleId = typeof req.body.textStyleId === "string" ? req.body.textStyleId : undefined;
    const idempotencyKey = typeof req.body.idempotencyKey === "string" ? req.body.idempotencyKey : undefined;
    const sendOptions = { ...(replyToId ? { replyToId } : {}), ...(textStyleId ? { textStyleId } : {}), ...(idempotencyKey ? { idempotencyKey } : {}) };
    
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
    const query = conversationMessagesQuerySchema.parse(req.query);
    const messages = await this.messageService.listConversationPage(conversationId, req.user?.id ?? "", {
      direction: query.direction ?? "latest",
      cursorAt: query.cursorAt,
      cursorId: query.cursorId,
      limit: query.limit ?? 200,
    });
    return res.status(200).json(createResponse("Conversation loaded", messages.filter(isMessageVisibleAtResponse)));
  };

  listConversations = async (req: Request, res: Response) => {
    const conversations = await this.messageService.getConversationsForUser(req.user?.id ?? "");
    return res.status(200).json(createResponse("Conversations loaded", conversations.map((item) => ({
      ...item,
      lastMessage: item.lastMessage && isMessageVisibleAtResponse(item.lastMessage) ? item.lastMessage : undefined,
    }))));
  };

  preview = async (req: Request, res: Response) => {
    const messageId = typeof req.params.messageId === "string" ? req.params.messageId : "";
    try {
      const message = await this.messageService.previewMessage(messageId, req.user?.id ?? "");
      if (!message || !isMessageVisibleAtResponse(message)) {
        return res.status(404).json(createResponse("Message not found", null, {}, ["Message not found"]));
      }
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
      getIo()?.to(`conversation:${conversationId}`).emit("conversation:vanish:update", conversation);
      return res.status(200).json(createResponse("Vanish mode updated", conversation));
    } catch (error) {
      if (error instanceof UnauthorizedError) return res.status(403).json(createResponse("Cannot update vanish mode", null, {}, [error.message]));
      throw error;
    }
  };

  markSeen = async (req: Request, res: Response) => {
    const messageId = typeof req.params.messageId === "string" ? req.params.messageId : "";
    const message = await this.messageService.markSeen(messageId, req.user?.id ?? "");
    if (!message || isMessageExpiredAtResponse(message)) {
      return res.status(404).json(createResponse("Message not found", null, {}, ["Message not found"]));
    }
    const responseMessage = redactDeletedMessage(message);
    
    const io = getIo();
    if (io) {
      if (responseMessage.deletedAt) {
        io.to(`conversation:${responseMessage.conversationId}`).emit("message:update", responseMessage);
      } else {
        io.to(`conversation:${message.conversationId}`).emit("message:seen:update", {
          messageId,
          userId: req.user?.id,
          seenAt: message.seenAt,
        });
      }
    }

    return res.status(200).json(createResponse("Message marked as seen", responseMessage));
  };

  editMessage = async (req: Request, res: Response) => {
    const messageId = typeof req.params.messageId === "string" ? req.params.messageId : "";
    const message = await this.messageService.editMessage(messageId, req.user?.id ?? "", req.body.content);
    if (!message || !isMessageVisibleAtResponse(message)) {
      return res.status(404).json(createResponse("Message not found", null, {}, ["Message not found"]));
    }
    getIo()?.to(`conversation:${message.conversationId}`).emit("message:update", message);
    return res.status(200).json(createResponse("Message edited", message));
  };

  deleteMessage = async (req: Request, res: Response) => {
    const messageId = typeof req.params.messageId === "string" ? req.params.messageId : "";
    const message = await this.messageService.deleteMessage(messageId, req.user?.id ?? "");
    if (!message || isMessageExpiredAtResponse(message)) {
      return res.status(404).json(createResponse("Message not found", null, {}, ["Message not found"]));
    }
    const responseMessage = redactDeletedMessage(message);
    getIo()?.to(`conversation:${message.conversationId}`).emit("message:update", responseMessage);
    return res.status(200).json(createResponse("Message deleted", responseMessage));
  };

  addReaction = async (req: Request, res: Response) => {
    const messageId = typeof req.params.messageId === "string" ? req.params.messageId : "";
    try {
      const message = await this.messageService.addReaction(messageId, req.user?.id ?? "", req.body.reaction);
      const visible = message && isMessageVisibleAtResponse(message) ? message : undefined;
      if (visible) getIo()?.to(`conversation:${visible.conversationId}`).emit("message:update", visible);
      return res.status(200).json(createResponse("Reaction added", visible));
    } catch (error) {
      return res.status(403).json(createResponse("Cannot react to this message", null, {}, [error instanceof Error ? error.message : "Forbidden"]));
    }
  };

  pinMessage = async (req: Request, res: Response) => {
    const messageId = typeof req.params.messageId === "string" ? req.params.messageId : "";
    try {
      const message = await this.messageService.pinMessage(messageId, req.user?.id ?? "");
      const visible = message && isMessageVisibleAtResponse(message) ? message : undefined;
      if (visible) getIo()?.to(`conversation:${visible.conversationId}`).emit("message:update", visible);
      return res.status(200).json(createResponse("Message pinned", visible));
    } catch (error) {
      return res.status(403).json(createResponse("Cannot pin this message", null, {}, [error instanceof Error ? error.message : "Forbidden"]));
    }
  };
}
