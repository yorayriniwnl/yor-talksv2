import { db } from '@workspace/db';
import { sql, type SQL } from 'drizzle-orm';

export const REQUIRED_PRIVACY_SCHEMA_VERSION = '20261022-privacy-retention-4';
type Query = (statement: SQL) => Promise<{ rows: Record<string, unknown>[] }>;

export async function assertPrivacySchema(query: Query = statement => db.execute(statement)): Promise<void> {
  await query(sql`SELECT content_purged_at FROM messages WHERE false`);
  await query(sql`SELECT j.id,j.account_id,j.stable_identity_digest,j.erased_at,
    p.id,p.email_hash,p.verification_token_hash,p.verification_expires_at,p.status,
    r.manifest_sha256,r.through,r.replayed_unbound FROM deletion_journal j,privacy_rights_requests p,recovery_replay_log r WHERE false`);
  const result = await query(sql`SELECT
    EXISTS(SELECT 1 FROM release_schema_versions WHERE version=${REQUIRED_PRIVACY_SCHEMA_VERSION})
    AND EXISTS(SELECT 1 FROM pg_index WHERE indexrelid=to_regclass('privacy_rights_requests_token_unique_idx')
      AND indisunique AND indisvalid AND indisready)
    AND EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid='deletion_journal'::regclass AND attname='account_id' AND NOT attnotnull)
    AND EXISTS(SELECT 1 FROM pg_index WHERE indexrelid=to_regclass('messages_purge_expired_idx') AND indisvalid AND indisready)
    AND EXISTS(SELECT 1 FROM pg_index WHERE indexrelid=to_regclass('messages_purge_deleted_idx') AND indisvalid AND indisready)
    AS ready`);
  if (result.rows[0]?.ready !== true) throw new Error('Privacy schema migration is incomplete');
}

export async function assertRecoveryReplay(config: { enabled: boolean; through: string; sha256: string },
  query: Query = statement => db.execute(statement)): Promise<void> {
  if (!config.enabled) return;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(config.through) || !/^[a-f0-9]{64}$/.test(config.sha256)) {
    throw new Error('An independent recovery checkpoint and manifest digest are required');
  }
  const result = await query(sql`SELECT 1 FROM recovery_replay_log
    WHERE through=${config.through} AND manifest_sha256=${config.sha256} LIMIT 1`);
  if (!result.rows.length) throw new Error('The approved recovery manifest has not been reconciled');
}
