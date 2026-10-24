import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { pool } from '@workspace/db';
import { UserRepository } from '../repositories/user-repository.js';
import { streamAccountExport } from '../services/account-export.js';
import { hasCurrentConsent } from '../utils/consent.js';
import { env } from '../config/env.js';
import { createTestUser } from './test-helpers.js';

after(() => pool.end());

test('registration and reacceptance retain separate terms versions without granting eligibility or optional consent', async t => {
  const users = new UserRepository();
  const before = new Date(Date.now() - 60_000).toISOString();
  const oldVersion = `old-${randomUUID()}`;
  const user = await createTestUser(users, { termsVersion: oldVersion, termsAcceptedAt: before });
  t.after(async () => { await users.deleteById(user.id); });
  assert.equal(hasCurrentConsent(user), false);
  const now = new Date().toISOString();
  const current = await users.update(user.id, { termsVersion: env.TERMS_VERSION, termsAcceptedAt: now });
  assert.ok(current && hasCurrentConsent(current));
  assert.equal(current.ageConfirmedAt, null);
  await users.update(user.id, { termsVersion: env.TERMS_VERSION, termsAcceptedAt: new Date().toISOString() });
  const rows = await pool.query('SELECT terms_version,accepted_at,source FROM user_terms_acceptances WHERE user_id=$1 ORDER BY accepted_at', [user.id]);
  assert.deepEqual(rows.rows.map(row => [row.terms_version, row.source]), [[oldVersion, 'registration'], [env.TERMS_VERSION, 'reacceptance']]);
  assert.equal(rows.rows[0].accepted_at.toISOString(), before);
  let json = '';
  for await (const chunk of streamAccountExport(user.id, { pageSize: 1 })) json += chunk;
  const archive = JSON.parse(json);
  assert.deepEqual(archive.activity.termsAcceptances.map((row: { termsVersion: string }) => row.termsVersion).sort(), [oldVersion, env.TERMS_VERSION].sort());
  assert.deepEqual(archive.activity.productAnalytics, []);
  assert.equal((await pool.query('SELECT 1 FROM eligibility_assessments WHERE user_id=$1', [user.id])).rowCount, 0);
  await users.deleteById(user.id);
  assert.equal((await pool.query('SELECT 1 FROM user_terms_acceptances WHERE user_id=$1', [user.id])).rowCount, 0);
});

test('terms history migration preserves surviving legacy evidence idempotently in either timestamp storage', async () => {
  const modulePath = '../../../lib/db/scripts/migrate-terms-history.mjs';
  const { migrateTermsHistory } = await import(modulePath);
  // Transaction-private shadows let the real additive migrator run without
  // altering application tables or the other tests\' schema.
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SET LOCAL TIME ZONE 'America/New_York'");
    await client.query('CREATE TEMP TABLE users(id uuid PRIMARY KEY,terms_version text,terms_accepted_at timestamp)');
    await client.query(`CREATE TEMP TABLE user_terms_acceptances(LIKE public.user_terms_acceptances INCLUDING ALL)`);
    const id = randomUUID();
    await client.query("INSERT INTO users VALUES($1,'legacy-version','2026-10-01 12:00:00')", [id]);
    // CREATE TABLE IF NOT EXISTS resolves the private table first; indexes
    // already copied by INCLUDING ALL are equivalent, idempotent coverage.
    await migrateTermsHistory(client);
    await migrateTermsHistory(client);
    let result = await client.query('SELECT accepted_at,source FROM user_terms_acceptances');
    assert.equal(result.rows.length, 1);
    assert.equal(result.rows[0].accepted_at.toISOString(), '2026-10-01T12:00:00.000Z');
    assert.equal(result.rows[0].source, 'legacy_snapshot');
    await client.query("ALTER TABLE users ALTER COLUMN terms_accepted_at TYPE timestamptz USING terms_accepted_at AT TIME ZONE 'UTC'");
    await client.query('DELETE FROM user_terms_acceptances');
    await migrateTermsHistory(client);
    result = await client.query('SELECT accepted_at FROM user_terms_acceptances');
    assert.equal(result.rows[0].accepted_at.toISOString(), '2026-10-01T12:00:00.000Z');
  } finally { await client.query('ROLLBACK'); client.release(); }
});
