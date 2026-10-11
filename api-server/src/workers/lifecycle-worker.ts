import { randomUUID } from 'node:crypto';
import { pool } from '@workspace/db';
import { BackgroundJobRepository, type BackgroundJob } from '../repositories/background-job-repository.js';
import { RedisRepository } from '../repositories/redis-repository.js';
import { logger } from '../lib/logger.js';
import { MediaService } from '../services/media-service.js';
import { LIFECYCLE_STALL_SECONDS } from '../services/lifecycle-health.js';
import { Queue } from 'bullmq';
import { env } from '../config/env.js';
import { maintainNotificationQueue } from '../lib/notification-queue-maintenance.js';

export type LifecycleHandler = (job: BackgroundJob, context: { signal: AbortSignal }) => Promise<void | { retryAfterSeconds: number }>;
export type LifecycleWorkerOptions = {
  repository?: BackgroundJobRepository;
  pollIntervalMs?: number;
  leaseHeartbeatMs?: number;
  stallAfterMs?: number;
  shutdownTimeoutMs?: number;
};

/** Unlike a finite account cleanup request, this job represents a permanent
 * sweep. Recover its terminal state without disturbing a live worker lease. */
export async function ensureMediaCleanupLoop(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`INSERT INTO background_jobs(id,kind,dedup_key,payload,available_at)
      VALUES($1,'media_cleanup','media:cleanup:loop','{}',clock_timestamp()) ON CONFLICT(dedup_key) DO NOTHING`, [randomUUID()]);
    const job = (await client.query(`SELECT id,status,attempts,last_error,lease_token,lease_until,
      lease_until>clock_timestamp() AS lease_active FROM background_jobs
      WHERE dedup_key='media:cleanup:loop' AND kind='media_cleanup' FOR UPDATE`)).rows[0];
    // Old crash records can be terminal with an expired token still attached.
    // A token with no expiry is ambiguous and remains for operator inspection.
    const leaseAbsent = job && !job.lease_token && !job.lease_until;
    const leaseExpired = job?.lease_until && !job.lease_active;
    if (job && ['complete', 'dead'].includes(job.status) && (leaseAbsent || leaseExpired)) {
      if (job.status === 'dead') {
        await client.query(`INSERT INTO background_job_replays(job_id,previous_attempts,previous_error,operator_reason)
          VALUES($1,$2,$3,'scheduled_cleanup_recovery')`, [job.id, job.attempts, job.last_error]);
      }
      await client.query(`UPDATE background_jobs SET status='pending',attempts=0,last_error=NULL,lease_token=NULL,lease_until=NULL,
        available_at=clock_timestamp(),updated_at=clock_timestamp() WHERE id=$1`, [job.id]);
    }
    await client.query('COMMIT');
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}

export async function cleanAccountSessions(job: BackgroundJob, redis: RedisRepository, signal?: AbortSignal): Promise<void> {
  const userId = job.payload.userId;
  if (typeof userId !== 'string') throw new Error('invalid_job');
  const sessions = await redis.scanStrict(`session:${userId}:*`);
  for (const key of sessions) { signal?.throwIfAborted(); await redis.delStrict(key); }
  const index = `login-approvals:user:${userId}`;
  for (const id of await redis.getSetStrict(index)) { signal?.throwIfAborted(); await redis.delStrict(`login-approval:${id}`); }
  await redis.delStrict(index);
  signal?.throwIfAborted();
  // Account deletion must also erase retained pre-upgrade queue payloads. The
  // periodic notification sweep is recovery, not the only erasure boundary.
  const queue = new Queue('defaultQueue', { connection: { url: env.REDIS_URL } });
  try { await maintainNotificationQueue(queue, signal); } finally { await queue.close(); }
}

