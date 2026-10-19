import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

/** Additive migration. The release runner supplies the surrounding transaction. */
export async function migratePreregister(client) {
  await client.query(`CREATE TABLE IF NOT EXISTS preregistrations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email text NOT NULL UNIQUE,
    username text NOT NULL UNIQUE,
    perks jsonb NOT NULL DEFAULT '[]'::jsonb,
    referral_code text UNIQUE,
    referred_by text,
    launch_updates_consented_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
  )`);
  await client.query(`ALTER TABLE preregistrations
    ADD COLUMN IF NOT EXISTS perks jsonb NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS referral_code text,
    ADD COLUMN IF NOT EXISTS referred_by text,
    ADD COLUMN IF NOT EXISTS launch_updates_consented_at timestamptz`);
  // Never invent opt-in timestamps for registrations made by an older client.
  // Drizzle's original table used a UTC timestamp without an explicit zone.
  await client.query(`DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
      WHERE table_schema=current_schema() AND table_name='preregistrations'
        AND column_name='created_at' AND data_type='timestamp without time zone') THEN
      ALTER TABLE preregistrations ALTER COLUMN created_at TYPE timestamptz
        USING created_at AT TIME ZONE 'UTC';
    END IF;
  END $$`);
  await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS preregistrations_email_casefold_unique_idx
    ON preregistrations (lower(email))`);
  await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS preregistrations_username_casefold_unique_idx
    ON preregistrations (lower(username))`);
  await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS preregistrations_referral_code_unique_idx
    ON preregistrations (referral_code) WHERE referral_code IS NOT NULL`);
  await client.query(`CREATE INDEX IF NOT EXISTS preregistrations_created_at_idx ON preregistrations (created_at)`);
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL must be set explicitly');
  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DB_SSL === 'true'
      ? { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' }
      : undefined,
  });
  await client.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT pg_advisory_xact_lock(hashtext('yor_preregistration_schema'))");
    await migratePreregister(client);
    await client.query('COMMIT');
    console.log('[preregistration migration] Complete');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(() => {
    // SQL errors may contain existing email addresses in constraint details.
    console.error('[preregistration migration] Failed; check database connectivity and schema constraints');
    process.exitCode = 1;
  });
}
