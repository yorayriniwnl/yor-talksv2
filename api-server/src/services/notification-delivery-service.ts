import { logger } from "../lib/logger.js";
import webpush from "web-push";
import { env } from "../config/env.js";
import { PushSubscriptionRepository } from "../repositories/push-subscription-repository.js";
import type { NotificationRecord, UserRecord } from "../types/index.js";

export class NotificationDeliveryService {
  constructor(private readonly pushSubscriptionRepository = new PushSubscriptionRepository()) {}

  async deliver(notification: NotificationRecord, recipient?: UserRecord): Promise<NotificationRecord> {
    if (recipient?.settings?.notificationsEnabled === false) {
      logger.info({ notificationId: notification.id, recipientId: notification.recipientId }, "Notification delivery skipped by user preference");
      return notification;
    }

    if (!env.WEB_PUSH_VAPID_PUBLIC_KEY || !env.WEB_PUSH_VAPID_PRIVATE_KEY) {
      logger.info({ notificationId: notification.id, recipientId: notification.recipientId }, "Notification stored for in-app delivery; Web Push is not configured");
      return notification;
    }

    webpush.setVapidDetails(env.WEB_PUSH_VAPID_SUBJECT, env.WEB_PUSH_VAPID_PUBLIC_KEY, env.WEB_PUSH_VAPID_PRIVATE_KEY);
    const subscriptions = await this.pushSubscriptionRepository.listForUser(notification.recipientId);
    await Promise.all(subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification({
          endpoint: subscription.endpoint,
          keys: { p256dh: subscription.p256dh, auth: subscription.auth },
        }, JSON.stringify({
          title: notification.title,
          body: notification.message,
          icon: "/favicon.ico",
          badge: "/favicon.ico",
          data: { url: notification.relatedId ? `/post/${notification.relatedId}` : "/notifications" },
        }));
        await this.pushSubscriptionRepository.markUsed(subscription.id);
      } catch (error: any) {
        const statusCode = Number(error?.statusCode);
        if (statusCode === 404 || statusCode === 410) {
          await this.pushSubscriptionRepository.removeByEndpoint(subscription.endpoint);
          logger.info({ endpoint: subscription.endpoint, statusCode }, "Removed expired Web Push subscription");
          return;
        }
        logger.warn({ err: error, subscriptionId: subscription.id, notificationId: notification.id }, "Web Push delivery failed");
      }
    }));
    return notification;
  }
}
