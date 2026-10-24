import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, test } from 'node:test';
import { pool } from '@workspace/db';
import { UserRepository } from '../repositories/user-repository.js';
import { ProductAnalyticsService } from '../services/product-analytics-service.js';
import { createTestUser } from './test-helpers.js';

// Synthetic authorization exercises storage only; the capability boundary is
// covered by the analytics policy tests.
const service = new ProductAnalyticsService({ requireCapability: async () => ({} as never) } as never);
const eventIds: string[] = [];
const userIds: string[] = [];

after(async () => {
  try {
    if (eventIds.length) await pool.query('DELETE FROM product_analytics_events WHERE id = ANY($1::uuid[])', [eventIds]);
    if (userIds.length) await pool.query('DELETE FROM users WHERE id = ANY($1::uuid[])', [userIds]);
  } finally {
    await pool.end();
  }
});

const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString();

test('the daily prune deletes raw analytics events older than the retention window and keeps newer ones', async () => {
  const old = randomUUID(), recent = randomUUID(), boundary = randomUUID();
  eventIds.push(old, recent, boundary);
  await pool.query(`INSERT INTO product_analytics_events(id,schema_version,event_name,actor_id,occurred_at,properties)
    VALUES ($1,1,'navigation',NULL,$2,'{}'),($3,1,'navigation',NULL,$4,'{}'),($5,1,'navigation',NULL,$6,'{}')`,
  [old, daysAgo(100), recent, daysAgo(10), boundary, daysAgo(89)]);

  const deleted = await service.pruneEvents(90);
  assert.ok(deleted >= 1);
  const remaining = (await pool.query('SELECT id FROM product_analytics_events WHERE id = ANY($1::uuid[])', [[old, recent, boundary]]))
    .rows.map(row => row.id).sort();
  assert.deepEqual(remaining, [recent, boundary].sort());
});

test('ingested event times are stored as UTC instants even when the client sends an offset', async () => {
  const user = await createTestUser(new UserRepository());
  userIds.push(user.id);
  const instant = new Date(Date.now() - 60 * 60_000);
  instant.setUTCMilliseconds(0);
  // The same instant expressed in India Standard Time.
  const ist = new Date(instant.getTime() + 330 * 60_000).toISOString().replace('Z', '+05:30');
  const eventId = randomUUID();
  eventIds.push(eventId);
  assert.equal(await service.ingest(user.id, [{ eventId, schemaVersion: 1, eventName: 'navigation', occurredAt: ist, properties: {} }]), 1);
  const stored = (await pool.query(`SELECT (CASE WHEN pg_typeof(occurred_at)='timestamp without time zone'::regtype
      THEN occurred_at::timestamp AT TIME ZONE 'UTC' ELSE occurred_at::timestamptz END) AS occurred_at
    FROM product_analytics_events WHERE id=$1`, [eventId])).rows[0];
  assert.equal(new Date(stored.occurred_at).toISOString(), instant.toISOString());
});
