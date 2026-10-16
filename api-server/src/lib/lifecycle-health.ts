import { pool } from "@workspace/db";

export type LifecycleHealth = {
  workerUp: boolean;
  overdueCleanupJobs: number;
  deadCleanupJobs: number;
};

/** Operational status for durable account and media cleanup work. */
export async function inspectLifecycleHealth(): Promise<LifecycleHealth> {
  const result = await pool.query(`
    SELECT
      EXISTS (
        SELECT 1 FROM runtime_heartbeats
        WHERE kind='lifecycle'
          AND heartbeat_at > clock_timestamp() - interval '45 seconds'
          AND details->'handlers' ? 'account_cleanup'
      ) AS worker_up,
      COUNT(*) FILTER (WHERE status='dead')::int AS dead_cleanup_jobs,
      COUNT(*) FILTER (
        WHERE (status='pending' AND available_at < clock_timestamp() - interval '5 minutes')
          OR (status='running' AND lease_until IS NOT NULL AND lease_until < clock_timestamp())
      )::int AS overdue_cleanup_jobs
    FROM background_jobs
    WHERE kind IN ('account_cleanup','media_cleanup')
      AND status IN ('pending','running','dead')
  `);
  const row = result.rows[0] as { worker_up?: boolean; dead_cleanup_jobs?: number | string; overdue_cleanup_jobs?: number | string } | undefined;
  return {
    workerUp: row?.worker_up === true,
    overdueCleanupJobs: Number(row?.overdue_cleanup_jobs ?? 0),
    deadCleanupJobs: Number(row?.dead_cleanup_jobs ?? 0),
  };
}
