import { pool } from '@workspace/db';
import { NotificationRepository } from '../repositories/notification-repository.js';
import { UserRepository } from '../repositories/user-repository.js';
import { NotificationDeliveryService } from './notification-delivery-service.js';

/** Committed retry/delivery state survives Redis loss, job pruning and replay.
 * External providers cannot join this transaction: a crash after their delivery
 * acknowledgement but before COMMIT may still repeat an external send. */
export async function deliverDurableNotification(id: string,
  delivery = new NotificationDeliveryService(), users = new UserRepository(), notifications = new NotificationRepository()): Promise<void> {
  const client = await pool.connect();
  let deliveryFailed = false;
  try {
    await client.query('BEGIN');
    const row = (await client.query('SELECT id FROM notifications WHERE id=$1 AND push_delivered_at IS NULL FOR UPDATE', [id])).rows[0];
    if (row) {
      await client.query('INSERT INTO notification_delivery_state(notification_id) VALUES($1) ON CONFLICT DO NOTHING', [id]);
      const state = (await client.query('SELECT *,next_retry_at>clock_timestamp() AS retry_pending FROM notification_delivery_state WHERE notification_id=$1 FOR UPDATE', [id])).rows[0];
      if (state.status !== 'dead' && state.attempts < 5) {
        // BullMQ delayed retries supply the short-term schedule; recovery also
        // respects this durable timestamp after every transport reset.
        if (state.retry_pending) {
          deliveryFailed = true;
        } else {
          const notification = await notifications.findById(id);
          try {
            if (notification) {
              const recipient = await users.findById(notification.recipientId);
              if (recipient) await delivery.deliver(notification, recipient);
            }
            await client.query('UPDATE notifications SET push_delivered_at=clock_timestamp() WHERE id=$1', [id]);
            await client.query(`UPDATE notification_delivery_state SET attempts=attempts+1,status='delivered',
              last_error=NULL,last_attempt_at=clock_timestamp() WHERE notification_id=$1`, [id]);
          } catch {
            deliveryFailed = true;
            await client.query(`UPDATE notification_delivery_state SET attempts=attempts+1,
              status=CASE WHEN attempts+1>=5 THEN 'dead' ELSE 'pending' END,
              last_error='notification_delivery_failed',last_attempt_at=clock_timestamp(),
              next_retry_at=clock_timestamp()+power(2,attempts)*30*interval '1 second' WHERE notification_id=$1`, [id]);
          }
        }
      }
    }
    await client.query('COMMIT');
  } catch {
    await client.query('ROLLBACK').catch(() => undefined);
    throw new Error('notification_datastore_unavailable');
  } finally { client.release(); }
  if (deliveryFailed) throw new Error('notification_delivery_failed');
}
