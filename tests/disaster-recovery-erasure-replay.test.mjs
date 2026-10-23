import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHash, randomUUID } from 'node:crypto';
import { replayRestoredDeletions } from '../ops/backup/replay-deletions.mjs';
import { validateDeletionManifest } from '../ops/backup/verify-restored-deletions.mjs';

const through='2026-01-02T00:00:00Z';
const fixture=()=>({schemaVersion:2,journalId:'recovery-test',through,
  erasures:[{id:randomUUID(),accountId:null,emailHash:'a'.repeat(64),erasedAt:'2026-01-01T00:00:00.000Z'}],
  suppressions:[{emailHash:'a'.repeat(64),purpose:'all_promotional',suppressedAt:'2026-01-01T00:00:00.000Z'}],restrictedAccountIds:[]});
function validate(value) {
  const bytes=Buffer.from(JSON.stringify(value));
  return validateDeletionManifest(bytes,{expectedThrough:through,expectedSha256:createHash('sha256').update(bytes).digest('hex')});
}
test('recovery v2 accepts minimized events and rejects ambiguous, malformed or post-checkpoint authority',()=>{
  const valid=fixture(); assert.deepEqual(validate(valid),valid);
  for (const invalid of [
    {...valid,erasures:[{...valid.erasures[0],accountId:'not-an-account'}]},
    {...valid,erasures:[...valid.erasures,...valid.erasures]},
    {...valid,erasures:[{...valid.erasures[0],email:'private@example.test'}]},
    {...valid,erasures:[{...valid.erasures[0],erasedAt:'2026-02-30T00:00:00.000Z'}]},
    {...valid,erasures:[{...valid.erasures[0],erasedAt:'2026-01-03T00:00:00.000Z'}]},
    {...valid,suppressions:[{...valid.suppressions[0],purpose:'all promotional'}]},
    {...valid,suppressions:[...valid.suppressions,...valid.suppressions]},
    {...valid,restrictedAccountIds:['not-an-account']},
  ]) assert.throws(()=>validate(invalid));
});
test('replay refuses a missing digest before querying and rolls back target or database failures',async()=>{
  const calls=[];
  const client={async query(sql){calls.push(sql);if(sql.includes('current_database')) return {rows:[{database_name:'different'}]};return {rows:[]};}};
  await assert.rejects(replayRestoredDeletions(client,fixture(),'isolated_restore'),/digest/);
  assert.equal(calls.length,0);
  await assert.rejects(replayRestoredDeletions(client,fixture(),'isolated_restore',{manifestSha256:'b'.repeat(64)}),/recovery target/);
  assert.equal(calls.at(-1),'ROLLBACK');
  assert.ok(calls.every(sql=>!sql.startsWith('DELETE')&&!sql.startsWith('UPDATE')));
});
