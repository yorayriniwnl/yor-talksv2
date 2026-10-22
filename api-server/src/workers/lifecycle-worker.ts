import { randomUUID } from 'node:crypto';
import { pool } from '@workspace/db';
import { BackgroundJobRepository, type BackgroundJob } from '../repositories/background-job-repository.js';
import { RedisRepository } from '../repositories/redis-repository.js';
import { logger } from '../lib/logger.js';
import { MediaService } from '../services/media-service.js';
import { purgeHiddenMessageContent } from '../services/message-retention-service.js';

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

export async function ensurePrivacyCleanupLoop(): Promise<void> {
  await pool.query(`INSERT INTO background_jobs(id,kind,dedup_key,payload,available_at)
    VALUES($1,'privacy_cleanup','privacy:cleanup:loop','{}',now())
    ON CONFLICT(dedup_key) DO UPDATE SET status='pending',attempts=0,
      lease_token=NULL,lease_until=NULL,last_error=NULL,available_at=now(),updated_at=now()
    WHERE background_jobs.kind='privacy_cleanup' AND background_jobs.status IN ('complete','dead')`,[randomUUID()]);
}

export async function ensureMessageCleanupLoop(): Promise<void> {
  await pool.query(`INSERT INTO background_jobs(id,kind,dedup_key,payload,available_at)
    VALUES($1,'message_cleanup','message:cleanup:loop','{}',now())
    ON CONFLICT(dedup_key) DO UPDATE SET status='pending',attempts=0,
      lease_token=NULL,lease_until=NULL,last_error=NULL,available_at=now(),updated_at=now()
    WHERE background_jobs.kind='message_cleanup' AND background_jobs.status IN ('complete','dead')`,[randomUUID()]);
}

/** Remove expired verification authority in bounded, concurrent-safe batches.
 * Completed rights evidence, consent history and erasure journals are retained. */
export async function expirePrivacyChallenges(): Promise<number> {
  const result = await pool.query(`WITH expired AS (
    SELECT id FROM privacy_rights_requests WHERE status='pending_verification'
      AND verification_expires_at<=clock_timestamp()
    ORDER BY verification_expires_at,id FOR UPDATE SKIP LOCKED LIMIT 1000
  ) UPDATE privacy_rights_requests p SET status='expired',verification_token_hash=NULL,verification_expires_at=NULL
    FROM expired WHERE p.id=expired.id`);
  return result.rowCount ?? 0;
}

export async function cleanAccountSessions(job: BackgroundJob, redis: RedisRepository): Promise<void> {
  const userId = job.payload.userId;
  if (typeof userId !== 'string' || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(userId)) throw new Error('invalid_job');
  const emailHash = job.payload.emailHash;
  if (emailHash !== undefined && (typeof emailHash !== 'string' || !/^[a-f0-9]{64}$/.test(emailHash))) throw new Error('invalid_job');
  const sessions = await redis.scanStrict(`session:${userId}:*`);
  for (const key of sessions) await redis.delStrict(key);
  const index = `login-approvals:user:${userId}`;
  for (const id of await redis.getSetStrict(index)) await redis.delStrict(`login-approval:${id}`);
  await redis.delStrict(index);
  await redis.delStrict(`totp-setup:${userId}`);
  // Older jobs lack this optional locator and rely on the OTP's five-minute
  // TTL. Store only the locator hash, never the email or credential payload.
  if (typeof emailHash === 'string') await redis.deleteEmailOtpForUserStrict(`email-login-otp:${emailHash}`, userId);
}

export async function startLifecycleWorker(additionalHandlers: Record<string, LifecycleHandler> = {}) {
  const jobs = new BackgroundJobRepository();
  const redis = new RedisRepository();
  const workerId = `lifecycle:${randomUUID()}`;
  const media = new MediaService();
  await ensureMediaCleanupLoop();
  await ensurePrivacyCleanupLoop();
  await ensureMessageCleanupLoop();
  let nextMediaSweepCheck = Date.now() + 60_000;
  const handlers: Record<string, LifecycleHandler> = {
    account_cleanup: job => cleanAccountSessions(job, redis),
    media_cleanup: async () => { await media.cleanup(); return { retryAfterSeconds: 60 }; },
    privacy_cleanup: async () => ({ retryAfterSeconds: await expirePrivacyChallenges() === 1000 ? 5 : 60 }),
    message_cleanup: async () => ({ retryAfterSeconds: await purgeHiddenMessageContent() === 500 ? 5 : 60 }),
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
        await ensurePrivacyCleanupLoop();
        await ensureMessageCleanupLoop();
        nextMediaSweepCheck = Date.now() + 60_000;
      }
      await jobs.heartbeat(workerId, { handlers: Object.keys(handlers) });
      const job = await jobs.claim(Object.keys(handlers));
      healthy = true;
      if (!job) return;
      const activeJobStartedAt = new Date().toISOString();
      const lease = setInterval(() => void Promise.all([jobs.extend(job), jobs.heartbeat(workerId, {
        activeJob: job.id, activeJobStartedAt, handlers: Object.keys(handlers),
      })])
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
