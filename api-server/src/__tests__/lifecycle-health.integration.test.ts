import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, test } from 'node:test';
import { pool } from '@workspace/db';
import { BackgroundJobRepository } from '../repositories/background-job-repository.js';
import { inspectLifecycleHealth, renderLifecycleMetrics } from '../services/lifecycle-health.js';
import { ensureMediaCleanupLoop, startLifecycleWorker } from '../workers/lifecycle-worker.js';
import { assertIsolatedPostgres } from '../../../ops/test-infrastructure-guard.mjs';

const repository = new BackgroundJobRepository();
const workerId = `test-lifecycle:${randomUUID()}`;
const kinds = [`test_${randomUUID()}`];
const ids: string[] = [];
before(async () => {
  assert.equal(process.env.NODE_ENV, 'test');
  assert.ok(process.env.DATABASE_URL && process.env.REDIS_URL, 'explicit isolated infrastructure required');
  assertIsolatedPostgres(process.env);
  const identity = (await pool.query('SELECT current_database() AS database,inet_server_port() AS port')).rows[0];
  assertIsolatedPostgres(process.env, identity);
});
after(async () => {
  await pool.query('DELETE FROM runtime_heartbeats WHERE worker_id=$1', [workerId]);
  await pool.query('DELETE FROM background_job_replays WHERE job_id=ANY($1::uuid[])', [ids]);
  await pool.query('DELETE FROM background_jobs WHERE id=ANY($1::uuid[])', [ids]);
  await pool.end();
});

test('lifecycle health rejects missing handlers, stale heartbeat, stopped state and fresh but stalled handlers', async () => {
  await repository.heartbeat(workerId, { handlers: ['account_cleanup', 'media_cleanup'], healthy: true });
  assert.equal((await inspectLifecycleHealth()).ready, true);
  await repository.heartbeat(workerId, { handlers: ['account_cleanup'], healthy: true });
  assert.equal((await inspectLifecycleHealth()).ready, false);
  await repository.heartbeat(workerId, { handlers: ['account_cleanup', 'media_cleanup'], healthy: true, activeSince: new Date(Date.now() - 301000).toISOString() });
  assert.equal((await inspectLifecycleHealth()).ready, false);
  await repository.heartbeat(workerId, { handlers: ['account_cleanup', 'media_cleanup'], healthy: true });
  await pool.query("UPDATE runtime_heartbeats SET heartbeat_at=clock_timestamp()-interval '46 seconds' WHERE worker_id=$1", [workerId]);
  assert.equal((await inspectLifecycleHealth()).ready, false);
  await repository.heartbeat(workerId, { handlers: ['account_cleanup', 'media_cleanup'], healthy: false, stopping: true });
  assert.equal((await inspectLifecycleHealth()).ready, false);
});

test('expired leases recover with a new token, fence stale completion, and record real cleanup progress', async () => {
  const id = await repository.enqueue(kinds[0], `test-lease:${randomUUID()}`, {}); ids.push(id);
  const old = await repository.claim(kinds); assert.ok(old);
  await pool.query("UPDATE background_jobs SET lease_until=clock_timestamp()-interval '1 second' WHERE id=$1", [id]);
  await assert.rejects(repository.finish(old), /lease_lost/);
  const recovered = await repository.claim(kinds); assert.ok(recovered);
  assert.equal(recovered.id, id); assert.notEqual(recovered.lease_token, old.lease_token);
  assert.equal(recovered.attempts, 2);
  assert.equal(await repository.extend(old), false);
  await assert.rejects(repository.finish(old), /lease_lost/);
  await repository.finish(recovered);
  const row = (await pool.query('SELECT status,last_success_at,payload FROM background_jobs WHERE id=$1', [id])).rows[0];
  assert.equal(row.status, 'complete'); assert.ok(row.last_success_at); assert.deepEqual(row.payload, {});
  assert.ok((await inspectLifecycleHealth()).lastProgressTimestampSeconds > 0);
});

