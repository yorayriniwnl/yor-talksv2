import { logger } from "../lib/logger.js";
import webpush from "web-push";
import { env } from "../config/env.js";
import { PushSubscriptionRepository } from "../repositories/push-subscription-repository.js";
import { UserRepository } from "../repositories/user-repository.js";
import { NotificationRepository } from "../repositories/notification-repository.js";
import type { NotificationRecord, UserRecord } from "../types/index.js";
import { EligibilityService } from "./eligibility-service.js";
import { isAllowedPushEndpoint } from '../utils/push-endpoint.js';

export class NotificationDeliveryService {
  constructor(
    private readonly pushSubscriptionRepository = new PushSubscriptionRepository(),
    private readonly eligibilityService: EligibilityService = new EligibilityService(),
    private readonly userRepository: UserRepository = new UserRepository(),
    private readonly notificationRepository: Pick<NotificationRepository, 'findById'> = new NotificationRepository(),
  ) {}

  private async mayPushTo(userId: string): Promise<boolean> {
    try {
      const [decision, current] = await Promise.all([
        this.eligibilityService.decisionFor(userId),
        this.userRepository.findById(userId),
      ]);
      return decision.activated && decision.capabilities.social && decision.experience === 'adult_18_plus'
        && Boolean(current && (current.accountStatus ?? 'active') === 'active' && current.settings.notificationsEnabled === true);
    } catch {
      return false;
    }
  }

  async deliver(notification: NotificationRecord, recipient?: UserRecord): Promise<NotificationRecord> {
    if (notification.channel && notification.channel !== "push") return notification;
    if (!recipient || recipient.settings?.notificationsEnabled !== true) {
      logger.info({ notificationId: notification.id, recipientId: notification.recipientId }, "Notification delivery skipped by user preference");
      return notification;
    }

    if (!await this.mayPushTo(notification.recipientId)) return notification;

    if (!env.WEB_PUSH_ENABLED || !env.WEB_PUSH_VAPID_PUBLIC_KEY || !env.WEB_PUSH_VAPID_PRIVATE_KEY) {
      logger.info({ notificationId: notification.id, recipientId: notification.recipientId }, "Notification stored for in-app delivery; Web Push is not configured");
      return notification;
    }

    webpush.setVapidDetails(env.WEB_PUSH_VAPID_SUBJECT, env.WEB_PUSH_VAPID_PUBLIC_KEY, env.WEB_PUSH_VAPID_PRIVATE_KEY);
    const subscriptions = await this.pushSubscriptionRepository.listForUser(notification.recipientId);
    const failures: unknown[] = [];
    await Promise.all(subscriptions.map(async (subscription) => {
      // Revalidate old rows as well as newly registered subscriptions. A push
      // capability URL must never become an arbitrary server-side destination.
      if (!isAllowedPushEndpoint(subscription.endpoint)) return;
      // Account deletion can erase a notification while the provider and
      // eligibility lookups above are pending. Resolve the persisted content
      // at the send boundary; a previously queued body is never authoritative.
      const current = await this.notificationRepository.findById(notification.id);
      if (!current || current.pushDeliveredAt || current.recipientId !== notification.recipientId
        || current.channel !== 'push') return;
      // Each canonical lookup can wait independently. A withdrawal while one
      // subscription is hydrated must suppress that device's provider request.
      if (!await this.mayPushTo(current.recipientId)) return;
      try {
        await webpush.sendNotification({
          endpoint: subscription.endpoint,
          keys: { p256dh: subscription.p256dh, auth: subscription.auth },
        }, JSON.stringify({
          title: current.title,
          body: current.message,
          icon: "/favicon.ico",
          badge: "/favicon.ico",
          data: {
            url: current.type === "broadcast_channel"
              ? "/channels"
              : current.relatedId ? `/post/${current.relatedId}` : "/notifications",
          },
        }));
        await this.pushSubscriptionRepository.markUsed(subscription.id);
      } catch (error: any) {
        const statusCode = Number(error?.statusCode);
        if (statusCode === 404 || statusCode === 410) {
          await this.pushSubscriptionRepository.removeByEndpoint(subscription.endpoint);
          logger.info({ subscriptionId: subscription.id, statusCode }, "Removed expired Web Push subscription");
          return;
        }
        // WebPushError can include the capability URL and provider response
        // body. Only a bounded HTTP status belongs in operational logs.
        logger.warn({ ...(Number.isInteger(statusCode) && statusCode >= 100 && statusCode <= 599 ? { statusCode } : {}),
          subscriptionId: subscription.id, notificationId: notification.id }, "Web Push delivery failed");
        failures.push(error);
      }
    }));
    if (failures.length > 0) {
      throw new Error(`Web Push delivery failed for ${failures.length} subscription(s)`);
    }
    return notification;
  }
}
