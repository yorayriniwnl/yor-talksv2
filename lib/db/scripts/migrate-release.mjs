/** Additive release migrations, called under the production runner's advisory lock. */
export const RELEASE_SCHEMA_VERSION = '20260926-auth-1';

export async function migrateRelease(client) {
  await client.query('BEGIN');
  try {
    await client.query(`CREATE TABLE IF NOT EXISTS release_schema_versions (
      version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now()
    )`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_version integer NOT NULL DEFAULT 0`);
    await client.query(`CREATE TABLE IF NOT EXISTS password_reset_tokens (
      token_hash text PRIMARY KEY,
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      auth_version integer NOT NULL,
      expires_at timestamptz NOT NULL,
      consumed_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now()
    )`);
    await client.query('CREATE INDEX IF NOT EXISTS password_reset_expiry_idx ON password_reset_tokens(expires_at)');
    await client.query('INSERT INTO release_schema_versions(version) VALUES ($1) ON CONFLICT DO NOTHING', [RELEASE_SCHEMA_VERSION]);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}
