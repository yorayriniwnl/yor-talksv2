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
  await client.query(`CREATE TABLE IF NOT EXISTS contact_authorizations (
    id uuid PRIMARY KEY, user_a_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_b_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    initiator_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    state text NOT NULL DEFAULT 'pending', guardian_required_user_ids jsonb NOT NULL DEFAULT '[]', policy_versions jsonb NOT NULL,
    initiator_accepted_at timestamptz NOT NULL, recipient_accepted_at timestamptz,
    rejected_at timestamptz, revoked_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT contact_authorizations_pair_valid CHECK (user_a_id < user_b_id AND initiator_id IN (user_a_id,user_b_id)),
    CONSTRAINT contact_authorizations_state_valid CHECK (state IN ('pending','accepted','rejected','revoked')
      AND (state <> 'accepted' OR recipient_accepted_at IS NOT NULL)
      AND (state <> 'rejected' OR rejected_at IS NOT NULL)
      AND (state <> 'revoked' OR revoked_at IS NOT NULL)
      AND jsonb_typeof(guardian_required_user_ids)='array' AND jsonb_typeof(policy_versions)='object')
  )`);
  await client.query(`CREATE TABLE IF NOT EXISTS contact_authorization_approvals (
    id uuid PRIMARY KEY, contact_authorization_id uuid NOT NULL REFERENCES contact_authorizations(id) ON DELETE CASCADE,
    child_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    guardian_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    guardian_authorization_id uuid NOT NULL REFERENCES guardian_authorizations(id) ON DELETE CASCADE,
    approved_at timestamptz NOT NULL DEFAULT now(), policy_versions jsonb NOT NULL,
    CONSTRAINT contact_authorization_approvals_policy_valid CHECK (jsonb_typeof(policy_versions)='object')
  )`);
  await client.query(`CREATE TABLE IF NOT EXISTS conversation_invitations (
    id uuid PRIMARY KEY, conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    inviter_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    invitee_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    state text NOT NULL DEFAULT 'pending', member_ids_at_invite jsonb NOT NULL,
    guardian_required_user_ids jsonb NOT NULL DEFAULT '[]', policy_versions jsonb NOT NULL,
    recipient_accepted_at timestamptz, rejected_at timestamptz, revoked_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT conversation_invitations_valid CHECK (state IN ('pending','accepted','rejected','revoked')
      AND inviter_id <> invitee_id AND jsonb_typeof(member_ids_at_invite)='array'
      AND jsonb_typeof(guardian_required_user_ids)='array' AND jsonb_typeof(policy_versions)='object'
      AND (state <> 'accepted' OR recipient_accepted_at IS NOT NULL)
      AND (state <> 'rejected' OR rejected_at IS NOT NULL)
      AND (state <> 'revoked' OR revoked_at IS NOT NULL))
  )`);
  await client.query(`CREATE TABLE IF NOT EXISTS conversation_invitation_approvals (
    id uuid PRIMARY KEY, invitation_id uuid NOT NULL REFERENCES conversation_invitations(id) ON DELETE CASCADE,
    child_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    guardian_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    guardian_authorization_id uuid NOT NULL REFERENCES guardian_authorizations(id) ON DELETE CASCADE,
    approved_at timestamptz NOT NULL DEFAULT now(), policy_versions jsonb NOT NULL,
    CONSTRAINT conversation_invitation_approvals_policy_valid CHECK (jsonb_typeof(policy_versions)='object')
  )`);
  await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS contact_authorizations_live_pair_idx
    ON contact_authorizations(user_a_id,user_b_id) WHERE state IN ('pending','accepted')`);
  await client.query('CREATE INDEX IF NOT EXISTS contact_authorizations_pair_idx ON contact_authorizations(user_a_id,user_b_id,created_at)');
  await client.query('CREATE INDEX IF NOT EXISTS contact_authorizations_initiator_idx ON contact_authorizations(initiator_id,state,created_at)');
  await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS contact_authorization_approvals_authority_idx
    ON contact_authorization_approvals(contact_authorization_id,guardian_authorization_id)`);
  await client.query('CREATE INDEX IF NOT EXISTS contact_authorization_approvals_child_idx ON contact_authorization_approvals(contact_authorization_id,child_user_id)');
  await client.query('CREATE INDEX IF NOT EXISTS contact_authorization_approvals_guardian_idx ON contact_authorization_approvals(guardian_user_id,approved_at)');
  await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS conversation_invitations_pending_idx
    ON conversation_invitations(conversation_id,invitee_id) WHERE state='pending'`);
  await client.query('CREATE INDEX IF NOT EXISTS conversation_invitations_recipient_idx ON conversation_invitations(invitee_id,state,created_at)');
  await client.query('CREATE INDEX IF NOT EXISTS conversation_invitations_conversation_idx ON conversation_invitations(conversation_id,state,created_at)');
  await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS conversation_invitation_approvals_authority_idx
    ON conversation_invitation_approvals(invitation_id,guardian_authorization_id)`);
  await client.query('CREATE INDEX IF NOT EXISTS conversation_invitation_approvals_child_idx ON conversation_invitation_approvals(invitation_id,child_user_id)');
  await client.query(`CREATE TABLE IF NOT EXISTS content_safety_classifications (
    id uuid PRIMARY KEY, entity_type text NOT NULL, entity_id uuid NOT NULL,
    content_revision text NOT NULL, content_hash text NOT NULL, classification text NOT NULL,
    issuer text NOT NULL, status text NOT NULL DEFAULT 'pending', policy_version text NOT NULL,
    approved_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT content_safety_classifications_valid CHECK (
      entity_type IN ('posts','stories','user_notes','videos','articles','communities','community_discussions','products','events','live_streams','broadcast_channels','broadcast_channel_messages','comments','video_comments','profile_comments')
      AND length(content_revision) BETWEEN 1 AND 256 AND length(content_hash)=64 AND content_hash !~ '[^a-f0-9]'
      AND classification IN ('child_safe','regular','mature') AND status IN ('pending','approved','rejected','revoked','superseded')
      AND length(issuer) BETWEEN 1 AND 128 AND length(policy_version) BETWEEN 1 AND 128
      AND ((status='approved' AND approved_at IS NOT NULL) OR (status IN ('revoked','superseded') AND approved_at IS NOT NULL)
        OR (status IN ('pending','rejected') AND approved_at IS NULL))
    )
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
    content_safety_classifications: {
      valid: `entity_type IN ('posts','stories','user_notes','videos','articles','communities','community_discussions','products','events','live_streams','broadcast_channels','broadcast_channel_messages','comments','video_comments','profile_comments')
        AND length(content_revision) BETWEEN 1 AND 256 AND length(content_hash)=64 AND content_hash !~ '[^a-f0-9]'
        AND classification IN ('child_safe','regular','mature') AND status IN ('pending','approved','rejected','revoked','superseded')
        AND length(issuer) BETWEEN 1 AND 128 AND length(policy_version) BETWEEN 1 AND 128
        AND ((status='approved' AND approved_at IS NOT NULL) OR (status IN ('revoked','superseded') AND approved_at IS NOT NULL)
          OR (status IN ('pending','rejected') AND approved_at IS NULL))`,
    },
  };
  for (const [table, constraints] of Object.entries(checks)) for (const [suffix, expression] of Object.entries(constraints)) {
    const name = `${table}_${suffix}`;
    const exists = await client.query('SELECT pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE conrelid=$1::regclass AND conname=$2', [table, name]);
    if (exists.rowCount && table === 'content_safety_classifications' && suffix === 'valid'
      && String(exists.rows[0].definition).includes("content_revision ~ '^.{1,256}$'")) {
      await client.query(`ALTER TABLE ${table} DROP CONSTRAINT ${name}`);
      exists.rowCount = 0;
    }
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
    'CREATE UNIQUE INDEX IF NOT EXISTS content_safety_classifications_revision_idx ON content_safety_classifications(entity_type,entity_id,content_revision,policy_version)',
    'CREATE INDEX IF NOT EXISTS content_safety_classifications_lookup_idx ON content_safety_classifications(entity_type,entity_id,status,policy_version)',
  ];
  for (const statement of indexes) await client.query(statement);
  await client.query(`CREATE OR REPLACE FUNCTION invalidate_content_safety_classification() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
    BEGIN
      UPDATE content_safety_classifications SET status='superseded'
        WHERE entity_type=TG_ARGV[0] AND entity_id=OLD.id AND status='approved';
      RETURN NEW;
    END $$`);
  const classificationInvalidationTriggers = {
    posts: ['posts', ['content','images','content_category','content_rating','audience','distribution_mode','post_type','tags','mentions']],
    stories: ['stories', ['media_url','type','text_content','background_gradient','story_font_id','story_text_style','content_category','content_rating']],
    user_notes: ['user_notes', ['content','content_category','content_rating','audience']],
    videos: ['videos', ['video_url','thumbnail_url','title','type','content_category','content_rating']],
    articles: ['articles', ['title','excerpt','content','cover_url','content_category','content_rating']],
    communities: ['communities', ['name','description','cover_url','rules','content_rating']],
    products: ['products', ['title','description','images','category','condition','content_rating']],
    events: ['events', ['title','description','cover_url','category','starts_at','location','content_rating']],
    live_streams: ['live_streams', ['title','cover_url','kind','category','starts_at','content_rating']],
    broadcast_channels: ['broadcast_channels', ['name','description','cover_url','content_category','content_rating']],
    broadcast_channel_messages: ['broadcast_channel_messages', ['content','content_category','content_rating']],
    comments: ['comments', ['content','media_url','media_type']],
    video_comments: ['video_comments', ['content','media_url','media_type']],
    profile_comments: ['profile_comments', ['content']],
  };
  for (const [table, [entityType, columns]] of Object.entries(classificationInvalidationTriggers)) {
    const triggerName = `content_safety_invalidate_${table}`;
    const exists = await client.query('SELECT 1 FROM pg_trigger WHERE tgname=$1 AND NOT tgisinternal', [triggerName]);
    if (!exists.rowCount) await client.query(`CREATE TRIGGER ${triggerName} AFTER UPDATE OF ${columns.map(column => `"${column}"`).join(',')}
      ON "${table}" FOR EACH ROW EXECUTE FUNCTION invalidate_content_safety_classification('${entityType}')`);
  }
}
