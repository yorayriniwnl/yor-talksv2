import { type Request, type Response } from "express";
import { emitToUser } from "../lib/realtime.js";
import { InvalidReplyTargetError, MessageBlockedError, MessageService } from "../services/message-service.js";
import { createResponse } from "../utils/response.js";

export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  sendMessage = async (req: Request, res: Response) => {
    const recipientId = typeof req.body.recipientId === "string" ? req.body.recipientId : "";
    const content = typeof req.body.content === "string" ? req.body.content : "";
    const replyToId = typeof req.body.replyToId === "string" ? req.body.replyToId : undefined;
    try {
      const message = await this.messageService.sendMessage(req.user?.id ?? "", recipientId, content, replyToId ? { replyToId } : undefined);
      emitToUser(recipientId, "message:receive", message);
      return res.status(201).json(createResponse("Message sent", message));
    } catch (error) {
      if (error instanceof MessageBlockedError) {
        return res.status(403).json(createResponse("Message blocked", null, {}, [error.message]));
      }
      if (error instanceof InvalidReplyTargetError) {
        return res.status(400).json(createResponse("Invalid reply target", null, {}, [error.message]));
      }
      return res.status(500).json(createResponse("Failed to send message", null, {}, [error instanceof Error ? error.message : "Unknown error"]));
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
    return res.status(200).json(createResponse("Message marked as seen", message));
  };

  editMessage = async (req: Request, res: Response) => {
    const messageId = typeof req.params.messageId === "string" ? req.params.messageId : "";
    const message = await this.messageService.editMessage(messageId, req.user?.id ?? "", req.body.content);
    if (!message) {
      return res.status(404).json(createResponse("Message not found", null, {}, ["Message not found"]));
    }
    return res.status(200).json(createResponse("Message edited", message));
  };

  deleteMessage = async (req: Request, res: Response) => {
    const messageId = typeof req.params.messageId === "string" ? req.params.messageId : "";
    const message = await this.messageService.deleteMessage(messageId, req.user?.id ?? "");
    if (!message) {
      return res.status(404).json(createResponse("Message not found", null, {}, ["Message not found"]));
    }
    return res.status(200).json(createResponse("Message deleted", message));
  };

  addReaction = async (req: Request, res: Response) => {
    const messageId = typeof req.params.messageId === "string" ? req.params.messageId : "";
    try {
      const message = await this.messageService.addReaction(messageId, req.user?.id ?? "", req.body.reaction);
      return res.status(200).json(createResponse("Reaction added", message));
    } catch (error) {
      return res.status(403).json(createResponse("Cannot react to this message", null, {}, [error instanceof Error ? error.message : "Forbidden"]));
    }
  };

  pinMessage = async (req: Request, res: Response) => {
    const messageId = typeof req.params.messageId === "string" ? req.params.messageId : "";
    try {
      const message = await this.messageService.pinMessage(messageId, req.user?.id ?? "");
      return res.status(200).json(createResponse("Message pinned", message));
    } catch (error) {
      return res.status(403).json(createResponse("Cannot pin this message", null, {}, [error instanceof Error ? error.message : "Forbidden"]));
    }
  };
}
