import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { migratePreregister } from '../lib/db/scripts/migrate-preregister.mjs';

test('importing the registration migration neither connects nor exits without a database URL', () => {
  const migrationUrl = new URL('../lib/db/scripts/migrate-preregister.mjs', import.meta.url).href;
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', `const m = await import(${JSON.stringify(migrationUrl)}); if (typeof m.migratePreregister !== 'function') throw new Error('missing migration export')`], {
    env: { ...process.env, DATABASE_URL: '' }, encoding: 'utf8', timeout: 5000,
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, '');
  assert.equal(result.stderr, '');
});

test('migration is repeatable, preserves legacy rows and consent, and enforces identity uniqueness', {
  skip: !process.env.PREREGISTER_TEST_DATABASE_URL && 'Set PREREGISTER_TEST_DATABASE_URL to a disposable PostgreSQL database',
}, async () => {
  const require = createRequire(new URL('../lib/db/package.json', import.meta.url));
  const { Client } = require('pg');
  const client = new Client({ connectionString: process.env.PREREGISTER_TEST_DATABASE_URL });
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
