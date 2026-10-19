import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, test, type TestContext } from 'node:test';
import { pool } from '@workspace/db';
import { ProductAnalyticsService } from '../services/product-analytics-service.js';

after(() => pool.end());

async function fixture(t: TestContext, storage: 'timestamp' | 'timestamptz', zone: string) {
  const client = await pool.connect();
  const release = client.release.bind(client);
  const query = client.query.bind(client);
  let unpin = () => {};
  let restored = false;
  const restore = async () => {
    if (restored) return;
    restored = true;
    unpin();
    try {
      await query('ROLLBACK');
      await query('DISCARD TEMP');
      await query('RESET TimeZone');
    } finally { client.release = release; release(); }
  };
  t.after(restore);
  try {
    await query("SELECT set_config('TimeZone',$1,false)", [zone]);
    for (const table of ['product_analytics_events', 'product_analytics_daily', 'product_analytics_job_runs']) {
      await query(`CREATE TEMP TABLE ${table} (LIKE public.${table} INCLUDING ALL)`);
    }
    for (const [table, column] of [['product_analytics_events', 'occurred_at'], ['product_analytics_daily', 'date']]) {
      await query(`ALTER TABLE pg_temp.${table} ALTER COLUMN ${column} TYPE ${storage}
        USING ${column}::timestamp${storage === 'timestamptz' ? " AT TIME ZONE 'UTC'" : ''}`);
    }
    client.release = () => undefined;
    const queryMock = t.mock.method(pool, 'query', query);
    const connectMock = t.mock.method(pool, 'connect', async () => client);
    unpin = () => { queryMock.mock.restore(); connectMock.mock.restore(); };
  } catch (error) { await restore(); throw error; }
  return { query, restore };
}

for (const storage of ['timestamp', 'timestamptz'] as const) {
  for (const zone of ['Asia/Calcutta', 'America/New_York']) {
    test(`analytics UTC boundaries and rollup retries preserve ${storage} data in ${zone}`, async t => {
      const f = await fixture(t, storage, zone);
      try {
        const service = new ProductAnalyticsService();
        const day = new Date('2026-03-08T00:00:00.000Z');
        const end = new Date('2026-03-09T00:00:00.000Z');
        const actorId = randomUUID();
        for (const instant of [
          '2026-03-07T23:59:59.999Z', day.toISOString(),
          '2026-03-08T23:59:59.999Z', end.toISOString(),
        ]) {
          await f.query(`INSERT INTO product_analytics_events(id,schema_version,event_name,actor_id,occurred_at,properties)
            VALUES($1,1,'navigation',$2,$3,'{}')`, [randomUUID(), actorId, instant]);
        }
        await f.query(`INSERT INTO product_analytics_daily(date,event_name,event_count,unique_users)
          VALUES('2026-03-08T05:30:00.000Z','navigation',99,99),
            ('2026-03-09T00:00:00.000Z','navigation',7,1)`);

        await service.rollupDay(day);
        await service.rollupDay(day);
        await service.runDailyRollup(day);
        const rows = await service.getDaily(day, end);
        assert.deepEqual(rows.map(row => [row.eventName, row.eventCount, row.uniqueUsers]), [
          ['active_users', 1, 1], ['navigation', 2, 1],
        ]);
        const stored = await f.query(`SELECT CASE
          WHEN pg_typeof(date)='timestamp without time zone'::regtype THEN date::timestamp AT TIME ZONE 'UTC'
          ELSE date::timestamptz END AS instant FROM product_analytics_daily
          WHERE event_name='active_users'`);
        assert.ok(stored.rows.every(row => row.instant.toISOString() === day.toISOString()));
        assert.equal((await service.getDaily(end, new Date('2026-03-10T00:00:00.000Z')))[0].eventCount, 7,
          'rebuilding one UTC day must preserve the adjacent day');
        const job = (await f.query('SELECT status,processed_events FROM product_analytics_job_runs')).rows[0];
        assert.equal(job.status, 'succeeded');
        assert.equal(job.processed_events, 2);
        assert.equal((await f.query('SELECT count(*)::int AS count FROM product_analytics_events')).rows[0].count, 4);
        assert.equal((await f.query('SHOW TimeZone')).rows[0].TimeZone, zone,
          'transaction-local UTC must not change the pooled connection timezone');
      } finally { await f.restore(); }
    });
  }
}
