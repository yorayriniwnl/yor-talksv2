/** Additive private authority; caller owns the release transaction and advisory lock. */
export async function migrateEligibility(client) {
  await client.query(`CREATE OR REPLACE FUNCTION eligibility_valid_thresholds(value jsonb) RETURNS boolean
    LANGUAGE plpgsql IMMUTABLE AS $$
    DECLARE item jsonb; seen integer[] := '{}'; threshold integer;
    BEGIN
      IF jsonb_typeof(value) <> 'array' OR jsonb_array_length(value)>6 THEN RETURN false; END IF;
      FOR item IN SELECT * FROM jsonb_array_elements(value) LOOP
        IF jsonb_typeof(item)<>'object' OR (SELECT count(*) FROM jsonb_object_keys(item))<>2
          OR NOT (item ? 'age' AND item ? 'atLeast') OR jsonb_typeof(item->'age')<>'number'
          OR (item->>'age') !~ '^(13|14|15|16|17|18)$' OR jsonb_typeof(item->'atLeast')<>'boolean'
          THEN RETURN false; END IF;
        threshold := (item->>'age')::integer;
        IF threshold=ANY(seen) THEN RETURN false; END IF;
        seen := array_append(seen,threshold);
      END LOOP;
      RETURN true;
    END $$`);
  await client.query(`CREATE OR REPLACE FUNCTION eligibility_valid_versions(value jsonb) RETURNS boolean
    LANGUAGE plpgsql IMMUTABLE AS $$
    DECLARE entry record;
    BEGIN
      IF jsonb_typeof(value)<>'object' OR (SELECT count(*) FROM jsonb_object_keys(value))>32 THEN RETURN false; END IF;
      FOR entry IN SELECT * FROM jsonb_each(value) LOOP
        IF length(entry.key) NOT BETWEEN 1 AND 128 OR jsonb_typeof(entry.value)<>'string'
          OR length(entry.value #>> '{}') NOT BETWEEN 1 AND 128 THEN RETURN false; END IF;
      END LOOP;
      RETURN true;
    END $$`);
  await client.query(`CREATE OR REPLACE FUNCTION eligibility_valid_purposes(value jsonb, allow_empty boolean) RETURNS boolean
    LANGUAGE plpgsql IMMUTABLE AS $$
    DECLARE item jsonb; seen text[] := '{}'; purpose text;
    BEGIN
      IF jsonb_typeof(value)<>'array' OR jsonb_array_length(value)>3
        OR (NOT allow_empty AND jsonb_array_length(value)=0) THEN RETURN false; END IF;
      FOR item IN SELECT * FROM jsonb_array_elements(value) LOOP
        purpose := item #>> '{}';
        IF jsonb_typeof(item)<>'string' OR purpose NOT IN ('account_collection','account_activation','social_contact')
          OR purpose=ANY(seen) THEN RETURN false; END IF;
        seen := array_append(seen,purpose);
      END LOOP;
      RETURN true;
    END $$`);
  await client.query(`CREATE TABLE IF NOT EXISTS eligibility_enrollments (
    id uuid PRIMARY KEY, credential_hash text NOT NULL UNIQUE, requested_experience text NOT NULL,
    territory text NOT NULL, status text NOT NULL DEFAULT 'pending', revision bigint NOT NULL DEFAULT 0,
    registration_nonce_hash text UNIQUE, bound_user_id uuid REFERENCES users(id) ON DELETE CASCADE,
    policy_versions jsonb NOT NULL DEFAULT '{}', notice_versions jsonb NOT NULL DEFAULT '{}',
    authorized_at timestamptz, consumed_at timestamptz, expires_at timestamptz NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  )`);
  await client.query(`CREATE TABLE IF NOT EXISTS eligibility_revisions (
    user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, revision bigint NOT NULL DEFAULT 0,
    updated_at timestamptz NOT NULL DEFAULT now()
  )`);
  await client.query(`CREATE TABLE IF NOT EXISTS eligibility_assessments (
    id uuid PRIMARY KEY, user_id uuid REFERENCES users(id) ON DELETE CASCADE,
    enrollment_id uuid REFERENCES eligibility_enrollments(id) ON DELETE CASCADE,
    status text NOT NULL, issuer text NOT NULL, method text NOT NULL, subject_revision bigint NOT NULL DEFAULT 0, experience text NOT NULL,
    threshold_assertions jsonb NOT NULL DEFAULT '[]', territory text NOT NULL,
    policy_versions jsonb NOT NULL DEFAULT '{}', verified_at timestamptz, expires_at timestamptz NOT NULL,
    evidence_reference text, created_at timestamptz NOT NULL DEFAULT now()
  )`);
  await client.query('ALTER TABLE eligibility_assessments ADD COLUMN IF NOT EXISTS subject_revision bigint NOT NULL DEFAULT 0');
  await client.query(`CREATE TABLE IF NOT EXISTS eligibility_challenges (
    id uuid PRIMARY KEY, user_id uuid REFERENCES users(id) ON DELETE CASCADE,
    enrollment_id uuid REFERENCES eligibility_enrollments(id) ON DELETE CASCADE,
    issuer text NOT NULL, audience text NOT NULL, purpose text NOT NULL, nonce_hash text NOT NULL UNIQUE,
    subject_revision bigint NOT NULL, policy_versions jsonb NOT NULL DEFAULT '{}',
    notice_versions jsonb NOT NULL DEFAULT '{}', requested_purposes jsonb NOT NULL DEFAULT '[]',
    status text NOT NULL DEFAULT 'pending', consumed_event_id text, consumed_at timestamptz,
    expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
  )`);
  await client.query(`CREATE TABLE IF NOT EXISTS guardian_authorizations (
    id uuid PRIMARY KEY, user_id uuid REFERENCES users(id) ON DELETE CASCADE,
    enrollment_id uuid REFERENCES eligibility_enrollments(id) ON DELETE CASCADE,
    guardian_user_id uuid REFERENCES users(id) ON DELETE CASCADE, guardian_reference text NOT NULL,
    issuer text NOT NULL, responsibility_reference text NOT NULL, status text NOT NULL DEFAULT 'granted',
    subject_revision bigint NOT NULL DEFAULT 0, purposes jsonb NOT NULL, notice_versions jsonb NOT NULL, policy_versions jsonb NOT NULL,
    verified_at timestamptz NOT NULL, granted_at timestamptz NOT NULL, expires_at timestamptz NOT NULL,
    withdrawn_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
  )`);
  await client.query('ALTER TABLE eligibility_challenges ADD COLUMN IF NOT EXISTS territory text');
  await client.query('ALTER TABLE eligibility_challenges ADD COLUMN IF NOT EXISTS policy_fingerprint text');
  await client.query('ALTER TABLE guardian_authorizations ADD COLUMN IF NOT EXISTS subject_revision bigint NOT NULL DEFAULT 0');
  const subject = '(user_id IS NOT NULL)::integer + (enrollment_id IS NOT NULL)::integer = 1';
  const checks = {
    eligibility_enrollments: {
      timestamps: 'expires_at>created_at AND (authorized_at IS NULL OR authorized_at>=created_at AND authorized_at<expires_at) AND (consumed_at IS NULL OR consumed_at>=authorized_at AND consumed_at<expires_at)',
      valid: `credential_hash ~ '^[a-f0-9]{64}$' AND (registration_nonce_hash IS NULL OR registration_nonce_hash ~ '^[a-f0-9]{64}$')
        AND requested_experience IN ('under_13','teen_13_17','adult_18_plus') AND territory ~ '^[A-Z]{2}$' AND revision>=0
        AND status IN ('pending','authorized','consumed','revoked','expired') AND expires_at>created_at
        AND eligibility_valid_versions(policy_versions) AND eligibility_valid_versions(notice_versions)
        AND (status NOT IN ('authorized','consumed') OR (authorized_at IS NOT NULL AND registration_nonce_hash IS NOT NULL))
        AND (status<>'consumed' OR (bound_user_id IS NOT NULL AND consumed_at IS NOT NULL AND consumed_at>=authorized_at))
        AND (status='consumed' OR (bound_user_id IS NULL AND consumed_at IS NULL))`,
    },
    eligibility_revisions: { valid: 'revision>=0' },
    eligibility_assessments: {
      subject,
      revision: 'subject_revision>=0',
      valid: `status IN ('pending','verified','expired','revoked','rejected')
        AND experience IN ('unknown','under_13','teen_13_17','adult_18_plus') AND territory ~ '^[A-Z]{2}$'
        AND length(issuer) BETWEEN 1 AND 128 AND length(method) BETWEEN 1 AND 128
        AND eligibility_valid_thresholds(threshold_assertions) AND eligibility_valid_versions(policy_versions)
        AND (evidence_reference IS NULL OR length(evidence_reference) BETWEEN 1 AND 256)
        AND (verified_at IS NULL OR expires_at>verified_at)
        AND (status<>'verified' OR (verified_at IS NOT NULL AND experience<>'unknown' AND evidence_reference IS NOT NULL AND policy_versions<>'{}'::jsonb))`,
    },
    eligibility_challenges: {
      policy_binding: "(territory IS NULL AND policy_fingerprint IS NULL) OR (territory IS NOT NULL AND policy_fingerprint IS NOT NULL AND territory ~ '^[A-Z]{2}$' AND policy_fingerprint ~ '^[a-f0-9]{64}$')",
      subject,
      timestamps: 'expires_at>created_at AND (consumed_at IS NULL OR consumed_at>=created_at AND consumed_at<expires_at)',
      valid: `length(issuer) BETWEEN 1 AND 128 AND length(audience) BETWEEN 1 AND 128
        AND purpose IN ('age_assessment','guardian_authorization') AND nonce_hash ~ '^[a-f0-9]{64}$' AND subject_revision>=0
        AND status IN ('pending','consumed','revoked','expired')
        AND eligibility_valid_versions(policy_versions) AND policy_versions<>'{}'::jsonb
        AND eligibility_valid_versions(notice_versions) AND eligibility_valid_purposes(requested_purposes,true)
        AND (status<>'consumed' OR (consumed_at IS NOT NULL AND consumed_event_id IS NOT NULL AND length(consumed_event_id) BETWEEN 1 AND 256))
        AND (status='consumed' OR (consumed_at IS NULL AND consumed_event_id IS NULL))`,
    },
    guardian_authorizations: {
      subject,
      revision: 'subject_revision>=0',
      valid: `length(guardian_reference) BETWEEN 1 AND 256 AND length(issuer) BETWEEN 1 AND 128
        AND length(responsibility_reference) BETWEEN 1 AND 256 AND status IN ('granted','withdrawn','revoked')
        AND eligibility_valid_purposes(purposes,false) AND eligibility_valid_versions(notice_versions)
        AND eligibility_valid_versions(policy_versions) AND policy_versions<>'{}'::jsonb
        AND expires_at>verified_at AND granted_at>=verified_at AND expires_at>granted_at
        AND (status='granted' AND withdrawn_at IS NULL OR status<>'granted' AND withdrawn_at IS NOT NULL AND withdrawn_at>=granted_at)
        AND (NOT (purposes ? 'account_collection') OR notice_versions ? 'account_collection')
        AND (NOT (purposes ? 'account_activation') OR notice_versions ? 'account_activation')
        AND (NOT (purposes ? 'social_contact') OR notice_versions ? 'social_contact')`,
    },
  };
  for (const [table, constraints] of Object.entries(checks)) for (const [suffix, expression] of Object.entries(constraints)) {
    const name = `${table}_${suffix}`;
    const exists = await client.query('SELECT 1 FROM pg_constraint WHERE conrelid=$1::regclass AND conname=$2', [table, name]);
    if (!exists.rowCount) await client.query(`ALTER TABLE ${table} ADD CONSTRAINT ${name} CHECK (${expression})`);
  }
  const indexes = [
    'CREATE INDEX IF NOT EXISTS eligibility_enrollments_expiry_idx ON eligibility_enrollments(status,expires_at)',
    'CREATE INDEX IF NOT EXISTS eligibility_assessments_user_idx ON eligibility_assessments(user_id,created_at)',
    'CREATE INDEX IF NOT EXISTS eligibility_assessments_enrollment_idx ON eligibility_assessments(enrollment_id,created_at)',
    'CREATE INDEX IF NOT EXISTS eligibility_assessments_expiry_idx ON eligibility_assessments(status,expires_at)',
    'CREATE UNIQUE INDEX IF NOT EXISTS eligibility_challenges_event_idx ON eligibility_challenges(issuer,consumed_event_id)',
    'CREATE INDEX IF NOT EXISTS eligibility_challenges_user_idx ON eligibility_challenges(user_id,status,expires_at)',
    'CREATE INDEX IF NOT EXISTS eligibility_challenges_enrollment_idx ON eligibility_challenges(enrollment_id,status,expires_at)',
    'CREATE INDEX IF NOT EXISTS guardian_authorizations_user_idx ON guardian_authorizations(user_id,status,expires_at)',
    'CREATE INDEX IF NOT EXISTS guardian_authorizations_enrollment_idx ON guardian_authorizations(enrollment_id,status,expires_at)',
    'CREATE INDEX IF NOT EXISTS guardian_authorizations_guardian_idx ON guardian_authorizations(guardian_user_id,status)',
  ];
  for (const statement of indexes) await client.query(statement);
}
