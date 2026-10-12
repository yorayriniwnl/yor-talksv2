export const CONTACT_SCHEMA_VERSION = '20261007-contact-authority-1';
export async function migrateContacts(client) {
  await client.query('BEGIN');
  try {
    await client.query(`CREATE TABLE IF NOT EXISTS contact_authorities (
      id uuid PRIMARY KEY,user_a_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      user_b_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,requested_by uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status text NOT NULL DEFAULT 'pending',policy_versions jsonb NOT NULL DEFAULT '{}',recipient_accepted_at timestamptz,
      accepted_at timestamptz,revoked_at timestamptz,created_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT contact_authority_pair_order CHECK(user_a_id<user_b_id),
      CONSTRAINT contact_authority_requester CHECK(requested_by IN(user_a_id,user_b_id)),
      CONSTRAINT contact_authority_status CHECK(status IN('pending','accepted','rejected','revoked'))
    )`);
    await client.query('CREATE UNIQUE INDEX IF NOT EXISTS contact_authority_pair_idx ON contact_authorities(user_a_id,user_b_id)');
    await client.query(`CREATE TABLE IF NOT EXISTS contact_guardian_approvals (
      contact_id uuid NOT NULL REFERENCES contact_authorities(id) ON DELETE CASCADE,
      child_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,guardian_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      authorization_id uuid NOT NULL REFERENCES guardian_authorizations(id) ON DELETE CASCADE,
      approved_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(contact_id,child_id)
    )`);
    await client.query(`CREATE TABLE IF NOT EXISTS group_invitations (
      id uuid PRIMARY KEY,conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      invitee_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,invited_by uuid REFERENCES users(id) ON DELETE SET NULL,
      status text NOT NULL DEFAULT 'pending',created_at timestamptz NOT NULL DEFAULT now(),accepted_at timestamptz,
      CONSTRAINT group_invitation_status CHECK(status IN('pending','accepted','rejected','revoked'))
    )`);
    await client.query('CREATE UNIQUE INDEX IF NOT EXISTS group_invitation_pair_idx ON group_invitations(conversation_id,invitee_id)');
    await client.query('CREATE INDEX IF NOT EXISTS group_invitation_owner_idx ON group_invitations(invitee_id,status)');
    // Old follows, conversations and membership never become accepted contact
    // or invitation evidence. Existing users explicitly establish authority.
    await client.query('INSERT INTO release_schema_versions(version) VALUES($1) ON CONFLICT DO NOTHING', [CONTACT_SCHEMA_VERSION]);
    await client.query('COMMIT');
  } catch (error) { await client.query('ROLLBACK'); throw error; }
}
