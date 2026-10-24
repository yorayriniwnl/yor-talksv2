import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, test } from 'node:test';
import { pool } from '@workspace/db';
import { purgeHiddenMessageContent } from '../services/message-retention-service.js';
import { ensureMessageCleanupLoop } from '../workers/lifecycle-worker.js';

after(() => pool.end());

for (const storage of ['timestamp', 'timestamptz'] as const) {
  for (const zone of ['Asia/Kolkata', 'America/New_York']) {
    test(`hidden message bodies are purged in bounded batches with ${storage} in ${zone}`, async () => {
      assert.equal(process.env.NODE_ENV, 'test');
      assert.ok(process.env.DATABASE_URL);
      const client = await pool.connect();
      try {
        await client.query("SELECT set_config('TimeZone',$1,false)", [zone]);
        // Shadows isolate every mutation while exercising actual migrated
        // columns, indexes and the real media-reference cleanup trigger.
        await client.query('CREATE TEMP TABLE messages (LIKE public.messages INCLUDING ALL)');
        await client.query(`ALTER TABLE pg_temp.messages ALTER COLUMN expires_at TYPE ${storage}`);
        await client.query('CREATE TEMP TABLE message_reads(message_id uuid,user_id uuid)');
        await client.query('CREATE TEMP TABLE message_preview_events(message_id uuid,user_id uuid)');
        await client.query('CREATE TEMP TABLE media_references(media_id uuid,entity_type text,entity_id uuid)');
        await client.query(`CREATE TRIGGER media_message_cleanup AFTER UPDATE ON pg_temp.messages
          FOR EACH ROW EXECUTE FUNCTION public.media_message_hidden()`);
        const now = Date.now(), expired = new Date(now - 3600_000).toISOString(), future = new Date(now + 3600_000).toISOString();
        const sender = randomUUID(), recipient = randomUUID(), conversation = randomUUID();
        const ids = { deleted: randomUUID(), expired: randomUUID(), live: randomUUID(), timeless: randomUUID() };
        for (const [name, id] of Object.entries(ids)) {
          await client.query(`INSERT INTO pg_temp.messages(id,conversation_id,sender_id,recipient_id,content,
            media_url,media_type,media_duration,media_legacy,reply_to_id,forwarded_from_id,reactions,pinned,expires_at,deleted_at)
            VALUES($1,$2,$3,$4,$5,'https://example.invalid/private.jpg','image',12,true,$6,$6,$7,true,$8,$9)`,
          [id, conversation, sender, recipient, `${name} private body`, ids.timeless,
            JSON.stringify({ heart: [recipient] }), name === 'expired' ? expired : name === 'timeless' ? null : future,
            name === 'deleted' ? expired : null]);
          await client.query('INSERT INTO pg_temp.message_reads VALUES($1,$2)', [id, recipient]);
          await client.query('INSERT INTO pg_temp.message_preview_events VALUES($1,$2)', [id, recipient]);
          await client.query("INSERT INTO pg_temp.media_references VALUES($1,'messages',$2)", [randomUUID(), id]);
        }
        // Failure after the body update must roll back the body, marker and
        // media release; retrying the same batch then completes normally.
        await client.query(`CREATE FUNCTION pg_temp.reject_cleanup() RETURNS trigger LANGUAGE plpgsql AS $$
          BEGIN RAISE EXCEPTION 'synthetic receipt cleanup failure'; END $$`);
        await client.query(`CREATE TRIGGER cleanup_failure BEFORE DELETE ON pg_temp.message_reads
          FOR EACH ROW EXECUTE FUNCTION pg_temp.reject_cleanup()`);
        await assert.rejects(purgeHiddenMessageContent(1, client), /synthetic receipt cleanup failure/);
        assert.equal((await client.query('SELECT content FROM pg_temp.messages WHERE id=$1', [ids.deleted])).rows[0].content, 'deleted private body');
        assert.equal((await client.query('SELECT count(*)::int AS n FROM pg_temp.media_references')).rows[0].n, 4);
        await client.query('DROP TRIGGER cleanup_failure ON pg_temp.message_reads');
        assert.equal(await purgeHiddenMessageContent(1, client), 1);
        assert.equal(await purgeHiddenMessageContent(1, client), 1);
        assert.equal(await purgeHiddenMessageContent(1, client), 0);
        assert.equal((await client.query('SHOW TimeZone')).rows[0].TimeZone, zone, 'cleanup must restore the caller session zone');
        const rows = (await client.query('SELECT * FROM pg_temp.messages')).rows;
        for (const id of [ids.deleted, ids.expired]) {
          const row = rows.find(row => row.id === id)!;
          assert.equal(row.content, '');
          for (const field of ['media_id', 'media_url', 'media_type', 'media_duration', 'reply_to_id', 'forwarded_from_id', 'seen_at', 'edited_at']) assert.equal(row[field], null);
          assert.deepEqual(row.reactions, {}); assert.equal(row.pinned, false); assert.equal(row.media_legacy, false);
          assert.ok(row.deleted_at); assert.ok(row.content_purged_at);
        }
        for (const name of ['live', 'timeless'] as const) {
          const row = rows.find(row => row.id === ids[name])!;
          assert.equal(row.content, `${name} private body`); assert.equal(row.content_purged_at, null);
        }
        for (const table of ['message_reads', 'message_preview_events']) {
          const remaining = await client.query(`SELECT message_id FROM pg_temp.${table} ORDER BY message_id`);
          assert.deepEqual(remaining.rows.map(row => row.message_id), [ids.live, ids.timeless].sort());
        }
        const references = await client.query('SELECT entity_id FROM pg_temp.media_references ORDER BY entity_id');
        assert.deepEqual(references.rows.map(row => row.entity_id), [ids.live, ids.timeless].sort());
        // Replaying a send with its old id cannot insert the original content.
        const retry = await client.query(`INSERT INTO pg_temp.messages(id,conversation_id,sender_id,content)
          VALUES($1,$2,$3,'Resurrection attempt') ON CONFLICT(id) DO NOTHING RETURNING id`, [ids.expired, conversation, sender]);
        assert.equal(retry.rowCount, 0);
      } finally {
        await client.query('DISCARD ALL');
        client.release();
      }
    });
  }
}

