import { type Request, type Response } from "express";
import { MessageService } from "../services/message-service.js";
import { createResponse } from "../utils/response.js";

export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  sendMessage = (req: Request, res: Response) => {
    const message = this.messageService.sendMessage(req.user?.id ?? "", req.body.recipientId, req.body.content);
    return res.status(201).json(createResponse("Message sent", message));
  };

  listConversation = (req: Request, res: Response) => {
    const messages = this.messageService.listConversation(req.params.conversationId);
    return res.status(200).json(createResponse("Conversation loaded", messages));
  };

  markSeen = (req: Request, res: Response) => {
    const message = this.messageService.markSeen(req.params.messageId);
    if (!message) {
      return res.status(404).json(createResponse("Message not found", null, {}, ["Message not found"]));
    }
    return res.status(200).json(createResponse("Message marked as seen", message));
  };
}
