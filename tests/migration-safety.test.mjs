import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { planBaseSchema, requireMigrationSecret } from '../lib/db/scripts/migration-safety.mjs';

test('schema bootstrap refuses partial schemas and unrelated existing objects', () => {
  const required = ['users', 'posts'];
  assert.equal(planBaseSchema([], required), 'bootstrap');
  assert.equal(planBaseSchema(['users', 'posts', 'other_table'], required), 'migrate');
  for (const existing of [['users'], ['unrelated_table'], ['standalone_sequence'], ['existing_view']]) {
    assert.throws(() => planBaseSchema(existing, required), /non-empty, incomplete/);
  }
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
