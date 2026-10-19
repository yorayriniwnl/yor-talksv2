import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { migratePreregister } from '../lib/db/scripts/migrate-preregister.mjs';

test('importing the registration migration neither connects nor exits without a database URL', () => {
  const migrationUrl = new URL('../lib/db/scripts/migrate-preregister.mjs', import.meta.url).href;
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', `const m = await import(${JSON.stringify(migrationUrl)}); if (typeof m.migratePreregister !== 'function') throw new Error('missing migration export')`], {
    env: { ...process.env, DATABASE_URL: '' }, encoding: 'utf8', timeout: 15000,
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, '');
  assert.equal(result.stderr, '');
});

const testDatabaseUrl = process.env.PREREGISTER_TEST_DATABASE_URL;
const skipReason = !testDatabaseUrl
  ? (process.env.CI ? false : 'Set PREREGISTER_TEST_DATABASE_URL to a disposable PostgreSQL database')
  : false;

test('migration applies cleanly to a fresh schema, establishes required constraints, and is idempotent', {
  skip: skipReason,
}, async () => {
  assert.ok(testDatabaseUrl, 'PREREGISTER_TEST_DATABASE_URL must be set in CI so migrations are verified against PostgreSQL');
  const require = createRequire(new URL('../lib/db/package.json', import.meta.url));
  const { Client } = require('pg');
  const client = new Client({ connectionString: testDatabaseUrl });
  const schema = `preregister_fresh_${randomUUID().replaceAll('-', '')}`;
  await client.connect();
  try {
    await client.query('BEGIN');
    await client.query(`CREATE SCHEMA "${schema}"`);
    await client.query(`SET LOCAL search_path TO "${schema}"`);

    // Run migration on completely fresh schema
    await migratePreregister(client);

    // Verify columns and data types
    const columns = (await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = $1 AND table_name = 'preregistrations'
      ORDER BY ordinal_position
    `, [schema])).rows;
    const colMap = Object.fromEntries(columns.map(c => [c.column_name, c]));
    assert.ok(colMap.id, 'missing id column');
    assert.equal(colMap.id.data_type, 'uuid');
    assert.ok(colMap.email, 'missing email column');
    assert.equal(colMap.email.data_type, 'text');
    assert.ok(colMap.username, 'missing username column');
    assert.equal(colMap.username.data_type, 'text');
    assert.ok(colMap.perks, 'missing perks column');
    assert.equal(colMap.perks.data_type, 'jsonb');
    assert.ok(colMap.referral_code, 'missing referral_code column');
    assert.equal(colMap.referral_code.data_type, 'text');
    assert.ok(colMap.referred_by, 'missing referred_by column');
    assert.equal(colMap.referred_by.data_type, 'text');
    assert.ok(colMap.launch_updates_consented_at, 'missing launch_updates_consented_at column');
    assert.equal(colMap.launch_updates_consented_at.data_type, 'timestamp with time zone');
    assert.ok(colMap.unsubscribed_at, 'missing unsubscribed_at column');
    assert.equal(colMap.unsubscribed_at.data_type, 'timestamp with time zone');
    assert.ok(colMap.created_at, 'missing created_at column');
    assert.equal(colMap.created_at.data_type, 'timestamp with time zone');

    // Verify indexes
    const indexes = (await client.query(`
      SELECT indexname
      FROM pg_indexes
      WHERE schemaname = $1 AND tablename = 'preregistrations'
    `, [schema])).rows;
    const indexNames = new Set(indexes.map(i => i.indexname));
    assert.ok(indexNames.has('preregistrations_email_casefold_unique_idx'));
    assert.ok(indexNames.has('preregistrations_username_casefold_unique_idx'));
    assert.ok(indexNames.has('preregistrations_referral_code_unique_idx'));
    assert.ok(indexNames.has('preregistrations_created_at_idx'));

    // Repeat execution (idempotency)
    await migratePreregister(client);
    await migratePreregister(client);

    // Insert a valid row
    const id1 = randomUUID();
    const consentTime = new Date('2026-10-19T10:00:00.000Z');
    await client.query(`
      INSERT INTO preregistrations (id, email, username, perks, referral_code, launch_updates_consented_at)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [id1, 'Member1@example.test', 'UserOne', JSON.stringify(['founder-badge']), 'YOR-CODE01', consentTime]);

    // Verify row was inserted accurately
    const row = (await client.query('SELECT * FROM preregistrations WHERE id = $1', [id1])).rows[0];
    assert.equal(row.email, 'Member1@example.test');
    assert.equal(row.username, 'UserOne');
    assert.equal(row.referral_code, 'YOR-CODE01');
    assert.deepEqual(row.perks, ['founder-badge']);
    assert.equal(row.launch_updates_consented_at.toISOString(), consentTime.toISOString());

    // Case-insensitive email collision
    await client.query('SAVEPOINT conflict_email');
    await assert.rejects(
      client.query('INSERT INTO preregistrations (email, username) VALUES ($1, $2)', ['member1@example.test', 'otheruser']),
      error => error.code === '23505'
    );
    await client.query('ROLLBACK TO SAVEPOINT conflict_email');

    // Case-insensitive username collision
    await client.query('SAVEPOINT conflict_user');
    await assert.rejects(
      client.query('INSERT INTO preregistrations (email, username) VALUES ($1, $2)', ['other@example.test', 'userone']),
      error => error.code === '23505'
    );
    await client.query('ROLLBACK TO SAVEPOINT conflict_user');

    // Referral code uniqueness: non-null collision rejected
    await client.query('SAVEPOINT conflict_ref');
    await assert.rejects(
      client.query('INSERT INTO preregistrations (email, username, referral_code) VALUES ($1, $2, $3)', ['other@example.test', 'otheruser', 'YOR-CODE01']),
      error => error.code === '23505'
    );
    await client.query('ROLLBACK TO SAVEPOINT conflict_ref');

    // Multiple NULL referral codes are allowed
    await client.query('INSERT INTO preregistrations (email, username, referral_code) VALUES ($1, $2, NULL)', ['null1@example.test', 'nulluser1']);
    await client.query('INSERT INTO preregistrations (email, username, referral_code) VALUES ($1, $2, NULL)', ['null2@example.test', 'nulluser2']);

    const total = (await client.query('SELECT count(*)::int AS count FROM preregistrations')).rows[0].count;
    assert.equal(total, 3);
  } finally {
    await client.query('ROLLBACK');
    await client.end();
  }
});

