import type { NotificationRecord } from "../types/index.js";

export class NotificationDeliveryService {
  async deliver(notification: NotificationRecord): Promise<NotificationRecord> {
    return notification;
  }
}
