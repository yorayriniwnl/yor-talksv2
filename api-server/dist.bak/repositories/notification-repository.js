import { eq } from "drizzle-orm";
import { db, notificationsTable } from "@workspace/db";
export class NotificationRepository {
    async create(notification) {
        const [created] = await db.insert(notificationsTable).values(notification).returning();
        return created;
    }
    async listForUser(userId) {
        return (await db.select().from(notificationsTable).where(eq(notificationsTable.recipientId, userId)));
    }
    async findById(id) {
        const [notification] = await db.select().from(notificationsTable).where(eq(notificationsTable.id, id));
        return notification;
    }
    async markRead(id) {
        const [updated] = await db.update(notificationsTable)
            .set({ readAt: new Date() })
            .where(eq(notificationsTable.id, id))
            .returning();
        return updated;
    }
}
//# sourceMappingURL=notification-repository.js.map