export const ACCOUNT_HISTORY_RETENTION_VERSION = '20261014-group-history-retention';

/**
 * Keep a deleted member's shared group history and memberships intact while
 * removing the user's personal link from legacy conversation/message rows.
 *
 * This is additive and safe for already-migrated deployments: it only removes
 * the cascade-on-delete tie from legacy participant/recipient columns and turns
 * the related foreign keys into retained references that are set-null instead.
 */
export async function migrateAccountHistoryRetention(client) {
  await client.query(`DO $$
    DECLARE legacy_fk record;
    BEGIN
      FOR legacy_fk IN
        SELECT c.conrelid::regclass AS table_name, c.conname
        FROM pg_constraint c
        JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
        WHERE c.contype = 'f'
          AND c.confdeltype <> 'n'
          AND (
            (c.conrelid = 'public.conversations'::regclass AND a.attname IN ('participant_a', 'participant_b'))
            OR (c.conrelid = 'public.messages'::regclass AND a.attname = 'recipient_id')
          )
      LOOP
        EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', legacy_fk.table_name, legacy_fk.conname);
      END LOOP;
    END $$;`);

  await client.query(`ALTER TABLE conversations ALTER COLUMN participant_a DROP NOT NULL`);
  await client.query(`ALTER TABLE conversations ALTER COLUMN participant_b DROP NOT NULL`);
  await client.query(`ALTER TABLE messages ALTER COLUMN recipient_id DROP NOT NULL`);

  await client.query(`DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conrelid = 'public.conversations'::regclass AND conname = 'conversations_participant_a_retained_fk'
      ) THEN
        ALTER TABLE conversations ADD CONSTRAINT conversations_participant_a_retained_fk
          FOREIGN KEY (participant_a) REFERENCES users(id) ON DELETE SET NULL;
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conrelid = 'public.conversations'::regclass AND conname = 'conversations_participant_b_retained_fk'
      ) THEN
        ALTER TABLE conversations ADD CONSTRAINT conversations_participant_b_retained_fk
          FOREIGN KEY (participant_b) REFERENCES users(id) ON DELETE SET NULL;
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conrelid = 'public.messages'::regclass AND conname = 'messages_recipient_retained_fk'
      ) THEN
        ALTER TABLE messages ADD CONSTRAINT messages_recipient_retained_fk
          FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE SET NULL;
      END IF;
    END $$;`);
}
