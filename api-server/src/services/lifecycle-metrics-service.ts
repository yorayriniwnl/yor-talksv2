import { pool } from '@workspace/db';
import { hasHealthyLifecycleWorker } from '../lib/worker-health.js';
import { env } from '../config/env.js';

const kinds = ['account_cleanup', 'media_cleanup', 'payment_event', 'premium_reconcile', 'checkout_reconcile', 'dispute_scan', 'dispute_reconcile', 'other'] as const;

/** Bounded labels expose operational counts, never job/user/provider payloads. */
export async function renderLifecycleMetrics(): Promise<string[]> {
  const lines = [
    '# HELP yor_lifecycle_worker_up Whether a lifecycle worker has a fresh, healthy, progressing heartbeat.',
    '# TYPE yor_lifecycle_worker_up gauge',
    `yor_lifecycle_worker_up ${await hasHealthyLifecycleWorker() ? 1 : 0}`,
    '# HELP yor_lifecycle_jobs_due Number of runnable or expired-lease jobs by bounded kind.',
    '# TYPE yor_lifecycle_jobs_due gauge',
    '# HELP yor_lifecycle_jobs_dead Number of dead-letter jobs requiring operator recovery by bounded kind.',
    '# TYPE yor_lifecycle_jobs_dead gauge',
    '# HELP yor_lifecycle_jobs_stalled Number of running jobs exceeding the configured progress deadline.',
    '# TYPE yor_lifecycle_jobs_stalled gauge',
    '# HELP yor_lifecycle_jobs_oldest_due_seconds Age of the oldest due job by bounded kind.',
    '# TYPE yor_lifecycle_jobs_oldest_due_seconds gauge',
  ];
  try {
    const jobs = await pool.query(`SELECT CASE WHEN kind=ANY($1) THEN kind ELSE 'other' END AS kind,
      count(*) FILTER (WHERE (status='pending' AND available_at<=now()) OR (status='running' AND lease_until<now()))::int AS due,
      count(*) FILTER (WHERE status='dead')::int AS dead,
      count(*) FILTER (WHERE status='running' AND updated_at<now()-$2*interval '1 second')::int AS stalled,
      COALESCE(max(GREATEST(0,extract(epoch FROM now()-available_at))) FILTER
        (WHERE (status='pending' AND available_at<=now()) OR (status='running' AND lease_until<now())),0)::float8 AS oldest
      FROM background_jobs GROUP BY 1`, [[...kinds], env.LIFECYCLE_JOB_STALL_SECONDS]);
    for (const kind of kinds) {
      const row = jobs.rows.find(row => row.kind === kind);
      lines.push(`yor_lifecycle_jobs_due{kind="${kind}"} ${row?.due ?? 0}`,
        `yor_lifecycle_jobs_dead{kind="${kind}"} ${row?.dead ?? 0}`,
        `yor_lifecycle_jobs_stalled{kind="${kind}"} ${row?.stalled ?? 0}`,
        `yor_lifecycle_jobs_oldest_due_seconds{kind="${kind}"} ${row?.oldest ?? 0}`);
    }
    const media = await pool.query(`SELECT count(*)::int AS due,
      COALESCE(max(GREATEST(0,extract(epoch FROM now()-cleanup_at))),0)::float8 AS oldest,
      count(*) FILTER (WHERE deletion_attempts>=8)::int AS repeated_failures
      FROM media_assets WHERE deletion_status='pending' AND cleanup_at<=now()`);
    const row = media.rows[0];
    lines.push('# HELP yor_media_cleanup_due Number of revoked media objects due for provider cleanup.',
      '# TYPE yor_media_cleanup_due gauge', `yor_media_cleanup_due ${row?.due ?? 0}`,
      '# HELP yor_media_cleanup_oldest_due_seconds Age of the oldest due media cleanup.',
      '# TYPE yor_media_cleanup_oldest_due_seconds gauge', `yor_media_cleanup_oldest_due_seconds ${row?.oldest ?? 0}`,
      '# HELP yor_media_cleanup_repeated_failures Number of due cleanup objects with at least eight failed provider deletions.',
      '# TYPE yor_media_cleanup_repeated_failures gauge', `yor_media_cleanup_repeated_failures ${row?.repeated_failures ?? 0}`,
      '# HELP yor_lifecycle_metrics_up Whether lifecycle backlog and cleanup diagnostics are queryable.',
      '# TYPE yor_lifecycle_metrics_up gauge', 'yor_lifecycle_metrics_up 1');
  } catch {
    lines.push('# HELP yor_lifecycle_metrics_up Whether lifecycle backlog and cleanup diagnostics are queryable.',
      '# TYPE yor_lifecycle_metrics_up gauge', 'yor_lifecycle_metrics_up 0');
  }
  return lines;
}