test('migration is repeatable, preserves legacy rows and consent, and enforces identity uniqueness', {
  skip: skipReason,
}, async () => {
  assert.ok(testDatabaseUrl, 'PREREGISTER_TEST_DATABASE_URL must be set in CI so migrations are verified against PostgreSQL');
  const require = createRequire(new URL('../lib/db/package.json', import.meta.url));
  const { Client } = require('pg');
  const client = new Client({ connectionString: testDatabaseUrl });
  const schema = `preregister_test_${randomUUID().replaceAll('-', '')}`;
  await client.connect();
  try {
    // All objects exist only within a transaction that is always rolled back.
    await client.query('BEGIN');
    await client.query(`CREATE SCHEMA "${schema}"`);
    await client.query(`SET LOCAL search_path TO "${schema}"`);
    await client.query(`CREATE TABLE preregistrations (
      id uuid PRIMARY KEY, email text NOT NULL, username text NOT NULL,
      created_at timestamp NOT NULL DEFAULT now()
    )`);
    const legacyId = randomUUID();
    await client.query(`INSERT INTO preregistrations(id,email,username,created_at) VALUES ($1,$2,$3,$4)`,
      [legacyId, 'Legacy@example.test', 'LegacyHandle', '2026-10-01T00:00:00']);
    await migratePreregister(client);
    await migratePreregister(client);
    const legacy = (await client.query('SELECT * FROM preregistrations WHERE id=$1', [legacyId])).rows[0];
    assert.equal(legacy.email, 'Legacy@example.test');
    assert.equal(legacy.username, 'LegacyHandle');
    assert.equal(legacy.launch_updates_consented_at, null);
    assert.equal(legacy.referral_code, null);
    assert.equal(legacy.created_at.toISOString(), '2026-10-01T00:00:00.000Z');
    for (const [email, username] of [['legacy@example.test', 'otherhandle'], ['other@example.test', 'legacyhandle']]) {
      await client.query('SAVEPOINT conflict');
      await assert.rejects(client.query(`INSERT INTO preregistrations(id,email,username) VALUES ($1,$2,$3)`,
        [randomUUID(), email, username]), error => error.code === '23505');
      await client.query('ROLLBACK TO SAVEPOINT conflict');
    }
    const consent = new Date('2026-10-19T08:00:00Z');
    await client.query(`INSERT INTO preregistrations(id,email,username,referral_code,launch_updates_consented_at)
      VALUES ($1,$2,$3,$4,$5)`, [randomUUID(), 'new@example.test', 'new_handle', 'YOR-A1B2C3', consent]);
    await migratePreregister(client);
    const saved = (await client.query('SELECT * FROM preregistrations WHERE email=$1', ['new@example.test'])).rows[0];
    assert.equal(saved.launch_updates_consented_at.toISOString(), consent.toISOString());
    assert.equal(saved.referral_code, 'YOR-A1B2C3');
    assert.equal((await client.query('SELECT count(*)::int AS count FROM preregistrations')).rows[0].count, 2);
  } finally {
    await client.query('ROLLBACK');
    await client.end();
  }
});
