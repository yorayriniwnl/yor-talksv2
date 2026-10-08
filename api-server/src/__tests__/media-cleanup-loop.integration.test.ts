import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { pool } from '@workspace/db';
import { ensureMediaCleanupLoop } from '../workers/lifecycle-worker.js';

after(() => pool.end());

test('permanent media sweep recovers terminal states while finite dead jobs and live/backoff leases remain unchanged', async t => {
  const original = (await pool.query("SELECT * FROM background_jobs WHERE dedup_key='media:cleanup:loop'")).rows[0];
  const accountJob = randomUUID();
  let createdLoopId: string | undefined;
  t.after(async () => {
    if (createdLoopId) await pool.query('DELETE FROM background_job_replays WHERE job_id=$1', [createdLoopId]);
    await pool.query("DELETE FROM background_jobs WHERE id=$1 OR dedup_key='media:cleanup:loop'", [accountJob]);
    if (original) await pool.query('INSERT INTO background_jobs SELECT * FROM json_populate_record(NULL::background_jobs,$1::json)', [JSON.stringify(original)]);
  });
  await pool.query("DELETE FROM background_jobs WHERE dedup_key='media:cleanup:loop'");
  await pool.query("INSERT INTO background_jobs(id,kind,dedup_key,payload,status,attempts,last_error) VALUES($1,'account_cleanup',$2,'{}','dead',8,'operation_failed')", [accountJob, `account:synthetic-${accountJob}`]);
  await ensureMediaCleanupLoop();
  const loop = async () => (await pool.query("SELECT * FROM background_jobs WHERE dedup_key='media:cleanup:loop'")).rows[0];
  const id = (await loop()).id;
  createdLoopId = id;
  for (const terminal of ['dead', 'complete']) {
    await pool.query("UPDATE background_jobs SET status=$1,attempts=8,lease_token=$2,lease_until=now()-interval '1 minute',available_at=now()+interval '1 hour',last_error='lease_expired' WHERE id=$3", [terminal, randomUUID(), id]);
    const before = Date.now();
    await ensureMediaCleanupLoop();
    const recovered = await loop();
    assert.equal(recovered.id, id);
    assert.equal(recovered.status, 'pending');
    assert.equal(recovered.attempts, 0);
    assert.equal(recovered.lease_token, null);
    assert.equal(recovered.lease_until, null);
    assert.equal(recovered.last_error, null);
    assert.ok(new Date(recovered.available_at).getTime() >= before - 1000);
    assert.ok(new Date(recovered.available_at).getTime() <= Date.now() + 1000);
    const finite = (await pool.query('SELECT status,attempts,last_error FROM background_jobs WHERE id=$1', [accountJob])).rows[0];
    assert.deepEqual(finite, { status: 'dead', attempts: 8, last_error: 'operation_failed' });
    const audit = (await pool.query('SELECT previous_attempts,previous_error,operator_reason FROM background_job_replays WHERE job_id=$1 ORDER BY id', [id])).rows;
    assert.deepEqual(audit, [{ previous_attempts: 8, previous_error: 'lease_expired', operator_reason: 'scheduled_cleanup_recovery' }],
      'dead recovery must retain history once; ordinary completed sweep rearm must not invent a failure replay');
  }
  for (const terminal of ['dead', 'complete']) {
    await pool.query("UPDATE background_jobs SET status=$1,attempts=8,lease_token=$2,lease_until=clock_timestamp()+interval '1 minute',last_error='operation_failed' WHERE id=$3", [terminal, randomUUID(), id]);
    const activeTerminal = await loop();
    await ensureMediaCleanupLoop();
    assert.deepEqual(await loop(), activeTerminal, 'even terminal state must not reset an unexpired lease');
    assert.equal((await pool.query('SELECT count(*)::int AS count FROM background_job_replays WHERE job_id=$1', [id])).rows[0].count, 1);
  }
  await pool.query("UPDATE background_jobs SET status='dead',lease_until=NULL WHERE id=$1", [id]);
  const malformed = await loop();
  await ensureMediaCleanupLoop();
  assert.deepEqual(await loop(), malformed, 'a terminal token without an expiry requires operator inspection');
  await pool.query("UPDATE background_jobs SET status='running',attempts=3,lease_token=$1,lease_until=now()+interval '1 minute',available_at=now()+interval '1 hour' WHERE id=$2", [randomUUID(), id]);
  const leased = await loop();
  await ensureMediaCleanupLoop();
  assert.deepEqual(await loop(), leased, 'an active lease must not be stolen or reset');
  await pool.query("UPDATE background_jobs SET status='pending',attempts=5,lease_token=NULL,lease_until=NULL,available_at=now()+interval '1 hour',last_error='operation_failed' WHERE id=$1", [id]);
  const backoff = await loop();
  await ensureMediaCleanupLoop();
  assert.deepEqual(await loop(), backoff, 'an ordinary pending retry retains its backoff');
});