export async function startLifecycleWorker(additionalHandlers: Record<string, LifecycleHandler> = {}, options: LifecycleWorkerOptions = {}) {
  const jobs = options.repository ?? new BackgroundJobRepository();
  const redis = new RedisRepository();
  const workerId = `lifecycle:${randomUUID()}`;
  const media = new MediaService();
  await ensureMediaCleanupLoop();
  let nextMediaSweepCheck = Date.now() + 60_000;
  const handlers: Record<string, LifecycleHandler> = {
    account_cleanup: (job, context) => cleanAccountSessions(job, redis, context.signal),
    // A bounded batch stays within the handler's five-minute progress budget.
    media_cleanup: async () => { await media.cleanup(10); return { retryAfterSeconds: 60 }; },
    ...additionalHandlers,
  };
  await jobs.heartbeat(workerId, { handlers: Object.keys(handlers), healthy: true });
  let stopping = false, busy = false, healthy = true;
  let activeSince: number | null = null, recoveryFailures = 0;
  let running: Promise<void> = Promise.resolve();
  let activeAbort: AbortController | null = null;
  let heartbeatWork = Promise.resolve();
  const stallAfterMs = options.stallAfterMs ?? LIFECYCLE_STALL_SECONDS * 1000;
  const heartbeat = (details: Record<string, unknown>) => {
    const next = heartbeatWork.catch(() => undefined).then(() => jobs.heartbeat(workerId, details));
    heartbeatWork = next;
    return next;
  };

  const tick = async () => {
    if (stopping || busy) return;
    busy = true;
    try {
      if (Date.now() >= nextMediaSweepCheck) {
        await ensureMediaCleanupLoop();
        nextMediaSweepCheck = Date.now() + 60_000;
      }
      await heartbeat({ handlers: Object.keys(handlers), healthy: true, recoveryFailures });
      const job = await jobs.claim(Object.keys(handlers));
      healthy = true;
      if (!job) return;
      activeSince = Date.now();
      const controller = new AbortController(); activeAbort = controller;
      const startedAt = activeSince;
      let leaseLost = false, stalled = false;
      let pulse = Promise.resolve();
      const publish = async () => {
        if (stopping || stalled || leaseLost) return;
        const extended = await jobs.extend(job);
        if (!extended) throw new Error('lease_lost');
        if (stopping || stalled || leaseLost) return;
        await heartbeat({ activeSince: new Date(startedAt).toISOString(), handlers: Object.keys(handlers), healthy, recoveryFailures });
      };
      await publish();
      const lease = setInterval(() => {
        pulse = pulse.then(publish).catch(() => {
          leaseLost = true; healthy = false; recoveryFailures++;
          controller.abort(new Error('lease_lost'));
          if (!stopping) return heartbeat({ activeSince: new Date(startedAt).toISOString(), handlers: Object.keys(handlers), healthy: false, recoveryFailures }).catch(() => undefined);
        });
      }, options.leaseHeartbeatMs ?? 10_000);
      lease.unref();
      const deadline = setTimeout(() => {
        stalled = true; healthy = false; clearInterval(lease);
        controller.abort(new Error('handler_stalled'));
        if (!stopping) void heartbeat({ activeSince: new Date(startedAt).toISOString(), handlers: Object.keys(handlers), healthy: false, recoveryFailures }).catch(() => undefined);
      }, stallAfterMs);
      deadline.unref();
      try {
        const result = await handlers[job.kind]!(job, { signal: controller.signal });
        clearInterval(lease); await pulse;
        if (stopping || stalled || leaseLost) throw new Error('lease_lost');
        if (result) await jobs.defer(job, result.retryAfterSeconds);
        else await jobs.finish(job);
      } catch (error) {
        const code = stalled ? 'handler_stalled' : error instanceof Error ? error.name : 'operation_failed';
        // A late/stopped process has no authority to mutate an expired/reclaimed
        // job. Its handler must preserve its own entity-level idempotency too.
        if (!stopping && !leaseLost) {
          await jobs.fail(job, code);
          logger.error({ jobId: job.id, kind: job.kind, attempt: job.attempts, code }, 'Lifecycle job failed; retry or dead-letter recorded');
        }
      } finally {
        clearInterval(lease); clearTimeout(deadline); await pulse;
        activeAbort = null; activeSince = null;
      }
    } catch {
      healthy = false;
      recoveryFailures++;
      activeSince = null; activeAbort = null;
      if (!stopping) await heartbeat({ handlers: Object.keys(handlers), healthy: false, recoveryFailures }).catch(() => undefined);
      logger.error({ workerId }, 'Lifecycle worker dependency unavailable');
    } finally { busy = false; }
  };
  const timer = setInterval(() => { if (!busy && !stopping) running = tick(); }, options.pollIntervalMs ?? 1_000);
  timer.unref();
  running = tick();
  return {
    isHealthy: () => healthy && !stopping && (activeSince === null || Date.now() - activeSince < stallAfterMs),
    async close() {
      stopping = true; clearInterval(timer);
      activeAbort?.abort(new Error('worker_stopping'));
      const stoppedHeartbeat = heartbeat({ handlers: Object.keys(handlers), stopping: true, healthy: false, recoveryFailures });
      let timeout: ReturnType<typeof setTimeout> | undefined;
      try {
        await Promise.race([
          Promise.allSettled([running, stoppedHeartbeat]),
          new Promise<void>(resolve => { timeout = setTimeout(resolve, options.shutdownTimeoutMs ?? 5_000); }),
        ]);
      } finally { if (timeout) clearTimeout(timeout); await redis.disconnect(); }
    },
  };
}
