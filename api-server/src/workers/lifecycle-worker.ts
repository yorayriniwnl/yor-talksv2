import { randomUUID } from 'node:crypto';
import { pool } from '@workspace/db';
import { BackgroundJobRepository, type BackgroundJob } from '../repositories/background-job-repository.js';
import { RedisRepository } from '../repositories/redis-repository.js';
import { logger } from '../lib/logger.js';
import { MediaService } from '../services/media-service.js';

export type LifecycleHandler = (job: BackgroundJob) => Promise<void | { retryAfterSeconds: number }>;

/** Unlike a finite account cleanup request, this job represents a permanent
 * sweep. Recover its terminal state without disturbing a live worker lease. */
export async function ensureMediaCleanupLoop(): Promise<void> {
  await pool.query(`INSERT INTO background_jobs(id,kind,dedup_key,payload,available_at)
    VALUES($1,'media_cleanup','media:cleanup:loop','{}',now())
    ON CONFLICT(dedup_key) DO UPDATE SET status='pending',attempts=0,
      lease_token=NULL,lease_until=NULL,last_error=NULL,available_at=now(),updated_at=now()
    WHERE background_jobs.kind='media_cleanup' AND background_jobs.status IN ('complete','dead')`, [randomUUID()]);
}

export async function cleanAccountSessions(job: BackgroundJob, redis: RedisRepository): Promise<void> {
  const userId = job.payload.userId;
  if (typeof userId !== 'string') throw new Error('invalid_job');
  const sessions = await redis.scanStrict(`session:${userId}:*`);
  for (const key of sessions) await redis.delStrict(key);
  const index = `login-approvals:user:${userId}`;
  for (const id of await redis.getSetStrict(index)) await redis.delStrict(`login-approval:${id}`);
  await redis.delStrict(index);
}

export async function startLifecycleWorker(additionalHandlers: Record<string, LifecycleHandler> = {}) {
  const jobs = new BackgroundJobRepository();
  const redis = new RedisRepository();
  const workerId = `lifecycle:${randomUUID()}`;
  const media = new MediaService();
  await ensureMediaCleanupLoop();
  let nextMediaSweepCheck = Date.now() + 60_000;
  const handlers: Record<string, LifecycleHandler> = {
    account_cleanup: job => cleanAccountSessions(job, redis),
    media_cleanup: async () => { await media.cleanup(); return { retryAfterSeconds: 60 }; },
    ...additionalHandlers,
  };
  await jobs.heartbeat(workerId, { handlers: Object.keys(handlers) });
  let stopping = false, busy = false, healthy = true;
  let running: Promise<void> = Promise.resolve();

  const tick = async () => {
    if (stopping || busy) return;
    busy = true;
    try {
      if (Date.now() >= nextMediaSweepCheck) {
        await ensureMediaCleanupLoop();
        nextMediaSweepCheck = Date.now() + 60_000;
      }
      await jobs.heartbeat(workerId, { handlers: Object.keys(handlers) });
      const job = await jobs.claim(Object.keys(handlers));
      healthy = true;
      if (!job) return;
      const lease = setInterval(() => void Promise.all([jobs.extend(job), jobs.heartbeat(workerId, { activeJob: job.id, handlers: Object.keys(handlers) })])
        .catch(() => { healthy = false; }), 10_000);
      lease.unref();
      try {
        const result = await handlers[job.kind]!(job);
        if (result) await jobs.defer(job, result.retryAfterSeconds);
        else await jobs.finish(job);
      } catch (error) {
        const code = error instanceof Error ? error.name : 'operation_failed';
        await jobs.fail(job, code);
        logger.error({ jobId: job.id, kind: job.kind, attempt: job.attempts, code }, 'Lifecycle job failed; retry or dead-letter recorded');
      } finally { clearInterval(lease); }
    } catch {
      healthy = false;
      logger.error({ workerId }, 'Lifecycle worker dependency unavailable');
    } finally { busy = false; }
  };
  const timer = setInterval(() => { if (!busy && !stopping) running = tick(); }, 1_000);
  timer.unref();
  running = tick();
  return {
    isHealthy: () => healthy && !stopping,
    async close() {
      stopping = true; clearInterval(timer);
      await running;
      await pool.query('DELETE FROM runtime_heartbeats WHERE worker_id=$1', [workerId]);
      await redis.disconnect();
    },
  };
}
