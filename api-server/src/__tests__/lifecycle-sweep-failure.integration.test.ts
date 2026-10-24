import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { pool } from '@workspace/db';
import { BackgroundJobRepository } from '../repositories/background-job-repository.js';
import { ensureMessageCleanupLoop } from '../workers/lifecycle-worker.js';
import { inspectLifecycleHealth } from '../lib/lifecycle-health.js';

after(() => pool.end());

const loopKey = 'message:cleanup:loop';
const loop = async () => (await pool.query(
  'SELECT status,attempts,last_error FROM background_jobs WHERE dedup_key=$1', [loopKey])).rows[0];

test('a permanent sweep that fails on every run stays visible across revival until a run succeeds', async t => {
  const original = (await pool.query('SELECT * FROM background_jobs WHERE dedup_key=$1', [loopKey])).rows[0];
  t.after(async () => {
    await pool.query('DELETE FROM background_jobs WHERE dedup_key=$1', [loopKey]);
    if (original) await pool.query('INSERT INTO background_jobs SELECT * FROM json_populate_record(NULL::background_jobs,$1::json)', [JSON.stringify(original)]);
  });
  await pool.query('DELETE FROM background_jobs WHERE dedup_key=$1', [loopKey]);
  const baseline = await inspectLifecycleHealth();
  await ensureMessageCleanupLoop();

  const jobs = new BackgroundJobRepository();
  const runOnce = async (outcome: 'fail' | 'succeed') => {
    // Skip the backoff delay; the worker would claim the row once it is due.
    await pool.query('UPDATE background_jobs SET available_at=now() WHERE dedup_key=$1', [loopKey]);
    const job = await jobs.claim(['message_cleanup']);
    assert.ok(job, 'the sweep must be claimable once due');
    if (outcome === 'fail') await jobs.fail(job, 'Error');
    else await jobs.defer(job, 60);
  };

  for (let attempt = 1; attempt <= 8; attempt++) await runOnce('fail');
  assert.deepEqual(await loop(), { status: 'dead', attempts: 8, last_error: 'Error' });
  let health = await inspectLifecycleHealth();
  assert.equal(health.deadCleanupJobs, baseline.deadCleanupJobs + 1);
  assert.equal(health.failingCleanupJobs, baseline.failingCleanupJobs + 1);

  // The worker revives the sweep within a minute. The dead-letter count
  // returns to its baseline, so only the failing count can reveal the fault.
  await ensureMessageCleanupLoop();
  assert.deepEqual(await loop(), { status: 'pending', attempts: 0, last_error: 'Error' });
  health = await inspectLifecycleHealth();
  assert.equal(health.deadCleanupJobs, baseline.deadCleanupJobs);
  assert.equal(health.failingCleanupJobs, baseline.failingCleanupJobs + 1);

  await runOnce('fail');
  assert.equal((await inspectLifecycleHealth()).failingCleanupJobs, baseline.failingCleanupJobs + 1);

  await runOnce('succeed');
  assert.deepEqual(await loop(), { status: 'pending', attempts: 0, last_error: null });
  assert.equal((await inspectLifecycleHealth()).failingCleanupJobs, baseline.failingCleanupJobs);
});

test('a finite cleanup failure is not reported as a failing sweep', async t => {
  const id = (await pool.query(`INSERT INTO background_jobs(id,kind,dedup_key,payload,status,attempts,last_error)
    VALUES(gen_random_uuid(),'account_cleanup','account:synthetic-'||gen_random_uuid(),'{}','pending',2,'Error') RETURNING id`)).rows[0].id;
  t.after(async () => { await pool.query('DELETE FROM background_jobs WHERE id=$1', [id]); });
  const failing = await inspectLifecycleHealth();
  await pool.query('UPDATE background_jobs SET last_error=NULL WHERE id=$1', [id]);
  const cleared = await inspectLifecycleHealth();
  assert.equal(cleared.failingCleanupJobs, failing.failingCleanupJobs, 'finite jobs surface through retries and the dead-letter count instead');
});
