import { type Request, type Response } from "express";
import { MessageService } from "../services/message-service.js";
import { createResponse } from "../utils/response.js";

export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  sendMessage = (req: Request, res: Response) => {
    const recipientId = typeof req.body.recipientId === "string" ? req.body.recipientId : "";
    const content = typeof req.body.content === "string" ? req.body.content : "";
    const message = this.messageService.sendMessage(req.user?.id ?? "", recipientId, content, req.body);
    return res.status(201).json(createResponse("Message sent", message));
  };

  listConversation = (req: Request, res: Response) => {
    const conversationId = typeof req.params.conversationId === "string" ? req.params.conversationId : "";
    const messages = this.messageService.listConversation(conversationId);
    return res.status(200).json(createResponse("Conversation loaded", messages));
  };

  markSeen = (req: Request, res: Response) => {
    const messageId = typeof req.params.messageId === "string" ? req.params.messageId : "";
    const message = this.messageService.markSeen(messageId);
    if (!message) {
      return res.status(404).json(createResponse("Message not found", null, {}, ["Message not found"]));
    }
    return res.status(200).json(createResponse("Message marked as seen", message));
  };

  editMessage = (req: Request, res: Response) => {
    const messageId = typeof req.params.messageId === "string" ? req.params.messageId : "";
    const message = this.messageService.editMessage(messageId, req.body.content);
    if (!message) {
      return res.status(404).json(createResponse("Message not found", null, {}, ["Message not found"]));
    }
    return res.status(200).json(createResponse("Message edited", message));
  };

  deleteMessage = (req: Request, res: Response) => {
    const messageId = typeof req.params.messageId === "string" ? req.params.messageId : "";
    const message = this.messageService.deleteMessage(messageId);
    if (!message) {
      return res.status(404).json(createResponse("Message not found", null, {}, ["Message not found"]));
    }
    return res.status(200).json(createResponse("Message deleted", message));
  };

  addReaction = (req: Request, res: Response) => {
    const messageId = typeof req.params.messageId === "string" ? req.params.messageId : "";
    const message = this.messageService.addReaction(messageId, req.user?.id ?? "", req.body.reaction);
    if (!message) {
      return res.status(404).json(createResponse("Message not found", null, {}, ["Message not found"]));
    }
    return res.status(200).json(createResponse("Reaction added", message));
  };

  pinMessage = (req: Request, res: Response) => {
    const messageId = typeof req.params.messageId === "string" ? req.params.messageId : "";
    const message = this.messageService.pinMessage(messageId);
    if (!message) {
      return res.status(404).json(createResponse("Message not found", null, {}, ["Message not found"]));
    }
    return res.status(200).json(createResponse("Message pinned", message));
  };
}
