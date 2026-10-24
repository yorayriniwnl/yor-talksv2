import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, test, type TestContext } from 'node:test';
import type { Request, Response } from 'express';
import { pool } from '@workspace/db';
import { PgDialect } from 'drizzle-orm/pg-core';
import type { SQL } from 'drizzle-orm';
import { createMessage, decrypt, encrypt, generateKey, readMessage } from 'openpgp';
import { assertPrivateChatSchema, REQUIRED_PRIVATE_CHAT_SCHEMA_VERSION } from '../services/private-chat-readiness.js';
import { createReadinessHandler } from '../routes/health.js';

const migrationUrl = new URL('../../../lib/db/scripts/migrate-private-chat.mjs', import.meta.url);
const { migratePrivateChat, PRIVATE_CHAT_SCHEMA_VERSION } = await import(migrationUrl.href);
after(() => pool.end());

async function fixture(t: TestContext, migrate = true) {
  const client = await pool.connect();
  t.after(async () => { try { await client.query('ROLLBACK'); } finally { client.release(); } });
  await client.query('BEGIN');
  const schema = `private_release_${randomUUID().replaceAll('-', '')}`;
  await client.query(`CREATE SCHEMA "${schema}"`);
  await client.query(`SET LOCAL search_path TO "${schema}"`);
  await client.query('CREATE TABLE users (id uuid PRIMARY KEY)');
  await client.query('CREATE TABLE release_schema_versions (version text PRIMARY KEY)');
  const dialect = new PgDialect();
  const query = (statement: SQL) => {
    const { sql, params } = dialect.sqlToQuery(statement);
    return client.query(sql, params);
  };
  if (migrate) {
    await migratePrivateChat(client);
    await client.query('INSERT INTO release_schema_versions(version) VALUES ($1)', [PRIVATE_CHAT_SCHEMA_VERSION]);
  }
  const ready = () => assertPrivateChatSchema(query);
  const http = async () => {
    let status = 0;
    let body: any;
    await createReadinessHandler({
      database: ready,
      media: () => ({ storage: false, presets: false, direct: false, decoder: false, moderation: false, ready: false, errorCodes: [] }),
      redis: async () => ({ compatible: true, version: '7.0.0' }),
      notificationWorker: async () => true,
      lifecycle: async () => ({ workerUp: true, overdueCleanupJobs: 0, deadCleanupJobs: 0, failingCleanupJobs: 0 }),
      recoveryReplay: async () => {},
    })({} as Request, {
      status(code: number) { status = code; return this; },
      json(value: unknown) { body = value; return this; },
    } as Response);
    return { status, body };
  };
  return { client, schema, ready, http };
}

test('readiness requires the migration marker and never exposes missing-schema errors', async t => {
  assert.equal(REQUIRED_PRIVATE_CHAT_SCHEMA_VERSION, PRIVATE_CHAT_SCHEMA_VERSION);
  const f = await fixture(t, false);
  await f.client.query('SAVEPOINT absent_schema');
  const missing = await f.http();
  assert.equal(missing.status, 503);
  assert.equal(missing.body.services.database, 'down');
  assert.equal(missing.body.error, 'One or more dependencies are unavailable');
  assert.equal(JSON.stringify(missing.body).includes('private_chat_identities'), false);
  await f.client.query('ROLLBACK TO SAVEPOINT absent_schema');
  await migratePrivateChat(f.client);
  assert.equal((await f.http()).status, 503, 'tables without a completed release migration are not ready');
  await f.client.query('INSERT INTO release_schema_versions(version) VALUES ($1)', [PRIVATE_CHAT_SCHEMA_VERSION]);
  assert.equal((await f.http()).status, 200);
});

