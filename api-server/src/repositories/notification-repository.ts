import { and, desc, eq, isNull } from "drizzle-orm";
import { notificationsTable } from "@workspace/db/schema";
import { db } from "@workspace/db";
import type { NotificationRecord } from "../types/index.js";

export class NotificationRepository {
  async create(notification: NotificationRecord): Promise<NotificationRecord> {
    const [created] = await db.insert(notificationsTable).values(notification).returning();
    return created as NotificationRecord;
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
}
