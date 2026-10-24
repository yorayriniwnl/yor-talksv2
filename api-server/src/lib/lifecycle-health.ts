import { pool } from "@workspace/db";
import { getLifecycleWorkerStatus } from './worker-health.js';
import { CLEANUP_JOB_KINDS, PERMANENT_SWEEP_KINDS } from './lifecycle-jobs.js';

export type LifecycleHealth = {
  workerUp: boolean;
  overdueCleanupJobs: number;
  deadCleanupJobs: number;
  /** Permanent sweeps whose most recent run failed. A sweep is revived after
   * it dead-letters, so its dead state is brief; this count stays set until
   * a run succeeds and is what reveals a sweep that fails on every attempt. */
  failingCleanupJobs: number;
};

/** Operational status for durable account, media, privacy and message cleanup work. */
export async function inspectLifecycleHealth(): Promise<LifecycleHealth> {
  const [result, worker] = await Promise.all([pool.query(`
    SELECT
      COUNT(*) FILTER (WHERE status='dead')::int AS dead_cleanup_jobs,
      COUNT(*) FILTER (
        WHERE (status='pending' AND available_at < clock_timestamp() - interval '5 minutes')
          OR (status='running' AND lease_until IS NOT NULL AND lease_until < clock_timestamp())
      )::int AS overdue_cleanup_jobs,
      COUNT(*) FILTER (WHERE kind=ANY($2::text[]) AND last_error IS NOT NULL)::int AS failing_cleanup_jobs
    FROM background_jobs
    WHERE kind=ANY($1::text[])
      AND status IN ('pending','running','dead')
  `, [CLEANUP_JOB_KINDS, PERMANENT_SWEEP_KINDS]), getLifecycleWorkerStatus({ heartbeatGraceSeconds: 45, requiredHandler: 'account_cleanup' })]);
  const row = result.rows[0] as {
    dead_cleanup_jobs?: number | string; overdue_cleanup_jobs?: number | string; failing_cleanup_jobs?: number | string;
  } | undefined;
  return {
    workerUp: worker.healthy,
    overdueCleanupJobs: Number(row?.overdue_cleanup_jobs ?? 0),
    deadCleanupJobs: Number(row?.dead_cleanup_jobs ?? 0),
    failingCleanupJobs: Number(row?.failing_cleanup_jobs ?? 0),
  };
}
