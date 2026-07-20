import { createResponse } from "../utils/response.js";
export class MessageController {
    messageService;
    constructor(messageService) {
        this.messageService = messageService;
    }
    sendMessage = async (req, res) => {
        const recipientId = typeof req.body.recipientId === "string" ? req.body.recipientId : "";
        const content = typeof req.body.content === "string" ? req.body.content : "";
        const message = await this.messageService.sendMessage(req.user?.id ?? "", recipientId, content, req.body);
        return res.status(201).json(createResponse("Message sent", message));
    };
    listConversation = async (req, res) => {
        const conversationId = typeof req.params.conversationId === "string" ? req.params.conversationId : "";
        const messages = await this.messageService.listConversation(conversationId);
        return res.status(200).json(createResponse("Conversation loaded", messages));
    };
    markSeen = async (req, res) => {
        const messageId = typeof req.params.messageId === "string" ? req.params.messageId : "";
        const message = await this.messageService.markSeen(messageId);
        if (!message) {
            return res.status(404).json(createResponse("Message not found", null, {}, ["Message not found"]));
        }
        return res.status(200).json(createResponse("Message marked as seen", message));
    };
    editMessage = async (req, res) => {
        const messageId = typeof req.params.messageId === "string" ? req.params.messageId : "";
        const message = await this.messageService.editMessage(messageId, req.body.content);
        if (!message) {
            return res.status(404).json(createResponse("Message not found", null, {}, ["Message not found"]));
        }
        return res.status(200).json(createResponse("Message edited", message));
    };
    deleteMessage = async (req, res) => {
        const messageId = typeof req.params.messageId === "string" ? req.params.messageId : "";
        const message = await this.messageService.deleteMessage(messageId);
        if (!message) {
            return res.status(404).json(createResponse("Message not found", null, {}, ["Message not found"]));
        }
        return res.status(200).json(createResponse("Message deleted", message));
    };
    addReaction = async (req, res) => {
        const messageId = typeof req.params.messageId === "string" ? req.params.messageId : "";
        const message = await this.messageService.addReaction(messageId, req.user?.id ?? "", req.body.reaction);
        if (!message) {
            return res.status(404).json(createResponse("Message not found", null, {}, ["Message not found"]));
        }
        return res.status(200).json(createResponse("Reaction added", message));
    };
    pinMessage = async (req, res) => {
        const messageId = typeof req.params.messageId === "string" ? req.params.messageId : "";
        const message = await this.messageService.pinMessage(messageId);
        if (!message) {
            return res.status(404).json(createResponse("Message not found", null, {}, ["Message not found"]));
        }
        return res.status(200).json(createResponse("Message pinned", message));
    };
}
//# sourceMappingURL=message-controller.js.map