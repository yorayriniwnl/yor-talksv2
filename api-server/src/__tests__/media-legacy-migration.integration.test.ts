import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { test, type TestContext } from 'node:test';
import type { Client } from 'pg';

const { Client: PostgresClient } = createRequire(import.meta.resolve('@workspace/db'))('pg') as typeof import('pg');
const migrationUrl = new URL('../../../lib/db/scripts/migrate-media.mjs', import.meta.url).href;
const { migrateMedia, MEDIA_SCHEMA_VERSION, MEDIA_LEGACY_REPAIR_VERSION, MEDIA_METADATA_SCHEMA_VERSION } = await import(migrationUrl) as {
  migrateMedia(client: Client): Promise<void>; MEDIA_SCHEMA_VERSION: string; MEDIA_LEGACY_REPAIR_VERSION: string; MEDIA_METADATA_SCHEMA_VERSION: string;
};
const historical = [
  '[Voice Note] https://fixture.invalid/voice.mp3 (3s)',
  '🎤 Voice note (3s): https://fixture.invalid/voice.mp3',
  '\n📷 https://fixture.invalid/image.png',
  'A historical caption\n📷 https://fixture.invalid/image.png',
];
type MessageRow = { id: string; mediaLegacy: boolean; mediaId: string | null };

async function fixture(t: TestContext): Promise<Client> {
  assert.equal(process.env.NODE_ENV, 'test', 'Migration regressions require the isolated test environment');
  assert.ok(process.env.DATABASE_URL, 'An isolated test DATABASE_URL is required');
  const client = new PostgresClient({ connectionString: process.env.DATABASE_URL,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' } : undefined });
  await client.connect();
  const schema = `media_legacy_${randomUUID().replaceAll('-', '')}`;
  t.after(async () => { try { await client.query(`DROP SCHEMA "${schema}" CASCADE`); } finally { await client.end(); } });
  await client.query(`CREATE SCHEMA "${schema}"`);
  await client.query(`SET search_path TO "${schema}", public`);
  await client.query(`CREATE TABLE release_schema_versions(version text PRIMARY KEY,applied_at timestamptz NOT NULL DEFAULT now())`);
  // Only these private fixture tables are touched by the actual additive media
  // migration. All entity cleanup triggers are installed, without user data.
  for (const table of ['users','posts','comments','stories','videos','video_comments','products','articles',
    'events','live_streams','broadcast_channels','highlights','profile_showcases','communities','business_profiles']) {
    await client.query(`CREATE TABLE "${table}"(id uuid PRIMARY KEY)`);
  }
  await client.query(`CREATE TABLE messages(id uuid PRIMARY KEY,content text NOT NULL,
    created_at timestamp NOT NULL,edited_at timestamp,deleted_at timestamp,expires_at timestamp)`);
  return client;
}
async function migrate(client: Client): Promise<void> {
  await client.query('BEGIN');
  try { await migrateMedia(client); await client.query('COMMIT'); }
  catch (error) { await client.query('ROLLBACK'); throw error; }
}
async function insertMessages(client: Client, contents: string[], createdAt: string): Promise<string[]> {
  const ids: string[] = [];
  for (const content of contents) {
    const id = randomUUID(); ids.push(id);
    await client.query('INSERT INTO messages(id,content,created_at) VALUES($1,$2,$3::timestamp)', [id, content, createdAt]);
  }
  return ids;
}
async function rows(client: Client, ids: string[]): Promise<MessageRow[]> {
  const result = await client.query<MessageRow>('SELECT id,media_legacy AS "mediaLegacy",media_id AS "mediaId" FROM messages WHERE id=ANY($1::uuid[])', [ids]);
  const indexed = new Map(result.rows.map(row => [row.id, row]));
  return ids.map(id => indexed.get(id)!);
}

test('fresh media migration preserves actual historical voice/image bodies once without approving them or later forged text', async t => {
  const client = await fixture(t);
  const old = await insertMessages(client, historical, '2026-10-04T00:00:00Z');
  const ordinary = await insertMessages(client, ['Ordinary text', '[Voice Note] is just a label', 'A URL https://fixture.invalid/image.png'], '2026-10-04T00:00:00Z');
  await migrate(client);
  assert.deepEqual((await rows(client, old)).map(row => row.mediaLegacy), [true, true, true, true]);
  assert.ok((await rows(client, [...old, ...ordinary])).every(row => row.mediaId === null));
  assert.ok((await rows(client, ordinary)).every(row => row.mediaLegacy === false));
  assert.equal((await client.query('SELECT count(*)::int AS count FROM media_assets')).rows[0].count, 0, 'Legacy URLs never become approved assets');
  const versions = await client.query('SELECT version FROM release_schema_versions ORDER BY version');
  assert.deepEqual(versions.rows.map(row => row.version), [MEDIA_SCHEMA_VERSION, MEDIA_LEGACY_REPAIR_VERSION, MEDIA_METADATA_SCHEMA_VERSION]);
  // Even a deliberately backdated new fixture cannot become a legacy attachment
  // on a repeat migration after the repair marker has committed.
  const forged = await insertMessages(client, historical, '1800-01-01T00:00:00Z');
  const before = await rows(client, [...old, ...ordinary, ...forged]);
  await migrate(client);
  assert.deepEqual(await rows(client, [...old, ...ordinary, ...forged]), before);
  assert.ok((await rows(client, forged)).every(row => row.mediaLegacy === false));
});

test('metadata migration adds the known provider without inventing historical finalization or changing legacy URLs', async t => {
  const client = await fixture(t);
  const legacy = await insertMessages(client, historical, '2026-10-04T00:00:00Z');
  await migrate(client);
  const owner = randomUUID(), id = randomUUID();
  await client.query('INSERT INTO users(id) VALUES($1)', [owner]);
  await client.query(`INSERT INTO media_assets(id,owner_id,purpose,status,public_id,resource_type,declared_mime,declared_bytes,
    provider_asset_id,provider_version,provider_format,verified_mime,verified_bytes,sha256,moderation_json,upload_expires_at)
    VALUES($1,$2,'post','approved',$3,'image','image/png',1,$4,1,'png','image/png',1,$5,'{"decision":"approve"}',now()+interval '1 hour')`,
    [id, owner, `fixture/${id}`, 'd'.repeat(32), '0'.repeat(64)]);
  // Recreate the pre-metadata table shape using this private schema only.
  await client.query('ALTER TABLE media_assets DROP COLUMN provider, DROP COLUMN finalized_at');
  await client.query('DELETE FROM release_schema_versions WHERE version=$1', [MEDIA_METADATA_SCHEMA_VERSION]);
  const before = (await client.query('SELECT * FROM media_assets WHERE id=$1', [id])).rows[0];
  const messagesBefore = (await client.query('SELECT id,content,media_legacy FROM messages WHERE id=ANY($1::uuid[]) ORDER BY id', [legacy])).rows;
  await migrate(client);
  const migrated = (await client.query('SELECT * FROM media_assets WHERE id=$1', [id])).rows[0];
  assert.deepEqual(migrated, { ...before, provider: 'cloudinary', finalized_at: null });
  assert.deepEqual((await client.query('SELECT id,content,media_legacy FROM messages WHERE id=ANY($1::uuid[]) ORDER BY id', [legacy])).rows, messagesBefore);
  await assert.rejects(() => client.query("UPDATE media_assets SET provider='untrusted' WHERE id=$1", [id]), error => (error as { code?: string }).code === '23514');
  await client.query("UPDATE media_assets SET finalized_at='2026-10-06T00:00:00Z' WHERE id=$1", [id]);
  const finalized = (await client.query('SELECT * FROM media_assets WHERE id=$1', [id])).rows[0];
  await migrate(client);
  assert.deepEqual((await client.query('SELECT * FROM media_assets WHERE id=$1', [id])).rows[0], finalized);
  assert.equal((await client.query('SELECT count(*)::int AS count FROM release_schema_versions WHERE version=$1', [MEDIA_METADATA_SCHEMA_VERSION])).rows[0].count, 1);
});

test('v1 follow-up repairs only pre-deployment UTC message timestamps and remains idempotent in a non-UTC database session', async t => {
  const client = await fixture(t);
  await migrate(client);
  // Model an already migrated v1 database, including its unchanged durable
  // deployment cutoff, before installing the one-time follow-up marker.
  await client.query('DELETE FROM release_schema_versions WHERE version=$1', [MEDIA_LEGACY_REPAIR_VERSION]);
  await client.query("UPDATE release_schema_versions SET applied_at='2026-10-04T12:00:00Z' WHERE version=$1", [MEDIA_SCHEMA_VERSION]);
  await client.query("SET TIME ZONE 'Asia/Calcutta'");
  const old = await insertMessages(client, historical, '2026-10-04T11:00:00Z');
  await client.query("UPDATE messages SET edited_at='2026-10-04T11:30:00Z'::timestamp WHERE id=$1", [old[0]]);
  const newer = await insertMessages(client, historical, '2026-10-04T13:00:00Z');
  const newlyEdited = await insertMessages(client, historical, '2026-10-04T11:00:00Z');
  await client.query("UPDATE messages SET edited_at='2026-10-04T13:00:00Z'::timestamp WHERE id=ANY($1::uuid[])", [newlyEdited]);
  const ordinary = await insertMessages(client, ['A historical ordinary message'], '2026-10-04T11:00:00Z');
  const owner = randomUUID(), pending = randomUUID(), structured = randomUUID();
  await client.query('INSERT INTO users(id) VALUES($1)', [owner]);
  await client.query(`INSERT INTO media_assets(id,owner_id,purpose,public_id,resource_type,declared_mime,declared_bytes,upload_expires_at)
    VALUES($1,$2,'message',$3,'image','image/png',1,now()+interval '1 hour')`, [pending, owner, `fixture/${pending}`]);
  await client.query(`INSERT INTO messages(id,content,created_at,media_id) VALUES($1,$2,'2026-10-04T11:00:00Z'::timestamp,$3)`, [structured, historical[0], pending]);
  await migrate(client);
  assert.ok((await rows(client, old)).every(row => row.mediaLegacy === true && row.mediaId === null));
  assert.ok((await rows(client, [...newer, ...newlyEdited, ...ordinary, structured])).every(row => row.mediaLegacy === false));
  assert.equal((await rows(client, [structured]))[0].mediaId, pending);
  const asset = (await client.query('SELECT status,moderation_json FROM media_assets WHERE id=$1', [pending])).rows[0];
  assert.deepEqual(asset, { status: 'pending', moderation_json: null }, 'A legacy repair never approves or changes structured media');
  assert.equal((await client.query('SELECT applied_at FROM release_schema_versions WHERE version=$1', [MEDIA_SCHEMA_VERSION])).rows[0].applied_at.toISOString(), '2026-10-04T12:00:00.000Z');
  const forged = await insertMessages(client, historical, '2026-10-04T10:00:00Z');
  const before = await rows(client, [...old, ...newer, ...newlyEdited, ...ordinary, structured, ...forged]);
  await migrate(client);
  assert.deepEqual(await rows(client, [...old, ...newer, ...newlyEdited, ...ordinary, structured, ...forged]), before);
  assert.ok((await rows(client, forged)).every(row => row.mediaLegacy === false));
});