test('exhausted retries and abandoned eighth lease become dead letters; replay preserves retry history', async () => {
  const id = await repository.enqueue(kinds[0], `test-dead:${randomUUID()}`, {}); ids.push(id);
  for (let attempt = 1; attempt <= 8; attempt++) {
    const job = await repository.claim(kinds); assert.ok(job); assert.equal(job.attempts, attempt);
    await repository.fail(job, 'dependency_unavailable');
    await pool.query('UPDATE background_jobs SET available_at=clock_timestamp() WHERE id=$1', [id]);
  }
  assert.equal(await repository.claim(kinds), undefined);
  assert.ok((await inspectLifecycleHealth()).deadLetters > 0);
  await repository.replayDead(id, 'dependency_restored');
  const audit = (await pool.query('SELECT previous_attempts,previous_error FROM background_job_replays WHERE job_id=$1', [id])).rows[0];
  assert.equal(audit.previous_attempts, 8); assert.equal(audit.previous_error, 'dependency_unavailable');
  const retry = await repository.claim(kinds); assert.ok(retry);
  await assert.rejects(repository.replayDead(id, 'attempt_to_steal_lease'), /only_unleased_dead/);
  await pool.query("UPDATE background_jobs SET attempts=8,lease_until=clock_timestamp()-interval '1 second' WHERE id=$1", [id]);
  assert.equal(await repository.claim(kinds), undefined);
  assert.equal((await pool.query('SELECT status,last_error FROM background_jobs WHERE id=$1', [id])).rows[0].last_error, 'lease_expired');
  await repository.replayDead(id, 'expired_lease_recovered');
  assert.equal((await pool.query('SELECT count(*)::int AS count FROM background_job_replays WHERE job_id=$1', [id])).rows[0].count, 2);
});

test('recurring cleanup re-arms a dead sweep once while preserving its failure history and a live lease', async () => {
  await ensureMediaCleanupLoop();
  const id = (await pool.query("SELECT id FROM background_jobs WHERE dedup_key='media:cleanup:loop'")).rows[0].id;
  await pool.query("UPDATE background_jobs SET status='dead',attempts=8,last_error='dependency_unavailable',lease_token=NULL,lease_until=NULL WHERE id=$1", [id]);
  const previous = (await pool.query('SELECT count(*)::int AS count FROM background_job_replays WHERE job_id=$1', [id])).rows[0].count;
  await Promise.all([ensureMediaCleanupLoop(), ensureMediaCleanupLoop()]);
  const audit = (await pool.query('SELECT * FROM background_job_replays WHERE job_id=$1 ORDER BY id DESC LIMIT 1', [id])).rows[0];
  assert.equal(audit.previous_attempts, 8); assert.equal(audit.previous_error, 'dependency_unavailable');
  assert.equal(audit.operator_reason, 'scheduled_cleanup_recovery');
  assert.equal((await pool.query('SELECT count(*)::int AS count FROM background_job_replays WHERE job_id=$1', [id])).rows[0].count, previous + 1);
  const active = await repository.claim(['media_cleanup']); assert.ok(active);
  await ensureMediaCleanupLoop();
  assert.equal((await pool.query('SELECT lease_token FROM background_jobs WHERE id=$1', [id])).rows[0].lease_token, active.lease_token);
  await repository.defer(active, 60);
});

