import { randomUUID } from "node:crypto";
import { NotificationRepository } from "../repositories/notification-repository.js";
import type { NotificationRecord } from "../types/index.js";

export class NotificationService {
  constructor(private readonly notificationRepository: NotificationRepository) {}

  createNotification(input: Omit<NotificationRecord, "id" | "createdAt" | "readAt">): NotificationRecord {
    const notification: NotificationRecord = {
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      readAt: null,
      ...input,
    };
    return this.notificationRepository.create(notification);
  }

  listForUser(userId: string): NotificationRecord[] {
    return this.notificationRepository.listForUser(userId);
  }

  markRead(id: string): NotificationRecord | undefined {
    return this.notificationRepository.markRead(id);
  }
}
