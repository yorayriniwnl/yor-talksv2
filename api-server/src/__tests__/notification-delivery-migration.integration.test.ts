import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import type { Client } from 'pg';
import { assertIsolatedPostgres } from '../../../ops/test-infrastructure-guard.mjs';

const { Client: PostgresClient } = createRequire(import.meta.resolve('@workspace/db'))('pg') as typeof import('pg');
const migrationUrl = new URL('../../../lib/db/scripts/migrate-notification-delivery.mjs', import.meta.url).href;
const { migrateNotificationDelivery, NOTIFICATION_DELIVERY_VERSION } = await import(migrationUrl) as {
  migrateNotificationDelivery(client: Client): Promise<void>; NOTIFICATION_DELIVERY_VERSION: string;
};

test('additive notification migration preserves delivered markers and exhausted/replayed history across repeat upgrades', async t => {
  assert.equal(process.env.NODE_ENV, 'test'); assert.ok(process.env.DATABASE_URL);
  assertIsolatedPostgres(process.env);
  const client = new PostgresClient({ connectionString: process.env.DATABASE_URL, ssl: false });
  await client.connect();
  const identity = (await client.query('SELECT current_database() AS database,inet_server_port() AS port')).rows[0];
  assertIsolatedPostgres(process.env, identity);
  const schema = `notification_retry_${randomUUID().replaceAll('-', '')}`;
  t.after(async () => { try { await client.query(`DROP SCHEMA "${schema}" CASCADE`); } finally { await client.end(); } });
  await client.query(`CREATE SCHEMA "${schema}"`);
  await client.query(`SET search_path TO "${schema}", public`);
  await client.query('CREATE TABLE release_schema_versions(version text PRIMARY KEY)');
  await client.query('CREATE TABLE notifications(id uuid PRIMARY KEY,push_delivered_at timestamptz)');
  const delivered = randomUUID(), pending = randomUUID();
  await client.query("INSERT INTO notifications VALUES($1,'2026-10-07T00:00:00Z'),($2,NULL)", [delivered, pending]);
  await migrateNotificationDelivery(client);
  assert.equal((await client.query('SELECT push_delivered_at FROM notifications WHERE id=$1', [delivered])).rows[0].push_delivered_at.toISOString(), '2026-10-07T00:00:00.000Z');
  await client.query("INSERT INTO notification_delivery_state(notification_id,attempts,status,last_error) VALUES($1,5,'dead','notification_delivery_failed')", [pending]);
  await client.query("INSERT INTO notification_delivery_replays(notification_id,previous_attempts,previous_error,operator_reason) VALUES($1,5,'notification_delivery_failed','provider_recovered')", [pending]);
  await migrateNotificationDelivery(client);
  assert.deepEqual((await client.query('SELECT attempts,status,last_error FROM notification_delivery_state WHERE notification_id=$1', [pending])).rows[0],
    { attempts: 5, status: 'dead', last_error: 'notification_delivery_failed' });
  assert.equal((await client.query('SELECT count(*)::int AS count FROM notification_delivery_replays')).rows[0].count, 1);
  assert.deepEqual((await client.query('SELECT version FROM release_schema_versions')).rows, [{ version: NOTIFICATION_DELIVERY_VERSION }]);
  await assert.rejects(client.query('UPDATE notification_delivery_state SET attempts=6 WHERE notification_id=$1', [pending]), /check constraint/);
  await client.query('DELETE FROM notifications WHERE id=$1', [pending]);
  assert.equal((await client.query('SELECT count(*)::int AS count FROM notification_delivery_state')).rows[0].count, 0);
  assert.equal((await client.query('SELECT count(*)::int AS count FROM notification_delivery_replays')).rows[0].count, 0);
});
