export const ELIGIBILITY_SCHEMA_VERSION = '20261007-eligibility-1';

/** The release runner owns the transaction. No legacy attestation becomes proof. */
export async function migrateEligibility(client) {
  await client.query(`CREATE TABLE IF NOT EXISTS eligibility_assessments (
    id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','verified','expired','revoked','rejected')),
    issuer text NOT NULL, country text NOT NULL CHECK(country ~ '^[A-Z]{2}$'), policy_version text NOT NULL,
    thresholds jsonb NOT NULL DEFAULT '{}', evidence_reference text, verified_at timestamptz,
    expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
    CHECK(status<>'verified' OR (verified_at IS NOT NULL AND evidence_reference IS NOT NULL AND thresholds <> '{}'::jsonb))
  )`);
  await client.query('CREATE INDEX IF NOT EXISTS eligibility_assessments_user_idx ON eligibility_assessments(user_id,status,expires_at)');
  await client.query('ALTER TABLE eligibility_assessments ADD COLUMN IF NOT EXISTS is_current boolean NOT NULL DEFAULT false');
  await client.query(`UPDATE eligibility_assessments a SET is_current=true WHERE id IN (
    SELECT DISTINCT ON(user_id) id FROM eligibility_assessments WHERE NOT EXISTS (
      SELECT 1 FROM eligibility_assessments c WHERE c.user_id=eligibility_assessments.user_id AND c.is_current)
    ORDER BY user_id,created_at DESC,id DESC)`);
  await client.query('CREATE UNIQUE INDEX IF NOT EXISTS eligibility_assessments_current_idx ON eligibility_assessments(user_id) WHERE is_current');
  await client.query(`CREATE TABLE IF NOT EXISTS guardian_authorizations (
    id uuid PRIMARY KEY, child_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    guardian_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','verified','withdrawn','revoked','rejected')),
    parental_responsibility_verified boolean NOT NULL DEFAULT false, issuer text NOT NULL, evidence_reference text,
    purposes jsonb NOT NULL DEFAULT '[]', notice_version text NOT NULL, policy_version text NOT NULL,
    expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), withdrawn_at timestamptz,
    CHECK(child_id<>guardian_id), CHECK(status<>'verified' OR (parental_responsibility_verified AND evidence_reference IS NOT NULL))
  )`);
  await client.query('CREATE INDEX IF NOT EXISTS guardian_authorizations_child_idx ON guardian_authorizations(child_id,status)');
  await client.query(`CREATE TABLE IF NOT EXISTS eligibility_challenges (
    id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    kind text NOT NULL CHECK(kind IN ('age','guardian')), country text NOT NULL CHECK(country ~ '^[A-Z]{2}$'),
    policy_version text NOT NULL, guardian_authorization_id uuid REFERENCES guardian_authorizations(id) ON DELETE CASCADE,
    status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','consumed','rejected','expired')),
    nonce_hash text NOT NULL, issuer text NOT NULL, expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
    CHECK((kind='guardian')=(guardian_authorization_id IS NOT NULL))
  )`);
  await client.query('ALTER TABLE eligibility_challenges ADD COLUMN IF NOT EXISTS result_hash text');
  await client.query('INSERT INTO release_schema_versions(version) VALUES($1) ON CONFLICT DO NOTHING', [ELIGIBILITY_SCHEMA_VERSION]);
}
