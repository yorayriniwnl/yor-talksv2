import { and, desc, eq, isNull } from "drizzle-orm";
import { notificationsTable } from "@workspace/db/schema";
import { db, pool } from "@workspace/db";
import type { NotificationRecord } from "../types/index.js";

export class NotificationRepository {
  async inspectFailedDelivery(limit = 100) {
    return (await pool.query(`SELECT notification_id,attempts,status,last_error,last_attempt_at,next_retry_at
      FROM notification_delivery_state WHERE status='dead' ORDER BY last_attempt_at,notification_id LIMIT $1`,
    [Math.max(1, Math.min(100, limit))])).rows;
  }

  async replayFailedDelivery(id: string, reason: string): Promise<void> {
    if (!/^[a-z0-9_]{3,80}$/i.test(reason)) throw new Error('machine_reason_required');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const notification = (await client.query('SELECT id,push_delivered_at FROM notifications WHERE id=$1 FOR UPDATE', [id])).rows[0];
      const state = (await client.query('SELECT * FROM notification_delivery_state WHERE notification_id=$1 FOR UPDATE', [id])).rows[0];
      if (!notification || notification.push_delivered_at || state?.status !== 'dead') throw new Error('only_undelivered_dead_notifications_can_replay');
      await client.query(`INSERT INTO notification_delivery_replays(notification_id,previous_attempts,previous_error,operator_reason)
        VALUES($1,$2,$3,$4)`, [id, state.attempts, state.last_error, reason]);
      await client.query(`UPDATE notification_delivery_state SET status='pending',attempts=0,last_error=NULL,next_retry_at=clock_timestamp()
        WHERE notification_id=$1`, [id]);
      await client.query('COMMIT');
    } catch (error) { await client.query('ROLLBACK'); throw error; }
    finally { client.release(); }
  }

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

  async markPushDelivered(id: string): Promise<void> {
    await db.update(notificationsTable)
      .set({ pushDeliveredAt: new Date().toISOString() })
      .where(and(eq(notificationsTable.id, id), isNull(notificationsTable.pushDeliveredAt)));
  }
}
