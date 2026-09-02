import assert from 'node:assert/strict';
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
