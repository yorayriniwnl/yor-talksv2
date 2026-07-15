import { BaseRepository } from "./base-repository.js";
import type { NotificationRecord } from "../types/index.js";

export class NotificationRepository extends BaseRepository<NotificationRecord> {
  create(notification: NotificationRecord): NotificationRecord {
    return this.set(notification.id, notification);
  }

  listForUser(userId: string): NotificationRecord[] {
    return this.getAll().filter((entry) => entry.recipientId === userId);
  }

  markRead(id: string): NotificationRecord | undefined {
    const existing = this.get(id);
    if (!existing) {
      return undefined;
    }
    const next = { ...existing, readAt: new Date().toISOString() };
    return this.set(id, next);
  }
}
