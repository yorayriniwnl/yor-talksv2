import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import { DeletionVerificationError, validateDeletionManifest, verifyRestoredDeletions } from '../ops/backup/verify-restored-deletions.mjs';

const id = '00000000-0000-4000-8000-000000000001';
const checkpoint = '2026-01-01T00:00:00Z';
const fixture = { schemaVersion: 1, journalId: 'synthetic-journal-1', through: checkpoint, deletedAccountIds: [id] };
function validate(value, overrides = {}) {
  const bytes = Buffer.isBuffer(value) ? value : Buffer.from(JSON.stringify(value));
  return validateDeletionManifest(bytes, { expectedSha256: createHash('sha256').update(bytes).digest('hex'),
    expectedThrough: checkpoint, now: Date.parse('2026-01-02T00:00:00Z'), ...overrides });
}

test('recovery manifest requires an independent digest/checkpoint and minimizes identifiers', () => {
  assert.deepEqual(validate(fixture), fixture);
  assert.deepEqual(validate({ ...fixture, deletedAccountIds: [] }).deletedAccountIds, []);
  for (const [value, overrides] of [
    [fixture, { expectedSha256: undefined }], [fixture, { expectedSha256: '0'.repeat(64) }],
    [fixture, { expectedThrough: undefined }], [fixture, { expectedThrough: '2025-12-31T00:00:00Z' }],
    [{ ...fixture, email: 'synthetic@example.invalid' }], [{ ...fixture, schemaVersion: 2 }],
    [{ ...fixture, journalId: '../backup/email@example.invalid' }],
    [{ ...fixture, deletedAccountIds: [id, id] }], [{ ...fixture, deletedAccountIds: ["' OR TRUE --"] }],
    [{ ...fixture, deletedAccountIds: [id.replace('000000000001', 'ABCDEFABCDEF')] }],
    [{ ...fixture, deletedAccountIds: Array.from({ length: 10001 }, () => id) }],
    [Buffer.alloc(1024 * 1024 + 1)], [Buffer.from('{not JSON')], [Buffer.from([0xff])],
    [{ ...fixture, through: '2026-02-30T00:00:00Z' }],
    [{ ...fixture, through: '2026-01-01T05:30:00+05:30' }],
    [{ ...fixture, through: '2026-01-03T00:00:00Z' }],
  ]) assert.throws(() => validate(value, overrides), DeletionVerificationError);
});

function fakeClient(options = {}) {
  const { database = 'isolated_restore', failCount = false } = options;
  const remaining = Object.hasOwn(options, 'remaining') ? options.remaining : 0;
  const calls = [];
  return { calls, async query(sql, parameters) {
    calls.push({ sql, parameters });
    if (sql.includes('current_database')) return { rows: [{ database_name: database }] };
    if (sql.startsWith('SELECT count')) {
      if (failCount) throw new Error('synthetic database outage with private connection details');
      return { rows: [{ remaining }] };
    }
    return { rows: [] };
  } };
}

test('restored account detection rolls back and fails until the erased identity is absent', async () => {
  const present = fakeClient({ remaining: 1 });
  await assert.rejects(verifyRestoredDeletions(present, fixture, 'isolated_restore'), /keep it isolated and replay erasure/);
  assert.equal(present.calls.at(-1).sql, 'ROLLBACK');
  const absent = fakeClient();
  assert.deepEqual(await verifyRestoredDeletions(absent, fixture, 'isolated_restore'),
    { journalId: fixture.journalId, through: checkpoint, checkedAccounts: 1, remainingAccounts: 0 });
  assert.equal(absent.calls[0].sql, 'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  assert.equal(absent.calls.at(-1).sql, 'COMMIT');
  assert.deepEqual(absent.calls.find(call => call.sql.startsWith('SELECT count')).parameters, [[id]]);
  assert.ok(absent.calls.every(call => !/DELETE|INSERT|UPDATE|CREATE|GRANT|ALTER/.test(call.sql)));
});

test('wrong recovery target, invalid count and database errors cannot pass reconciliation', async () => {
  const wrongTarget = fakeClient({ database: 'other_database' });
  await assert.rejects(verifyRestoredDeletions(wrongTarget, fixture, 'isolated_restore'), /recovery target/);
  assert.equal(wrongTarget.calls.some(call => call.sql.startsWith('SELECT count')), false);
  for (const remaining of [undefined, null, '0', -1, NaN]) {
    await assert.rejects(verifyRestoredDeletions(fakeClient({ remaining }), fixture, 'isolated_restore'));
  }
  const failed = fakeClient({ failCount: true });
  await assert.rejects(verifyRestoredDeletions(failed, fixture, 'isolated_restore'));
  assert.equal(failed.calls.at(-1).sql, 'ROLLBACK');
  await assert.rejects(verifyRestoredDeletions(fakeClient(), fixture, "restore'; DELETE FROM users; --"));
});
