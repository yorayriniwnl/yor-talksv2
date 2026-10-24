import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, test } from 'node:test';
import { pool } from '@workspace/db';

after(() => pool.end());

for (const storage of ['timestamp', 'timestamptz'] as const) {
  for (const zone of ['UTC', 'Asia/Kolkata', 'America/New_York']) {
    test(`the migrated media expiry trigger compares UTC instants with ${storage} in ${zone}`, async () => {
      assert.equal(process.env.NODE_ENV, 'test', 'This regression requires disposable test infrastructure');
      assert.ok(process.env.DATABASE_URL, 'An explicit disposable DATABASE_URL is required');
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query("SELECT set_config('TimeZone',$1,true)", [zone]);
        // Execute the actual migrated function against private shadows. No
        // production rows, public triggers or public function are changed.
        await client.query(`CREATE TEMP TABLE messages(id uuid PRIMARY KEY,expires_at ${storage},deleted_at timestamptz) ON COMMIT DROP`);
        await client.query(`CREATE TEMP TABLE media_references(media_id uuid,entity_type text,entity_id uuid) ON COMMIT DROP`);
        await client.query(`CREATE TRIGGER media_message_cleanup AFTER UPDATE ON pg_temp.messages
          FOR EACH ROW EXECUTE FUNCTION public.media_message_hidden()`);
        const reference = async (expiresAt: string | null, deletedAt: string | null = null) => {
          const id = randomUUID();
          await client.query('INSERT INTO pg_temp.messages(id,expires_at,deleted_at) VALUES($1,$2,$3)', [id, expiresAt, deletedAt]);
          await client.query("INSERT INTO pg_temp.media_references VALUES($1,'messages',$2)", [randomUUID(), id]);
          return id;
        };
        const now = Date.now();
        const future = new Date(now + 3_600_000).toISOString();
        const past = new Date(now - 3_600_000).toISOString();
        const live = await reference(future), expired = await reference(past), timeless = await reference(null);
        const deleted = await reference(future, new Date(now).toISOString());
        const elapsed = await client.query<{ cutoff: Date }>("SELECT transaction_timestamp()+interval '100 milliseconds' AS cutoff");
        const expiredDuringTransaction = await reference(elapsed.rows[0].cutoff.toISOString());
        // Even after this instant passes, now()/transaction_timestamp() still
        // precedes it. The trigger must use the actual time of the update.
        await client.query('SELECT pg_sleep(0.125)');
        await client.query('UPDATE pg_temp.messages SET id=id');
        const retained = await client.query<{ entity_id: string }>('SELECT entity_id FROM pg_temp.media_references ORDER BY entity_id');
        assert.deepEqual(retained.rows.map(row => row.entity_id), [live, timeless].sort(),
          `only future and nonexpiring messages retain media; expired=${expired}, deleted=${deleted}, elapsed=${expiredDuringTransaction}`);
      } finally {
        await client.query('ROLLBACK');
        client.release();
      }
    });
  }
}
