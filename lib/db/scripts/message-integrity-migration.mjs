/** Additive message and conversation integrity upgrade.
 * The caller must already hold the advisory lock and release transaction. */
export async function migrateMessageIntegrity(client) {
  await client.query(`CREATE TABLE IF NOT EXISTS conversation_members (
    conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at timestamp NOT NULL DEFAULT now(),
    role text DEFAULT 'member',
    last_read_at timestamp,
    PRIMARY KEY(conversation_id, user_id)
  )`);

  // Only backfill groups with no normalized membership yet. Re-running must
  // never restore a member deliberately removed from the authoritative table.
  await client.query(`INSERT INTO conversation_members(conversation_id, user_id, role)
    SELECT DISTINCT c.id, u.id, CASE WHEN u.id=c.participant_a THEN 'admin' ELSE 'member' END
    FROM conversations c
    CROSS JOIN LATERAL jsonb_array_elements_text(
      coalesce(c.participant_ids, '[]'::jsonb) || jsonb_build_array(c.participant_a, c.participant_b)
    ) ids(value)
    JOIN users u ON u.id::text = ids.value
    WHERE c.is_group = true AND (c.participant_a IS NOT NULL OR c.participant_b IS NOT NULL)
      AND NOT EXISTS (SELECT 1 FROM conversation_members cm WHERE cm.conversation_id = c.id)
    ON CONFLICT DO NOTHING`);

  // Drop old foreign key constraints on participant_a, participant_b, recipient_id
  // that used ON DELETE CASCADE and replace with ON DELETE SET NULL.
  await client.query(`DO $$ DECLARE r record; BEGIN
    FOR r IN SELECT conname, conrelid::regclass AS tab FROM pg_constraint
      WHERE contype = 'f' AND conrelid IN ('conversations'::regclass, 'messages'::regclass)
      AND conkey && ARRAY[
        (SELECT attnum FROM pg_attribute WHERE attrelid=conrelid AND attname=CASE WHEN conrelid='messages'::regclass THEN 'recipient_id' ELSE 'participant_a' END),
        (SELECT attnum FROM pg_attribute WHERE attrelid=conrelid AND attname=CASE WHEN conrelid='messages'::regclass THEN 'recipient_id' ELSE 'participant_b' END)
      ]::smallint[]
    LOOP
      EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', r.tab, r.conname);
    END LOOP;
  END $$`);

  await client.query(`ALTER TABLE conversations ALTER COLUMN participant_a DROP NOT NULL, ALTER COLUMN participant_b DROP NOT NULL`);
  await client.query(`ALTER TABLE messages ALTER COLUMN recipient_id DROP NOT NULL`);

  await client.query(`ALTER TABLE conversations
    ADD CONSTRAINT conversations_participant_a_users_id_fk FOREIGN KEY (participant_a) REFERENCES users(id) ON DELETE SET NULL,
    ADD CONSTRAINT conversations_participant_b_users_id_fk FOREIGN KEY (participant_b) REFERENCES users(id) ON DELETE SET NULL`);

  await client.query(`ALTER TABLE messages
    ADD CONSTRAINT messages_recipient_id_users_id_fk FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE SET NULL`);

  await client.query(`DO $$ DECLARE r record; BEGIN
    FOR r IN SELECT conname FROM pg_constraint WHERE contype = 'f' AND conrelid = 'messages'::regclass
      AND conkey && ARRAY[
        (SELECT attnum FROM pg_attribute WHERE attrelid='messages'::regclass AND attname='reply_to_id'),
        (SELECT attnum FROM pg_attribute WHERE attrelid='messages'::regclass AND attname='forwarded_from_id')
      ]::smallint[]
    LOOP
      EXECUTE format('ALTER TABLE messages DROP CONSTRAINT %I', r.conname);
    END LOOP;
  END $$`);

  await client.query(`ALTER TABLE messages
    ADD CONSTRAINT messages_reply_to_id_messages_id_fk FOREIGN KEY (reply_to_id) REFERENCES messages(id) ON DELETE SET NULL,
    ADD CONSTRAINT messages_forwarded_from_id_messages_id_fk FOREIGN KEY (forwarded_from_id) REFERENCES messages(id) ON DELETE SET NULL`);

  await client.query(`UPDATE conversations SET participant_a = NULL, participant_b = NULL WHERE is_group = true`);
  await client.query(`UPDATE messages m SET recipient_id = NULL FROM conversations c WHERE m.conversation_id = c.id AND c.is_group = true`);

  await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS conversations_direct_pair_unique ON conversations
    (least(participant_a, participant_b), greatest(participant_a, participant_b))
    WHERE coalesce(is_group, false) = false AND participant_a IS NOT NULL AND participant_b IS NOT NULL`);

  await client.query(`CREATE INDEX IF NOT EXISTS messages_current_conversation_idx ON messages(conversation_id, created_at, id) WHERE deleted_at IS NULL`);
  await client.query(`INSERT INTO release_schema_versions(version) VALUES('20261009-message-integrity-1') ON CONFLICT DO NOTHING`);
}
