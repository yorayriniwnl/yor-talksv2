import { randomUUID } from "node:crypto";
export class MessageService {
    conversationRepository;
    messageRepository;
    constructor(conversationRepository, messageRepository) {
        this.conversationRepository = conversationRepository;
        this.messageRepository = messageRepository;
    }
    async createConversation(participantA, participantB) {
        const existing = await this.conversationRepository.findBetween(participantA, participantB);
        if (existing) {
            return existing;
        }
        const conversation = {
            id: randomUUID(),
            participantA,
            participantB,
            updatedAt: new Date().toISOString(),
            participantIds: [participantA, participantB],
            isGroup: false,
            title: null,
            createdAt: new Date().toISOString(),
        };
        return this.conversationRepository.create(conversation);
    }
    async sendMessage(senderId, recipientId, content, options) {
        const conversation = await this.createConversation(senderId, recipientId);
        const message = {
            id: randomUUID(),
            conversationId: conversation.id,
            senderId,
            recipientId,
            content,
            createdAt: new Date().toISOString(),
            seenAt: null,
            replyToId: options?.replyToId ?? null,
            forwardedFromId: options?.forwardedFromId ?? null,
            reactions: options?.reactions ?? {},
            editedAt: null,
            deletedAt: null,
            pinned: false,
            ...options,
        };
        await this.messageRepository.create(message);
        return message;
    }
    async listConversation(conversationId) {
        const messages = await this.messageRepository.listConversation(conversationId);
        return messages.filter((message) => !message.deletedAt);
    }
    async markSeen(messageId) {
        const message = await this.messageRepository.findById(messageId);
        if (!message) {
            return undefined;
        }
        message.seenAt = new Date().toISOString();
        return this.messageRepository.update(messageId, { seenAt: message.seenAt });
    }
    async editMessage(messageId, content) {
        const message = await this.messageRepository.findById(messageId);
        if (!message) {
            return undefined;
        }
        message.content = content;
        message.editedAt = new Date().toISOString();
        return this.messageRepository.update(messageId, { content: message.content, editedAt: message.editedAt });
    }
    async deleteMessage(messageId) {
        const message = await this.messageRepository.findById(messageId);
        if (!message) {
            return undefined;
        }
        message.deletedAt = new Date().toISOString();
        return this.messageRepository.update(messageId, { deletedAt: message.deletedAt });
    }
    async addReaction(messageId, userId, reaction) {
        const message = await this.messageRepository.findById(messageId);
        if (!message) {
            return undefined;
        }
        const reactions = message.reactions ?? {};
        const current = reactions[reaction] ?? [];
        if (!current.includes(userId)) {
            current.push(userId);
            reactions[reaction] = current;
            message.reactions = reactions;
        }
        return this.messageRepository.update(messageId, { reactions: message.reactions });
    }
    async pinMessage(messageId) {
        const message = await this.messageRepository.findById(messageId);
        if (!message) {
            return undefined;
        }
        message.pinned = true;
        return this.messageRepository.update(messageId, { pinned: message.pinned });
    }
}
//# sourceMappingURL=message-service.js.map