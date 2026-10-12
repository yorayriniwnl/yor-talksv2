/** Preserve other participants' history without preserving a deleted owner's bodies or identity. */
export const MESSAGING_SCHEMA_VERSION = '20261007-shared-message-history-1';

export async function migrateMessaging(client) {
  await client.query('BEGIN');
  try {
    await client.query(`CREATE TABLE IF NOT EXISTS release_schema_versions (
      version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now()
    )`);
    const references = [
      ['conversations', 'participant_a', 'users'], ['conversations', 'participant_b', 'users'],
      ['messages', 'sender_id', 'users'], ['messages', 'recipient_id', 'users'],
      ['messages', 'reply_to_id', 'messages'], ['messages', 'forwarded_from_id', 'messages'],
    ];
    for (const [table, column, target] of references) {
      await client.query(`ALTER TABLE "${table}" ALTER COLUMN "${column}" DROP NOT NULL`);
      const constraints = await client.query(`SELECT c.conname,c.confdeltype FROM pg_constraint c
        JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=ANY(c.conkey)
        WHERE c.conrelid=$1::regclass AND c.contype='f' AND a.attname=$2 AND c.confrelid=$3::regclass`, [table, column, target]);
      for (const row of constraints.rows.filter(row => row.confdeltype !== 'n')) {
        await client.query(`ALTER TABLE "${table}" DROP CONSTRAINT "${row.conname.replaceAll('"', '""')}"`);
      }
      if (!constraints.rows.some(row => row.confdeltype === 'n')) {
        await client.query(`ALTER TABLE "${table}" ADD CONSTRAINT "${table}_${column}_shared_fk"
          FOREIGN KEY("${column}") REFERENCES "${target}"(id) ON DELETE SET NULL`);
      }
    }
    // This also covers user removal through administrative or SQL paths. The
    // user's own message becomes a bodyless tombstone so surviving replies
    // retain an anchor, while peer-authored contributions remain unchanged.
    await client.query(`CREATE OR REPLACE FUNCTION messaging_account_deleting() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        UPDATE messages SET content='',media_id=NULL,media_url=NULL,media_type=NULL,media_duration=NULL,
          media_legacy=false,text_style_id='default',reactions='{}'::jsonb,pinned=false,edited_at=NULL,
          seen_at=NULL,expires_at=NULL,deleted_at=timezone('UTC',clock_timestamp()),sender_id=NULL WHERE sender_id=OLD.id;
        UPDATE messages SET recipient_id=NULL WHERE recipient_id=OLD.id;
        UPDATE messages m SET reactions=coalesce((
          SELECT jsonb_object_agg(entry.key,cleaned.actors) FROM jsonb_each(coalesce(m.reactions,'{}'::jsonb)) entry
          CROSS JOIN LATERAL (SELECT coalesce(jsonb_agg(actor),'[]'::jsonb) AS actors
            FROM jsonb_array_elements(entry.value) actor WHERE actor<>to_jsonb(OLD.id::text)) cleaned
          WHERE jsonb_array_length(cleaned.actors)>0
        ),'{}'::jsonb) WHERE reactions::text LIKE '%'||OLD.id::text||'%';
        UPDATE conversations SET participant_ids=coalesce(participant_ids,'[]'::jsonb)-OLD.id::text,
          participant_a=CASE WHEN participant_a=OLD.id THEN NULL ELSE participant_a END,
          participant_b=CASE WHEN participant_b=OLD.id THEN NULL ELSE participant_b END
          WHERE participant_a=OLD.id OR participant_b=OLD.id OR participant_ids ? OLD.id::text;
        DELETE FROM conversation_members WHERE user_id=OLD.id;
        DELETE FROM conversations c WHERE c.participant_a IS NULL AND c.participant_b IS NULL
          AND jsonb_array_length(coalesce(c.participant_ids,'[]'::jsonb))=0
          AND NOT EXISTS(SELECT 1 FROM conversation_members cm WHERE cm.conversation_id=c.id);
        RETURN OLD;
      END $$`);
    await client.query('DROP TRIGGER IF EXISTS messaging_account_cleanup ON users');
    await client.query(`CREATE TRIGGER messaging_account_cleanup BEFORE DELETE ON users
      FOR EACH ROW EXECUTE FUNCTION messaging_account_deleting()`);
    await client.query('INSERT INTO release_schema_versions(version) VALUES($1) ON CONFLICT DO NOTHING', [MESSAGING_SCHEMA_VERSION]);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}
