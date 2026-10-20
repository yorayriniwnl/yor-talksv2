import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const PRIVACY_RETENTION_SCHEMA_VERSION = '20261019-privacy-retention-1';

/** Additive privacy rights, retention controls, deletion journal, and email suppression migration. */
export async function migratePrivacyRetention(client) {
  // 1. Deletion journal for durable replay and historical recovery audit
  await client.query(`CREATE TABLE IF NOT EXISTS deletion_journal (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id uuid NOT NULL,
    stable_identity_digest text NOT NULL,
    reason text NOT NULL DEFAULT 'user_request',
    status text NOT NULL DEFAULT 'erased' CHECK (status IN ('erased', 'replayed')),
    erased_at timestamptz NOT NULL DEFAULT now(),
    replayed_at timestamptz,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb
  )`);
  await client.query(`CREATE INDEX IF NOT EXISTS deletion_journal_account_id_idx ON deletion_journal(account_id)`);
  await client.query(`CREATE INDEX IF NOT EXISTS deletion_journal_digest_idx ON deletion_journal(stable_identity_digest)`);
  await client.query(`CREATE INDEX IF NOT EXISTS deletion_journal_erased_at_idx ON deletion_journal(erased_at)`);

  // 2. Privacy rights requests (correction, restriction, objection, erasure, access)
  await client.query(`CREATE TABLE IF NOT EXISTS privacy_rights_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    request_type text NOT NULL CHECK (request_type IN ('correction', 'restriction', 'objection', 'erasure', 'access')),
    subject_id uuid REFERENCES users(id) ON DELETE SET NULL,
    email_hash text NOT NULL,
    status text NOT NULL DEFAULT 'pending_verification' CHECK (status IN ('pending_verification', 'verified', 'completed', 'rejected', 'expired')),
    verification_token_hash text,
    verification_expires_at timestamptz,
    verified_at timestamptz,
    completed_at timestamptz,
    details jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
  )`);
  await client.query(`CREATE INDEX IF NOT EXISTS privacy_rights_requests_email_hash_idx ON privacy_rights_requests(email_hash)`);
  await client.query(`CREATE INDEX IF NOT EXISTS privacy_rights_requests_status_idx ON privacy_rights_requests(status, created_at)`);

  // 3. Purpose and version-aware consent records
  await client.query(`CREATE TABLE IF NOT EXISTS consent_records (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id uuid REFERENCES users(id) ON DELETE CASCADE,
    subject_digest text,
    purpose text NOT NULL,
    version text NOT NULL,
    granted boolean NOT NULL,
    granted_at timestamptz NOT NULL DEFAULT now(),
    withdrawn_at timestamptz,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb
  )`);
  await client.query(`CREATE INDEX IF NOT EXISTS consent_records_subject_idx ON consent_records(subject_id, purpose)`);
  await client.query(`CREATE INDEX IF NOT EXISTS consent_records_digest_idx ON consent_records(subject_digest, purpose)`);

  // 4. Email suppressions
  await client.query(`CREATE TABLE IF NOT EXISTS email_suppressions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email_hash text NOT NULL,
    purpose text NOT NULL,
    reason text NOT NULL,
    suppressed_at timestamptz NOT NULL DEFAULT now(),
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb
  )`);
  await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS email_suppressions_hash_purpose_idx ON email_suppressions(email_hash, purpose)`);

  // 5. User processing restriction fields
  await client.query(`ALTER TABLE users
    ADD COLUMN IF NOT EXISTS processing_restricted boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS restriction_reason text,
    ADD COLUMN IF NOT EXISTS restricted_at timestamptz`);

  // 6. Preregistrations unsubscribe field
  await client.query(`ALTER TABLE preregistrations
    ADD COLUMN IF NOT EXISTS unsubscribed_at timestamptz`);

  // 7. Backfill consent records from existing preregistrations if present
  await client.query(`INSERT INTO consent_records (id, subject_digest, purpose, version, granted, granted_at, metadata)
    SELECT gen_random_uuid(), encode(sha256(lower(email)::bytea), 'hex'), 'launch_updates', 'preregister_v1', true, launch_updates_consented_at,
      jsonb_build_object('source', 'preregistration_backfill')
    FROM preregistrations
    WHERE launch_updates_consented_at IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM consent_records
        WHERE subject_digest = encode(sha256(lower(preregistrations.email)::bytea), 'hex')
          AND purpose = 'launch_updates'
      )`);

  // 8. Disaster recovery replay audit log
  await client.query(`CREATE TABLE IF NOT EXISTS recovery_replay_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    journal_id text NOT NULL,
    through text NOT NULL,
    replayed_accounts integer NOT NULL,
    completed_at timestamptz NOT NULL DEFAULT now()
  )`);
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL must be set explicitly');
  const require = createRequire(new URL('../package.json', import.meta.url));
  const { Client } = require('pg');
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DB_SSL === 'true'
      ? { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' }
      : undefined,
  });
  await client.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT pg_advisory_xact_lock(hashtext('yor_privacy_retention_schema'))");
    await migratePrivacyRetention(client);
    await client.query('COMMIT');
    console.log('[privacy-retention migration] Complete');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error('[privacy-retention migration] Failed:', err.message);
    process.exitCode = 1;
  });
}
