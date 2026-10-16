/** Additive: preserve the surviving legacy acknowledgement, never invent history. */
export async function migrateTermsHistory(client) {
  await client.query(`CREATE TABLE IF NOT EXISTS user_terms_acceptances (
    id uuid PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    terms_version text NOT NULL,
    accepted_at timestamptz NOT NULL,
    source text NOT NULL CONSTRAINT user_terms_acceptances_source_check
      CHECK (source IN ('registration','reacceptance','legacy_snapshot'))
  )`);
  await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS user_terms_acceptances_version_idx
    ON user_terms_acceptances(user_id,terms_version)`);
  await client.query(`CREATE INDEX IF NOT EXISTS user_terms_acceptances_archive_idx ON user_terms_acceptances(user_id,id)`);
  await client.query(`INSERT INTO user_terms_acceptances(id,user_id,terms_version,accepted_at,source)
    SELECT gen_random_uuid(),id,terms_version,CASE
      WHEN pg_typeof(terms_accepted_at)='timestamp without time zone'::regtype
        THEN terms_accepted_at::timestamp AT TIME ZONE 'UTC'
      ELSE terms_accepted_at::timestamptz END,'legacy_snapshot'
    FROM users WHERE terms_version IS NOT NULL AND terms_accepted_at IS NOT NULL
    ON CONFLICT(user_id,terms_version) DO NOTHING`);
}
