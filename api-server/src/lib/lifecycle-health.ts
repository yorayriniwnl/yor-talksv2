import { pool } from "@workspace/db";
import { getLifecycleWorkerStatus } from './worker-health.js';

export type LifecycleHealth = {
  workerUp: boolean;
  overdueCleanupJobs: number;
  deadCleanupJobs: number;
};

/** Operational status for durable account, media and privacy cleanup work. */
export async function inspectLifecycleHealth(): Promise<LifecycleHealth> {
  const [result, worker] = await Promise.all([pool.query(`
    SELECT
      COUNT(*) FILTER (WHERE status='dead')::int AS dead_cleanup_jobs,
      COUNT(*) FILTER (
        WHERE (status='pending' AND available_at < clock_timestamp() - interval '5 minutes')
          OR (status='running' AND lease_until IS NOT NULL AND lease_until < clock_timestamp())
      )::int AS overdue_cleanup_jobs
    FROM background_jobs
    WHERE kind IN ('account_cleanup','media_cleanup','privacy_cleanup','message_cleanup')
      AND status IN ('pending','running','dead')
  `), getLifecycleWorkerStatus({ heartbeatGraceSeconds: 45, requiredHandler: 'account_cleanup' })]);
  const row = result.rows[0] as { dead_cleanup_jobs?: number | string; overdue_cleanup_jobs?: number | string } | undefined;
  return {
    workerUp: worker.healthy,
    overdueCleanupJobs: Number(row?.overdue_cleanup_jobs ?? 0),
    deadCleanupJobs: Number(row?.dead_cleanup_jobs ?? 0),
  };
}
