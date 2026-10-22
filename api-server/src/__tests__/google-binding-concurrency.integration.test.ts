import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { pool } from '@workspace/db';
import { UserRepository } from '../repositories/user-repository.js';
import { createTestUser } from './test-helpers.js';

after(() => pool.end());

test('concurrent Google subjects cannot replace the winning account binding', async t => {
  const users = new UserRepository();
  const user = await createTestUser(users);
  t.after(() => users.deleteById(user.id));
  const results = await Promise.all(['synthetic-first', 'synthetic-second'].map(subject => users.linkGoogleSubjectForLogin(user, subject)));
  const winners = results.filter(Boolean);
  assert.equal(winners.length, 1);
  assert.equal((await users.findById(user.id))?.googleSubject, winners[0]!.googleSubject);
});

test('a revoked account epoch cannot attach a pending Google identity', async t => {
  const users = new UserRepository();
  const user = await createTestUser(users);
  t.after(() => users.deleteById(user.id));
  await users.revokeAllCredentials(user.id);
  assert.equal(await users.linkGoogleSubjectForLogin(user, 'synthetic-subject'), undefined);
  assert.equal((await users.findById(user.id))?.googleSubject, null);
});
