import { randomUUID } from "node:crypto";
import { NotificationRepository } from "../repositories/notification-repository.js";
import type { NotificationRecord } from "../types/index.js";

export class NotificationService {
  constructor(private readonly notificationRepository: NotificationRepository) {}

  async createNotification(input: Omit<NotificationRecord, "id" | "createdAt" | "readAt">): Promise<NotificationRecord> {
    const notification: NotificationRecord = {
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      readAt: null,
      ...input,
    };
    return this.notificationRepository.create(notification);
  }

  async listForUser(userId: string): Promise<NotificationRecord[]> {
    return this.notificationRepository.listForUser(userId);
  }

  async markRead(id: string, recipientId: string): Promise<NotificationRecord | undefined> {
    return this.notificationRepository.markRead(id, recipientId);
  }

  async markAllRead(recipientId: string): Promise<void> {
    return this.notificationRepository.markAllRead(recipientId);
  }
}
