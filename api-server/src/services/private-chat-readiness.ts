import { db } from '@workspace/db';
import { sql, type SQL } from 'drizzle-orm';

export const REQUIRED_PRIVATE_CHAT_SCHEMA_VERSION = '20261020-private-chat-1';
type SchemaQuery = (statement: SQL) => Promise<{ rows: Record<string, unknown>[] }>;

/** Read-only deployment check. A connection alone does not establish a usable relay. */
export async function assertPrivateChatSchema(query: SchemaQuery = statement => db.execute(statement)): Promise<void> {
  // Resolve every column used by the relay and check the runtime role can read
  // them, without reading a key, participant or encrypted message.
  await query(sql`SELECT i.user_id, i.public_key, i.fingerprint, i.created_at,
    t.id, t.user_a_id, t.user_b_id, t.created_at, t.updated_at,
    e.id, e.thread_id, e.sender_id, e.ciphertext, e.created_at
    FROM private_chat_identities i, private_chat_threads t, private_chat_envelopes e WHERE false`);

  // pg_trigger.tgtype: ROW (1) | BEFORE (2) | UPDATE (16) = 19;
  // ROW (1) | BEFORE (2) | INSERT (4) = 7. Replica-only triggers do not
  // protect normal application writes, so only O (origin) / A (always) count.
  const result = await query(sql`SELECT
    EXISTS (SELECT 1 FROM release_schema_versions WHERE version = ${REQUIRED_PRIVATE_CHAT_SCHEMA_VERSION})
    AND NOT EXISTS (
      SELECT 1 FROM (VALUES
        ('private_chat_identities', 'private_chat_identity_immutable', 19),
        ('private_chat_threads', 'private_chat_members_immutable', 19),
        ('private_chat_envelopes', 'private_chat_envelope_immutable', 19),
        ('private_chat_envelopes', 'private_chat_envelope_sender', 7)
      ) AS required(relation_name, trigger_name, trigger_type)
      WHERE NOT EXISTS (SELECT 1 FROM pg_trigger t
        WHERE t.tgrelid = to_regclass(required.relation_name) AND t.tgname = required.trigger_name
        AND t.tgtype = required.trigger_type AND t.tgenabled IN ('O', 'A') AND NOT t.tgisinternal)
    )
    AND NOT EXISTS (
      SELECT 1 FROM (VALUES
        ('private_chat_identities', 'private_chat_identity_valid_check'),
        ('private_chat_threads', 'private_chat_thread_pair_check'),
        ('private_chat_envelopes', 'private_chat_envelope_valid_check')
      ) AS required(relation_name, constraint_name)
      WHERE NOT EXISTS (SELECT 1 FROM pg_constraint c
        WHERE c.conrelid = to_regclass(required.relation_name) AND c.conname = required.constraint_name
        AND c.contype = 'c' AND c.convalidated)
    )
    AND NOT EXISTS (
      SELECT 1 FROM (VALUES
        ('private_chat_identities', 'private_chat_identity_fingerprint_idx', true),
        ('private_chat_threads', 'private_chat_thread_pair_idx', true),
        ('private_chat_threads', 'private_chat_thread_recipient_idx', false),
        ('private_chat_envelopes', 'private_chat_envelope_page_idx', false)
      ) AS required(relation_name, index_name, is_unique)
      WHERE NOT EXISTS (SELECT 1 FROM pg_index i
        WHERE i.indrelid = to_regclass(required.relation_name) AND i.indexrelid = to_regclass(required.index_name)
        AND i.indisvalid AND i.indisready AND i.indisunique = required.is_unique)
    ) AS ready`);
  if (result.rows[0]?.ready !== true) throw new Error('Private-chat schema migration is incomplete');
}