test('message cleanup skips locked rows and concurrent workers never reclaim a purged body', async () => {
  assert.equal(process.env.NODE_ENV, 'test');
  const schema = `retention_${randomUUID().replaceAll('-', '')}`;
  const first = await pool.connect(), second = await pool.connect();
  try {
    await first.query(`CREATE SCHEMA "${schema}"`);
    await first.query(`CREATE TABLE "${schema}".messages (LIKE public.messages INCLUDING ALL)`);
    await first.query(`CREATE TABLE "${schema}".message_reads(message_id uuid)`);
    await first.query(`CREATE TABLE "${schema}".message_preview_events(message_id uuid)`);
    for (const client of [first, second]) await client.query("SELECT set_config('search_path',$1,false)", [schema]);
    const ids = [randomUUID(), randomUUID(), randomUUID()];
    for (const id of ids) await first.query(`INSERT INTO messages(id,conversation_id,sender_id,content,deleted_at)
      VALUES($1,$2,$3,'Deleted secret',now())`, [id, randomUUID(), randomUUID()]);
    await first.query('BEGIN');
    await first.query('SELECT id FROM messages WHERE id=$1 FOR UPDATE', [ids[0]]);
    assert.equal(await purgeHiddenMessageContent(10, second), 2);
    assert.equal((await first.query('SELECT content FROM messages WHERE id=$1', [ids[0]])).rows[0].content, 'Deleted secret');
    await first.query('COMMIT');
    const counts = await Promise.all([purgeHiddenMessageContent(10, first), purgeHiddenMessageContent(10, second)]);
    assert.equal(counts[0] + counts[1], 1);
    assert.equal((await first.query("SELECT count(*)::int AS n FROM messages WHERE content<>''")).rows[0].n, 0);
    assert.equal((await first.query('SELECT count(*)::int AS n FROM messages')).rows[0].n, 3);
  } finally {
    await first.query('ROLLBACK');
    for (const client of [first, second]) await client.query('RESET search_path');
    await first.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    first.release(); second.release();
  }
});

test('the permanent message cleanup loop recovers terminal jobs without stealing a running lease', async () => {
  assert.equal(process.env.NODE_ENV, 'test');
  await ensureMessageCleanupLoop();
  await pool.query("UPDATE background_jobs SET status='dead',attempts=8 WHERE dedup_key='message:cleanup:loop'");
  await ensureMessageCleanupLoop();
  const restored = (await pool.query("SELECT status,attempts FROM background_jobs WHERE dedup_key='message:cleanup:loop'")).rows[0];
  assert.deepEqual(restored, { status: 'pending', attempts: 0 });
  const token = randomUUID();
  try {
    await pool.query(`UPDATE background_jobs SET status='running',lease_token=$1,lease_until=now()+interval '2 minutes'
      WHERE dedup_key='message:cleanup:loop'`, [token]);
    await ensureMessageCleanupLoop();
    const running = (await pool.query("SELECT status,lease_token FROM background_jobs WHERE dedup_key='message:cleanup:loop'")).rows[0];
    assert.deepEqual(running, { status: 'running', lease_token: token });
  } finally {
    await pool.query("UPDATE background_jobs SET status='complete',lease_token=NULL,lease_until=NULL WHERE dedup_key='message:cleanup:loop'");
    await ensureMessageCleanupLoop();
  }
});