test('readiness rejects disabled or missing integrity triggers, constraints and indexes', async t => {
  const f = await fixture(t);
  await f.ready();
  const changes = [
    'ALTER TABLE private_chat_identities DISABLE TRIGGER private_chat_identity_immutable',
    'ALTER TABLE private_chat_threads DISABLE TRIGGER private_chat_members_immutable',
    'ALTER TABLE private_chat_envelopes ENABLE REPLICA TRIGGER private_chat_envelope_immutable',
    'DROP TRIGGER private_chat_envelope_sender ON private_chat_envelopes',
    'ALTER TABLE private_chat_identities DROP CONSTRAINT private_chat_identity_valid_check',
    'ALTER TABLE private_chat_threads DROP CONSTRAINT private_chat_thread_pair_check',
    'ALTER TABLE private_chat_envelopes DROP CONSTRAINT private_chat_envelope_valid_check',
    'DROP INDEX private_chat_identity_fingerprint_idx',
    'DROP INDEX private_chat_thread_pair_idx',
    'DROP INDEX private_chat_thread_recipient_idx',
    'DROP INDEX private_chat_envelope_page_idx',
    'ALTER TABLE private_chat_envelopes RENAME COLUMN ciphertext TO old_ciphertext',
  ];
  for (const change of changes) {
    await f.client.query('SAVEPOINT schema_fault');
    await f.client.query(change);
    assert.equal((await f.http()).status, 503, change);
    await f.client.query('ROLLBACK TO SAVEPOINT schema_fault');
    await f.client.query('RELEASE SAVEPOINT schema_fault');
    await f.ready();
  }
});

test('reapplying the private-chat migration preserves keys, ciphertext and deletion cascades', async t => {
  const f = await fixture(t);
  const ids = [randomUUID(), randomUUID()].sort();
  const keys = await Promise.all(ids.map(id => generateKey({
    type: 'curve25519', userIDs: [{ name: `yor:${id}` }], format: 'object', config: { v6Keys: true },
  })));
  await f.client.query('INSERT INTO users(id) VALUES($1),($2)', ids);
  for (const [index, id] of ids.entries()) {
    await f.client.query('INSERT INTO private_chat_identities(user_id,public_key,fingerprint) VALUES($1,$2,$3)',
      [id, keys[index].publicKey.armor(), keys[index].publicKey.getFingerprint()]);
  }
  const threadId = randomUUID(), messageId = randomUUID(), text = 'Private content survives an additive release';
  await f.client.query('INSERT INTO private_chat_threads(id,user_a_id,user_b_id) VALUES($1,$2,$3)', [threadId, ...ids]);
  const ciphertext = await encrypt({ message: await createMessage({ text }),
    encryptionKeys: keys.map(key => key.publicKey), signingKeys: keys[0].privateKey, format: 'armored' });
  await f.client.query('INSERT INTO private_chat_envelopes(id,thread_id,sender_id,ciphertext) VALUES($1,$2,$3,$4)',
    [messageId, threadId, ids[0], ciphertext]);
  const before = await f.client.query('SELECT * FROM private_chat_identities ORDER BY user_id');
  await migratePrivateChat(f.client);
  await migratePrivateChat(f.client);
  await f.ready();
  assert.deepEqual((await f.client.query('SELECT * FROM private_chat_identities ORDER BY user_id')).rows, before.rows);
  const stored = await f.client.query('SELECT ciphertext FROM private_chat_envelopes WHERE id=$1', [messageId]);
  assert.equal(stored.rows[0].ciphertext, ciphertext);
  const result = await decrypt({ message: await readMessage({ armoredMessage: stored.rows[0].ciphertext }),
    decryptionKeys: keys[1].privateKey, verificationKeys: keys[0].publicKey, expectSigned: true });
  await result.signatures[0].verified;
  assert.equal(result.data, text);
  await f.client.query('DELETE FROM users WHERE id=$1', [ids[0]]);
  assert.equal((await f.client.query('SELECT 1 FROM private_chat_threads')).rowCount, 0);
  assert.equal((await f.client.query('SELECT 1 FROM private_chat_envelopes')).rowCount, 0);
  assert.equal((await f.client.query('SELECT 1 FROM private_chat_identities')).rowCount, 1);
});
