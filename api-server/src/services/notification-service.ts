import { randomUUID } from "node:crypto";
import { NotificationRepository } from "../repositories/notification-repository.js";
import { UserRepository } from "../repositories/user-repository.js";
import type { NotificationRecord } from "../types/index.js";
import { EligibilityService } from "./eligibility-service.js";

export class NotificationService {
  constructor(
    private readonly notificationRepository: NotificationRepository,
    private readonly eligibilityService: EligibilityService = new EligibilityService(),
    private readonly userRepository: UserRepository = new UserRepository(),
  ) {}

  async createNotification(input: Omit<NotificationRecord, "id" | "createdAt" | "readAt">): Promise<NotificationRecord> {
    let channel = input.channel;
    if (channel === "push") {
      try {
        const [decision, recipient] = await Promise.all([
          this.eligibilityService.decisionFor(input.recipientId),
          this.userRepository.findById(input.recipientId),
        ]);
        if (!decision.activated || !decision.capabilities.social || decision.experience !== "adult_18_plus" || !recipient?.settings.notificationsEnabled) {
          channel = "in_app";
        }
      } catch {
        // Optional push dispatch is suppressed when authority or preferences
        // cannot be read; the in-app notice remains available.
        channel = "in_app";
      }
    }
    const notification: NotificationRecord = {
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      readAt: null,
      ...input,
      channel,
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
