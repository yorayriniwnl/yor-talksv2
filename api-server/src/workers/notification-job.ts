import type { NotificationRepository } from '../repositories/notification-repository.js';
import type { UserRepository } from '../repositories/user-repository.js';
import type { NotificationDeliveryService } from '../services/notification-delivery-service.js';

/** Legacy queued bodies may identify a row, but never supply delivery content. */
export async function deliverNotificationJob(
  data: unknown,
  notifications: Pick<NotificationRepository, 'findById' | 'markPushDelivered'>,
  users: Pick<UserRepository, 'findById'>,
  delivery: Pick<NotificationDeliveryService, 'deliver'>,
): Promise<void> {
  if (!data || typeof data !== 'object') return;
  const record = data as Record<string, unknown>;
  const id = record.notificationId ?? record.id;
  if (typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) return;
  const notification = await notifications.findById(id);
  if (!notification || notification.pushDeliveredAt) return;
  const recipient = await users.findById(notification.recipientId);
  // Recipient lookup can await while an account deletion removes the notice.
  const current = await notifications.findById(id);
  if (!current || current.pushDeliveredAt || current.recipientId !== notification.recipientId) return;
  await delivery.deliver(current, recipient);
  await notifications.markPushDelivered(current.id);
}
