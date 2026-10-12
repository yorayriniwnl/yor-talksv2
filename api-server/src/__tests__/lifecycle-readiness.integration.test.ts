import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, test } from 'node:test';
import { pool } from '@workspace/db';
import { env } from '../config/env.js';
import { hasHealthyLifecycleWorker } from '../lib/worker-health.js';
import { BackgroundJobRepository } from '../repositories/background-job-repository.js';
import { renderLifecycleMetrics } from '../services/lifecycle-metrics-service.js';
import { operationalMetrics } from '../services/operational-metrics-service.js';
import { startLifecycleWorker } from '../workers/lifecycle-worker.js';

after(async () => { await operationalMetrics.close(); await pool.end(); });
async function until(check: () => Promise<boolean>) {
  const deadline = Date.now() + 10000;
  while (!(await check())) {
    if (Date.now() > deadline) throw new Error('synthetic lifecycle did not reach expected state');
    await new Promise(resolve => setTimeout(resolve, 25));
  }
}

test('lifecycle stop/stall is visible and restarting recovers preserved durable work without provider calls', async t => {
  const jobs = new BackgroundJobRepository();
  const key = `readiness-regression:${randomUUID()}`;
  let release!: () => void;
  const blocked = new Promise<void>(resolve => { release = resolve; });
  let started = false;
  const first = await startLifecycleWorker({ media_cleanup: async () => ({ retryAfterSeconds: 60 }), readiness_regression: async () => { started = true; await blocked; } });
  let second: Awaited<ReturnType<typeof startLifecycleWorker>> | undefined;
  const id = await jobs.enqueue('readiness_regression', key, { synthetic: true });
  const pendingId = await jobs.enqueue('readiness_regression', `${key}:recovery`, { synthetic: true }, 3600);
  t.after(async () => { release(); await first.close(); await second?.close(); await pool.query('DELETE FROM background_jobs WHERE id=ANY($1)', [[id, pendingId]]); });
  await until(async () => started);
  assert.equal(await hasHealthyLifecycleWorker(), true);
  await pool.query(`UPDATE runtime_heartbeats SET details=jsonb_set(details,'{activeStartedAt}',to_jsonb($2::bigint)) WHERE details->>'activeJob'=$1`,
    [id, Date.now() - (env.LIFECYCLE_JOB_STALL_SECONDS + 1) * 1000]);
  await pool.query(`UPDATE background_jobs SET updated_at=now()-$2*interval '1 second' WHERE id=$1`, [id, env.LIFECYCLE_JOB_STALL_SECONDS + 1]);
  assert.equal(await hasHealthyLifecycleWorker(), false, 'fresh heartbeat cannot mask stuck handler progress');
  const metrics = (await renderLifecycleMetrics()).join('\n');
  assert.match(metrics, /yor_lifecycle_jobs_stalled\{kind="other"\} 1/);
  assert.equal(metrics.includes(id), false);
  assert.equal(metrics.includes(key), false, 'job identity and payload must not become metric labels');
  release(); await first.close();
  assert.equal(await hasHealthyLifecycleWorker(), false, 'stopped worker removes its heartbeat');
  await pool.query("UPDATE background_jobs SET available_at=now() WHERE id=$1", [pendingId]);
  let recovered = 0;
  second = await startLifecycleWorker({ media_cleanup: async () => ({ retryAfterSeconds: 60 }), readiness_regression: async () => { recovered++; } });
  await until(async () => (await pool.query('SELECT status FROM background_jobs WHERE id=$1', [pendingId])).rows[0]?.status === 'complete');
  assert.equal(recovered, 1);
  assert.equal(await hasHealthyLifecycleWorker(), true);
  assert.equal((await pool.query('SELECT attempts,payload FROM background_jobs WHERE id=$1', [pendingId])).rows[0]?.attempts, 1);
});
