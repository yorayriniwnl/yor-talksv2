import type { PoolClient } from 'pg';
import { pool } from '@workspace/db';

/** Remove bodies after the sender's deletion or the existing message expiry.
 * Keep the minimal row so its idempotency key and other messages' reply links
 * cannot recreate content. A supplied connection must have no open transaction.
 */
export async function purgeHiddenMessageContent(limit = 500, connection?: PoolClient): Promise<number> {
  if (!Number.isInteger(limit) || limit < 1 || limit > 1000) throw new Error('Invalid message cleanup batch size');
  const client = connection ?? await pool.connect();
  try {
    await client.query('BEGIN');
    // Legacy databases use timestamptz; fresh ones use UTC wall timestamps.
    // Local UTC makes both comparisons indexable and independent of session zone.
    await client.query("SET LOCAL TIME ZONE 'UTC'");
    await client.query("SET LOCAL lock_timeout='2s'");
    await client.query("SET LOCAL statement_timeout='10s'");
    const result = await client.query<{ id: string }>(`WITH deleted AS MATERIALIZED (
      SELECT id FROM messages WHERE content_purged_at IS NULL AND deleted_at IS NOT NULL
      ORDER BY deleted_at,id FOR UPDATE SKIP LOCKED LIMIT $1
    ), expired AS MATERIALIZED (
      SELECT id FROM messages WHERE content_purged_at IS NULL AND deleted_at IS NULL
        AND expires_at<=statement_timestamp()
      ORDER BY expires_at,id FOR UPDATE SKIP LOCKED LIMIT ($1-(SELECT count(*) FROM deleted))
    ), targets AS (SELECT id FROM deleted UNION ALL SELECT id FROM expired)
    UPDATE messages m SET content='',media_id=NULL,media_url=NULL,media_type=NULL,media_duration=NULL,
      media_legacy=false,text_style_id='default',reply_to_id=NULL,forwarded_from_id=NULL,
      reactions='{}'::jsonb,pinned=false,edited_at=NULL,seen_at=NULL,
      deleted_at=COALESCE(m.deleted_at,statement_timestamp()),content_purged_at=statement_timestamp()
    FROM targets WHERE m.id=targets.id RETURNING m.id`, [limit]);
    if (result.rows.length) {
      const ids = result.rows.map(row => row.id);
      // Updating the row also invokes the existing media-reference removal
      // trigger, which queues provider cleanup only after the last reference.
      await client.query('DELETE FROM message_reads WHERE message_id=ANY($1::uuid[])', [ids]);
      await client.query('DELETE FROM message_preview_events WHERE message_id=ANY($1::uuid[])', [ids]);
    }
    await client.query('COMMIT');
    return result.rows.length;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    if (!connection) client.release();
  }
}
