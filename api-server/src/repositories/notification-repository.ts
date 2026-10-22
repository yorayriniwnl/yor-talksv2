import { and, desc, eq, isNull } from "drizzle-orm";
import { notificationsTable, usersTable } from "@workspace/db/schema";
import { db } from "@workspace/db";
import type { NotificationRecord } from "../types/index.js";

export class NotificationRepository {
  async create(notification: NotificationRecord): Promise<NotificationRecord> {
    return db.transaction(async (tx) => {
      const actorId = notification.metadata?.actorId;
      if (actorId !== undefined) {
        if (typeof actorId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(actorId)) {
          throw new Error('Notification actor is invalid');
        }
        // The metadata actor has no FK. Hold this lock until insertion commits
        // so account deletion either scrubs this row or makes creation fail.
        // An action authorized before deletion cannot recreate the erased name.
        const [actor] = await tx.select({ id: usersTable.id }).from(usersTable)
          .where(eq(usersTable.id, actorId)).for('key share');
        if (!actor) throw new Error('Notification actor is unavailable');
      }
      const [created] = await tx.insert(notificationsTable).values(notification).returning();
      return created as NotificationRecord;
    });
  }

  async listForUser(userId: string): Promise<NotificationRecord[]> {
    return (await db
      .select()
      .from(notificationsTable)
      .where(eq(notificationsTable.recipientId, userId))
      .orderBy(desc(notificationsTable.createdAt))
      .limit(100)) as NotificationRecord[];
  }

  async findById(id: string): Promise<NotificationRecord | undefined> {
    const [notification] = await db.select().from(notificationsTable).where(eq(notificationsTable.id, id));
    return notification as NotificationRecord | undefined;
  }

  async markRead(id: string, recipientId: string): Promise<NotificationRecord | undefined> {
    const [updated] = await db.update(notificationsTable)
      .set({ readAt: new Date().toISOString() })
      .where(and(eq(notificationsTable.id, id), eq(notificationsTable.recipientId, recipientId)))
      .returning();
    return updated as NotificationRecord | undefined;
  }

  async markAllRead(recipientId: string): Promise<void> {
    await db.update(notificationsTable)
      .set({ readAt: new Date().toISOString() })
      .where(and(eq(notificationsTable.recipientId, recipientId), isNull(notificationsTable.readAt)));
  }

  async markPushDelivered(id: string): Promise<void> {
    await db.update(notificationsTable)
      .set({ pushDeliveredAt: new Date().toISOString() })
      .where(and(eq(notificationsTable.id, id), isNull(notificationsTable.pushDeliveredAt)));
  }
}
