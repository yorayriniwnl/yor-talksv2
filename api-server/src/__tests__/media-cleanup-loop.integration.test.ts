import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { pool } from '@workspace/db';
import { ensureMediaCleanupLoop } from '../workers/lifecycle-worker.js';

after(() => pool.end());

test('permanent media sweep recovers terminal states while finite dead jobs and live/backoff leases remain unchanged', async t => {
  const original = (await pool.query("SELECT * FROM background_jobs WHERE dedup_key='media:cleanup:loop'")).rows[0];
  const accountJob = randomUUID();
  t.after(async () => {
    await pool.query("DELETE FROM background_jobs WHERE id=$1 OR dedup_key='media:cleanup:loop'", [accountJob]);
    if (original) await pool.query('INSERT INTO background_jobs SELECT * FROM json_populate_record(NULL::background_jobs,$1::json)', [JSON.stringify(original)]);
  });
  await pool.query("DELETE FROM background_jobs WHERE dedup_key='media:cleanup:loop'");
  await pool.query("INSERT INTO background_jobs(id,kind,dedup_key,payload,status,attempts,last_error) VALUES($1,'account_cleanup',$2,'{}','dead',8,'operation_failed')", [accountJob, `account:synthetic-${accountJob}`]);
  await ensureMediaCleanupLoop();
  const loop = async () => (await pool.query("SELECT * FROM background_jobs WHERE dedup_key='media:cleanup:loop'")).rows[0];
  const id = (await loop()).id;
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
  }
  await pool.query("UPDATE background_jobs SET status='running',attempts=3,lease_token=$1,lease_until=now()+interval '1 minute',available_at=now()+interval '1 hour' WHERE id=$2", [randomUUID(), id]);
  const leased = await loop();
  await ensureMediaCleanupLoop();
  assert.deepEqual(await loop(), leased, 'an active lease must not be stolen or reset');
  await pool.query("UPDATE background_jobs SET status='pending',attempts=5,lease_token=NULL,lease_until=NULL,available_at=now()+interval '1 hour',last_error='operation_failed' WHERE id=$1", [id]);
  const backoff = await loop();
  await ensureMediaCleanupLoop();
  assert.deepEqual(await loop(), backoff, 'an ordinary pending retry retains its backoff');
});