test('operator replay recovers legacy finite expired leases with audit and stale-token fencing while refusing live or ambiguous leases', async () => {
  const kind = `test_legacy_${randomUUID()}`;
  const id = await repository.enqueue(kind, `test-legacy:${randomUUID()}`, {}); ids.push(id);
  const old = await repository.claim([kind]); assert.ok(old);
  await pool.query("UPDATE background_jobs SET status='dead',attempts=8,last_error='legacy_expired' WHERE id=$1", [id]);
  const live = (await pool.query('SELECT * FROM background_jobs WHERE id=$1', [id])).rows[0];
  await assert.rejects(repository.replayDead(id, 'dependency_restored'), /only_unleased_dead/);
  assert.deepEqual((await pool.query('SELECT * FROM background_jobs WHERE id=$1', [id])).rows[0], live);
  await pool.query('UPDATE background_jobs SET lease_until=NULL WHERE id=$1', [id]);
  await assert.rejects(repository.replayDead(id, 'ambiguous_lease'), /only_unleased_dead/);
  assert.equal((await pool.query('SELECT count(*)::int AS count FROM background_job_replays WHERE job_id=$1', [id])).rows[0].count, 0);
  await pool.query("UPDATE background_jobs SET lease_until=clock_timestamp()-interval '1 second' WHERE id=$1", [id]);
  await repository.replayDead(id, 'legacy_lease_recovered');
  assert.deepEqual((await pool.query('SELECT status,attempts,last_error,lease_token,lease_until FROM background_jobs WHERE id=$1', [id])).rows[0],
    { status: 'pending', attempts: 0, last_error: null, lease_token: null, lease_until: null });
  assert.deepEqual((await pool.query('SELECT previous_attempts,previous_error,operator_reason FROM background_job_replays WHERE job_id=$1', [id])).rows,
    [{ previous_attempts: 8, previous_error: 'legacy_expired', operator_reason: 'legacy_lease_recovered' }]);
  await assert.rejects(repository.finish(old), /lease_lost/);
  const recovered = await repository.claim([kind]); assert.ok(recovered); assert.notEqual(recovered.lease_token, old.lease_token);
  await assert.rejects(repository.finish(old), /lease_lost/); await assert.rejects(repository.fail(old, 'late_failure'), /lease_lost/);
  await repository.finish(recovered);
});

async function until(predicate: () => Promise<boolean>, timeoutMs = 5000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await predicate()) return;
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  throw new Error('expected lifecycle transition did not occur');
}

test('permanently hung handler stops lease renewal, becomes unhealthy, shuts down boundedly and can be reclaimed without stale completion', async t => {
  await pool.query('DELETE FROM runtime_heartbeats WHERE worker_id=$1', [workerId]);
  const kind = `test_hung_${randomUUID()}`;
  const id = await repository.enqueue(kind, `test-hung:${randomUUID()}`, {}); ids.push(id);
  let release!: () => void; let started = false; let aborted = false;
  const pending = new Promise<void>(resolve => { release = resolve; });
  let releaseHeartbeat!: () => void; let publishingUnhealthy = false;
  const heldHeartbeat = new Promise<void>(resolve => { releaseHeartbeat = resolve; });
  const delayedHeartbeat = Object.create(repository) as BackgroundJobRepository;
  delayedHeartbeat.heartbeat = async (id, details) => {
    if (details?.healthy === false && details.activeSince) {
      publishingUnhealthy = true; await heldHeartbeat;
    }
    await repository.heartbeat(id, details);
  };
  let first: Awaited<ReturnType<typeof startLifecycleWorker>> | undefined;
  let second: Awaited<ReturnType<typeof startLifecycleWorker>> | undefined;
  t.after(async () => {
    // Assertions must not strand worker Redis handles or a pending heartbeat.
    releaseHeartbeat();
    await Promise.allSettled([first?.close(), second?.close()]);
    release();
  });
  first = await startLifecycleWorker({
    media_cleanup: async () => ({ retryAfterSeconds: 60 }),
    [kind]: async (_job, context) => {
      started = true; context.signal.addEventListener('abort', () => { aborted = true; });
      await pending; // Deliberately ignores cancellation to model a stuck dependency.
    },
  }, { repository: delayedHeartbeat, pollIntervalMs: 10, leaseHeartbeatMs: 20, stallAfterMs: 100, shutdownTimeoutMs: 30 });
  await until(async () => started && aborted && !first!.isHealthy() && publishingUnhealthy);
  // Local cancellation precedes the durable health commit. Make that ordering
  // deterministic, then observe the committed transition used by readiness.
  assert.equal((await inspectLifecycleHealth()).ready, true);
  releaseHeartbeat();
  await until(async () => !(await inspectLifecycleHealth()).ready);
  assert.equal((await inspectLifecycleHealth()).ready, false);
  const begin = Date.now(); await first.close();
  assert.ok(Date.now() - begin < 1000, 'shutdown must not wait forever for the hung handler');
  await pool.query("UPDATE background_jobs SET lease_until=clock_timestamp()-interval '1 second' WHERE id=$1", [id]);
  let completed = 0;
  second = await startLifecycleWorker({ media_cleanup: async () => ({ retryAfterSeconds: 60 }),
    [kind]: async () => { completed++; } }, { pollIntervalMs: 10 });
  await until(async () => (await pool.query('SELECT status FROM background_jobs WHERE id=$1', [id])).rows[0].status === 'complete');
  release(); await second.close();
  assert.equal(completed, 1);
  const row = (await pool.query('SELECT status,attempts,lease_token FROM background_jobs WHERE id=$1', [id])).rows[0];
  assert.equal(row.status, 'complete'); assert.equal(row.attempts, 2); assert.equal(row.lease_token, null);
  assert.equal((await inspectLifecycleHealth()).ready, false);
});

