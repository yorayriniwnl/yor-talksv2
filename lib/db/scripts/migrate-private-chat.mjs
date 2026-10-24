/** Additive encrypted direct-chat storage. Invoke only via the reviewed release migration. */
export const PRIVATE_CHAT_SCHEMA_VERSION = '20261020-private-chat-1';

export async function migratePrivateChat(client) {
  await client.query(`CREATE TABLE IF NOT EXISTS private_chat_identities (
    user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    public_key text NOT NULL,
    fingerprint text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT private_chat_identity_valid_check CHECK (
      octet_length(public_key) BETWEEN 100 AND 65536
      AND fingerprint ~ '^[0-9a-f]{64}$'
      AND public_key LIKE '-----BEGIN PGP PUBLIC KEY BLOCK-----%'
    )
  )`);
  await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS private_chat_identity_fingerprint_idx
    ON private_chat_identities(fingerprint)`);
  await client.query(`CREATE TABLE IF NOT EXISTS private_chat_threads (
    id uuid PRIMARY KEY,
    user_a_id uuid NOT NULL REFERENCES private_chat_identities(user_id) ON DELETE CASCADE,
    user_b_id uuid NOT NULL REFERENCES private_chat_identities(user_id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT private_chat_thread_pair_check CHECK (user_a_id < user_b_id)
  )`);
  await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS private_chat_thread_pair_idx
    ON private_chat_threads(user_a_id,user_b_id)`);
  await client.query(`CREATE INDEX IF NOT EXISTS private_chat_thread_recipient_idx
    ON private_chat_threads(user_b_id,updated_at)`);
  await client.query(`CREATE TABLE IF NOT EXISTS private_chat_envelopes (
    id uuid PRIMARY KEY,
    thread_id uuid NOT NULL REFERENCES private_chat_threads(id) ON DELETE CASCADE,
    sender_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ciphertext text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT private_chat_envelope_valid_check CHECK (
      octet_length(ciphertext) BETWEEN 100 AND 2097152
      AND ciphertext LIKE '-----BEGIN PGP MESSAGE-----%'
    )
  )`);
  await client.query(`CREATE INDEX IF NOT EXISTS private_chat_envelope_page_idx
    ON private_chat_envelopes(thread_id,created_at,id)`);

  // No API key rotation or message editing exists in this first version.
  // Enforce those invariants against accidental repository writes too.
  await client.query(`CREATE OR REPLACE FUNCTION private_chat_immutable_record() RETURNS trigger
    LANGUAGE plpgsql AS $$
    BEGIN
      RAISE EXCEPTION 'Private chat records are immutable' USING ERRCODE='23514';
    END $$`);
  await client.query(`DROP TRIGGER IF EXISTS private_chat_identity_immutable ON private_chat_identities`);
  await client.query(`CREATE TRIGGER private_chat_identity_immutable BEFORE UPDATE ON private_chat_identities
    FOR EACH ROW EXECUTE FUNCTION private_chat_immutable_record()`);
  await client.query(`DROP TRIGGER IF EXISTS private_chat_envelope_immutable ON private_chat_envelopes`);
  await client.query(`CREATE TRIGGER private_chat_envelope_immutable BEFORE UPDATE ON private_chat_envelopes
    FOR EACH ROW EXECUTE FUNCTION private_chat_immutable_record()`);

  await client.query(`CREATE OR REPLACE FUNCTION private_chat_thread_members_immutable() RETURNS trigger
    LANGUAGE plpgsql AS $$
    BEGIN
      IF NEW.id IS DISTINCT FROM OLD.id OR NEW.user_a_id IS DISTINCT FROM OLD.user_a_id
        OR NEW.user_b_id IS DISTINCT FROM OLD.user_b_id OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
        RAISE EXCEPTION 'Private chat members are immutable' USING ERRCODE='23514';
      END IF;
      RETURN NEW;
    END $$`);
  await client.query(`DROP TRIGGER IF EXISTS private_chat_members_immutable ON private_chat_threads`);
  await client.query(`CREATE TRIGGER private_chat_members_immutable BEFORE UPDATE ON private_chat_threads
    FOR EACH ROW EXECUTE FUNCTION private_chat_thread_members_immutable()`);
  await client.query(`CREATE OR REPLACE FUNCTION private_chat_envelope_member() RETURNS trigger
    LANGUAGE plpgsql AS $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM private_chat_threads
        WHERE id=NEW.thread_id AND NEW.sender_id IN (user_a_id,user_b_id)) THEN
        RAISE EXCEPTION 'Private chat sender is not a member' USING ERRCODE='23514';
      END IF;
      RETURN NEW;
    END $$`);
  await client.query(`DROP TRIGGER IF EXISTS private_chat_envelope_sender ON private_chat_envelopes`);
  await client.query(`CREATE TRIGGER private_chat_envelope_sender BEFORE INSERT ON private_chat_envelopes
    FOR EACH ROW EXECUTE FUNCTION private_chat_envelope_member()`);
}
