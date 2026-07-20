import { eq, or, and } from "drizzle-orm";
import { db, messagesTable, conversationsTable } from "@workspace/db";
export class MessageRepository {
    async create(message) {
        const [created] = await db.insert(messagesTable).values(message).returning();
        return created;
    }
    async listConversation(conversationId) {
        return (await db.select().from(messagesTable).where(eq(messagesTable.conversationId, conversationId)));
    }
    async findById(messageId) {
        const [message] = await db.select().from(messagesTable).where(eq(messagesTable.id, messageId));
        return message;
    }
    async update(messageId, updates) {
        const [updated] = await db.update(messagesTable)
            .set({ ...updates })
            .where(eq(messagesTable.id, messageId))
            .returning();
        return updated;
    }
}
export class ConversationRepository {
    async create(conversation) {
        const [created] = await db.insert(conversationsTable).values(conversation).returning();
        return created;
    }
    async findBetween(participantA, participantB) {
        const [conversation] = await db.select().from(conversationsTable).where(or(and(eq(conversationsTable.participantA, participantA), eq(conversationsTable.participantB, participantB)), and(eq(conversationsTable.participantA, participantB), eq(conversationsTable.participantB, participantA))));
        return conversation;
    }
}
//# sourceMappingURL=message-repository.js.map