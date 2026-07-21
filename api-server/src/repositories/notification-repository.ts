import { eq } from "drizzle-orm";
import { notificationsTable } from "@workspace/db/schema";
import { db } from "@workspace/db";
import type { NotificationRecord } from "../types/index.js";

export class NotificationRepository {
  async create(notification: NotificationRecord): Promise<NotificationRecord> {
    const [created] = await db.insert(notificationsTable).values(notification).returning();
    return created as NotificationRecord;
  }

  async listForUser(userId: string): Promise<NotificationRecord[]> {
    return (await db.select().from(notificationsTable).where(eq(notificationsTable.recipientId, userId))) as NotificationRecord[];
  }

  async findById(id: string): Promise<NotificationRecord | undefined> {
    const [notification] = await db.select().from(notificationsTable).where(eq(notificationsTable.id, id));
    return notification as NotificationRecord | undefined;
  }

  async markRead(id: string): Promise<NotificationRecord | undefined> {
    const [updated] = await db.update(notificationsTable)
      .set({ readAt: new Date().toISOString() })
      .where(eq(notificationsTable.id, id))
      .returning();
    return updated as NotificationRecord | undefined;
  }
}
