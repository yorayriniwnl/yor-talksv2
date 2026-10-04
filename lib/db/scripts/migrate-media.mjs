/** Additive staged media migration; the release runner owns the transaction. */
export const MEDIA_SCHEMA_VERSION = '20261004-media-1';
export async function migrateMedia(client) {
  await client.query('ALTER TABLE communities ADD COLUMN IF NOT EXISTS cover_url text');
  await client.query(`CREATE TABLE IF NOT EXISTS media_assets (
    id uuid PRIMARY KEY, owner_id uuid REFERENCES users(id) ON DELETE SET NULL,
    purpose text NOT NULL, status text NOT NULL DEFAULT 'pending'
      CHECK(status IN ('pending','uploaded','verifying','approved','rejected','failed','deleted')),
    public_id text NOT NULL UNIQUE, resource_type text NOT NULL CHECK(resource_type IN ('image','video')),
    declared_mime text NOT NULL, declared_bytes integer NOT NULL CHECK(declared_bytes>0 AND declared_bytes<=10485760),
    provider_asset_id text, provider_version integer, provider_format text,
    verified_mime text, verified_bytes integer, sha256 text, width integer, height integer, duration_seconds double precision,
    moderation_json jsonb, verification_token uuid, verification_until timestamptz,
    deletion_status text NOT NULL DEFAULT 'none' CHECK(deletion_status IN ('none','pending','deleted')),
    deletion_attempts integer NOT NULL DEFAULT 0, deletion_token uuid, deletion_until timestamptz,
    cleanup_at timestamptz NOT NULL DEFAULT now(), upload_expires_at timestamptz NOT NULL,
    last_error text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
    CHECK(status<>'approved' OR (owner_id IS NOT NULL AND provider_asset_id IS NOT NULL AND provider_version>0
      AND verified_mime IS NOT NULL AND verified_bytes>0 AND sha256 IS NOT NULL AND moderation_json->>'decision'='approve'
      AND deletion_status='none'))
  )`);
  await client.query('CREATE INDEX IF NOT EXISTS media_assets_cleanup_idx ON media_assets(deletion_status,cleanup_at)');
  if(!(await client.query("SELECT 1 FROM pg_constraint WHERE conrelid='media_assets'::regclass AND conname='media_assets_explicit_approval'")).rowCount)
    await client.query(`ALTER TABLE media_assets ADD CONSTRAINT media_assets_explicit_approval CHECK(status<>'approved' OR (
      owner_id IS NOT NULL AND provider_asset_id IS NOT NULL AND provider_version IS NOT NULL AND provider_version>0
      AND provider_format IS NOT NULL AND verified_mime IS NOT NULL AND verified_bytes IS NOT NULL AND verified_bytes>0
      AND sha256 IS NOT NULL AND sha256 ~ '^[a-f0-9]{64}$' AND (moderation_json->>'decision') IS NOT DISTINCT FROM 'approve'
      AND deletion_status='none'))`);
  await client.query('CREATE INDEX IF NOT EXISTS media_assets_owner_idx ON media_assets(owner_id,status)');
  await client.query(`CREATE TABLE IF NOT EXISTS media_references (
    media_id uuid NOT NULL REFERENCES media_assets(id), entity_type text NOT NULL,
    entity_id uuid NOT NULL, slot text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY(media_id,entity_type,entity_id,slot)
  )`);
  await client.query('CREATE INDEX IF NOT EXISTS media_references_entity_idx ON media_references(entity_type,entity_id)');
  await client.query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS media_id uuid REFERENCES media_assets(id),
    ADD COLUMN IF NOT EXISTS media_url text, ADD COLUMN IF NOT EXISTS media_type text,
    ADD COLUMN IF NOT EXISTS media_duration integer, ADD COLUMN IF NOT EXISTS media_legacy boolean NOT NULL DEFAULT false`);
  // Only this migration can identify historical encoded attachments. A client
  // cannot turn new free text into a trusted legacy media attachment.
  const applied = await client.query('SELECT 1 FROM release_schema_versions WHERE version=$1', [MEDIA_SCHEMA_VERSION]);
  if (!applied.rowCount) await client.query(`UPDATE messages SET media_legacy=true
    WHERE media_id IS NULL AND (content ~ '^🎤 Voice note \\(.*\\): https://' OR content ~ '^📷 https://')`);
  await client.query(`CREATE OR REPLACE FUNCTION media_last_reference_deleted() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      -- Publication locks this row before adding a use. Obtain that lock in a
      -- separate statement so NOT EXISTS sees references committed while we
      -- were waiting, rather than the snapshot from before the wait.
      PERFORM id FROM media_assets WHERE id=OLD.media_id FOR UPDATE;
      UPDATE media_assets a SET status='deleted',deletion_status='pending',cleanup_at=now(),updated_at=now(),
        verification_token=NULL,verification_until=NULL
      WHERE a.id=OLD.media_id AND NOT EXISTS(SELECT 1 FROM media_references r WHERE r.media_id=a.id);
      RETURN OLD;
    END $$`);
  await client.query('DROP TRIGGER IF EXISTS media_last_reference_cleanup ON media_references');
  await client.query(`CREATE TRIGGER media_last_reference_cleanup AFTER DELETE ON media_references
    FOR EACH ROW EXECUTE FUNCTION media_last_reference_deleted()`);
  await client.query(`CREATE OR REPLACE FUNCTION media_entity_deleted() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN DELETE FROM media_references WHERE entity_type=TG_TABLE_NAME AND entity_id=OLD.id; RETURN OLD; END $$`);
  const entityTables = ['users','posts','comments','stories','videos','video_comments','messages','products','articles',
    'events','live_streams','broadcast_channels','highlights','profile_showcases','communities','business_profiles'];
  for (const table of entityTables) {
    await client.query(`DROP TRIGGER IF EXISTS media_entity_cleanup ON "${table}"`);
    await client.query(`CREATE TRIGGER media_entity_cleanup AFTER DELETE ON "${table}" FOR EACH ROW EXECUTE FUNCTION media_entity_deleted()`);
  }
  await client.query(`CREATE OR REPLACE FUNCTION media_account_deleting() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN UPDATE media_assets SET status='deleted',deletion_status='pending',cleanup_at=now(),updated_at=now(),
      verification_token=NULL,verification_until=NULL WHERE owner_id=OLD.id; RETURN OLD; END $$`);
  await client.query('DROP TRIGGER IF EXISTS media_account_cleanup ON users');
  await client.query('CREATE TRIGGER media_account_cleanup BEFORE DELETE ON users FOR EACH ROW EXECUTE FUNCTION media_account_deleting()');
  await client.query(`CREATE OR REPLACE FUNCTION media_message_hidden() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      IF NEW.deleted_at IS NOT NULL OR (NEW.expires_at IS NOT NULL AND NEW.expires_at<=now()) THEN
        DELETE FROM media_references WHERE entity_type='messages' AND entity_id=NEW.id;
      END IF;
      RETURN NEW;
    END $$`);
  await client.query('DROP TRIGGER IF EXISTS media_message_cleanup ON messages');
  await client.query('CREATE TRIGGER media_message_cleanup AFTER UPDATE ON messages FOR EACH ROW EXECUTE FUNCTION media_message_hidden()');
  await client.query('INSERT INTO release_schema_versions(version) VALUES($1) ON CONFLICT DO NOTHING',[MEDIA_SCHEMA_VERSION]);
}
