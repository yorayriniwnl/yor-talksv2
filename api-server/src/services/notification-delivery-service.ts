import { logger } from "../lib/logger.js";
import type { NotificationRecord, UserRecord } from "../types/index.js";

/**
 * TODO: no real email/push/SMS provider is wired up (would need e.g.
 * nodemailer + SMTP credentials, or a push provider like FCM/APNs). This
 * logs what it *would* send, at the channel implied by the recipient's
 * settings, so the delivery pipeline (queue -> worker -> here) is real and
 * testable even though the last hop isn't connected to a real provider yet.
 */
export class NotificationDeliveryService {
  async deliver(notification: NotificationRecord, recipient?: UserRecord): Promise<NotificationRecord> {
    const channel = recipient?.settings?.notificationsEnabled === false ? "none (notifications disabled)" : "in-app";
    logger.info(
      { notificationId: notification.id, recipientId: notification.recipientId, type: notification.type, channel },
      "Notification delivery (no external provider configured — logging only)",
    );
    return notification;
  }
}
