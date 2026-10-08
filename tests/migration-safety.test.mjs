import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { determineBootstrapAction, planBaseSchema, requireMigrationSecret } from '../lib/db/scripts/migration-safety.mjs';

test('schema bootstrap refuses partial schemas and unrelated existing objects', () => {
  const required = ['users', 'posts'];
  assert.equal(planBaseSchema([], required), 'bootstrap');
  assert.equal(planBaseSchema(['users', 'posts', 'other_table'], required), 'migrate');
  for (const existing of [['users'], ['unrelated_table'], ['standalone_sequence'], ['existing_view']]) {
    assert.throws(() => planBaseSchema(existing, required), /non-empty, incomplete/);
  }
});

test('beta bootstrap action identifies an empty database that needs the base schema push', () => {
  const required = ['users', 'posts'];
  assert.equal(determineBootstrapAction([], required), 'bootstrap');
  assert.equal(determineBootstrapAction(['users', 'posts', 'other_table'], required), 'migrate');
  assert.throws(() => determineBootstrapAction(['users'], required), /non-empty, incomplete/);
});

test('production migration refuses missing or placeholder contact identity secrets', () => {
  for (const secret of [undefined, '', 'short', 'contact-shield-development-secret-change-me', 'CHANGE_ME_with_a_long_unique_contact_key']) {
    assert.throws(() => requireMigrationSecret(secret), /CONTACT_SHIELD_SECRET/);
  }
  assert.doesNotThrow(() => requireMigrationSecret('isolated-migration-test-secret-0123456789'));
});

test('premium story migration runs after the base story interaction tables exist', async () => {
  const migrationSource = await readFile(new URL('../lib/db/scripts/migrate-beta.mjs', import.meta.url), 'utf8');
  const baseStoryInteraction = migrationSource.indexOf('await ensureStoryViewerInteractionSchema();');
  const premiumStory = migrationSource.indexOf('await ensurePremiumStorySchema();');
  assert.ok(baseStoryInteraction >= 0);
  assert.ok(premiumStory >= 0);
  assert.ok(baseStoryInteraction < premiumStory);
});

test('private eligibility migration shares the release transaction and cannot backfill legacy adults', async () => {
  const release = await readFile(new URL('../lib/db/scripts/migrate-release.mjs', import.meta.url), 'utf8');
  assert.ok(release.includes('await migrateEligibility(client)'));
  assert.ok(release.indexOf('await migrateEligibility(client)') < release.indexOf("INSERT INTO release_schema_versions"));
  const eligibility = await readFile(new URL('../lib/db/scripts/migrate-eligibility.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(eligibility, /new\s+(?:pg\.)?(?:Client|Pool)|query\(['"](?:BEGIN|COMMIT)/);
  assert.doesNotMatch(eligibility, /INSERT\s+INTO\s+eligibility_assessments[^;]*SELECT[^;]*age_confirmed_at/i);
});
