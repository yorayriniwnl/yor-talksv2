import { randomUUID } from "node:crypto";
export class NotificationService {
    notificationRepository;
    constructor(notificationRepository) {
        this.notificationRepository = notificationRepository;
    }
    async createNotification(input) {
        const notification = {
            id: randomUUID(),
            createdAt: new Date().toISOString(),
            readAt: null,
            ...input,
        };
        return this.notificationRepository.create(notification);
    }
    async listForUser(userId) {
        return this.notificationRepository.listForUser(userId);
    }
    async markRead(id) {
        return this.notificationRepository.markRead(id);
    }
}
//# sourceMappingURL=notification-service.js.map