test('lease dependency failure aborts work and publishes unhealthy state; expired failures are fenced', async () => {
  const kind = `test_outage_${randomUUID()}`;
  const id = await repository.enqueue(kind, `test-outage:${randomUUID()}`, {}); ids.push(id);
  const outage = Object.create(repository) as BackgroundJobRepository;
  let calls = 0, release!: () => void, aborted = false;
  const pending = new Promise<void>(resolve => { release = resolve; });
  outage.extend = async job => { if (++calls > 1) throw new Error('injected lease datastore outage'); return repository.extend(job); };
  const worker = await startLifecycleWorker({ media_cleanup: async () => ({ retryAfterSeconds: 60 }),
    [kind]: async (_job, context) => { context.signal.addEventListener('abort', () => { aborted = true; }); await pending; } },
  { repository: outage, pollIntervalMs: 10, leaseHeartbeatMs: 20, shutdownTimeoutMs: 30 });
  await until(async () => aborted && !(await inspectLifecycleHealth()).ready);
  await worker.close(); release();
  const row = (await pool.query('SELECT * FROM background_jobs WHERE id=$1', [id])).rows[0];
  await pool.query("UPDATE background_jobs SET lease_until=clock_timestamp()-interval '1 second' WHERE id=$1", [id]);
  await assert.rejects(repository.fail(row, 'late_failure'), /lease_lost/);
  const recovered = await repository.claim([kind]); assert.ok(recovered);
  await repository.finish(recovered);
});

test('real worker stop/restart publishes health and cleanup success independently from heartbeat', async () => {
  await pool.query('DELETE FROM runtime_heartbeats WHERE worker_id=$1', [workerId]);
  const first = await startLifecycleWorker({ media_cleanup: async () => ({ retryAfterSeconds: 60 }) });
  assert.equal((await inspectLifecycleHealth()).ready, true);
  await first.close(); assert.equal(first.isHealthy(), false);
  assert.equal((await inspectLifecycleHealth()).ready, false);
  const second = await startLifecycleWorker({ media_cleanup: async () => ({ retryAfterSeconds: 60 }) });
  assert.equal((await inspectLifecycleHealth()).ready, true);
  await second.close();
  const metrics = (await renderLifecycleMetrics()).join('\n');
  assert.match(metrics, /yor_lifecycle_ready 0/);
  assert.equal(metrics.includes(workerId), false);
  assert.equal(metrics.includes('payload'), false);
});
