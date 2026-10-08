export const NOTIFICATION_DELIVERY_VERSION = '20261008-notification-delivery-1';

/** Additive private retry state; the notification row remains delivery authority. */
export async function migrateNotificationDelivery(client) {
  await client.query(`CREATE TABLE IF NOT EXISTS notification_delivery_state (
    notification_id uuid PRIMARY KEY REFERENCES notifications(id) ON DELETE CASCADE,
    attempts integer NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 5),
    status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','dead','delivered')),
    last_error text, last_attempt_at timestamptz, next_retry_at timestamptz NOT NULL DEFAULT clock_timestamp()
  )`);
  await client.query(`CREATE INDEX IF NOT EXISTS notification_delivery_dead_idx
    ON notification_delivery_state(status,last_attempt_at) WHERE status='dead'`);
  await client.query(`CREATE TABLE IF NOT EXISTS notification_delivery_replays (
    id bigserial PRIMARY KEY, notification_id uuid NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
    replayed_at timestamptz NOT NULL DEFAULT clock_timestamp(), previous_attempts integer NOT NULL,
    previous_error text, operator_reason text NOT NULL
  )`);
  await client.query('INSERT INTO release_schema_versions(version) VALUES($1) ON CONFLICT DO NOTHING', [NOTIFICATION_DELIVERY_VERSION]);
}
