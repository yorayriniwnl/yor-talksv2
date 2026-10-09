import { pool } from '@workspace/db';
import { env } from '../config/env.js';

export const LIFECYCLE_HEARTBEAT_SECONDS = 45;
export const LIFECYCLE_STALL_SECONDS = 300;
export const LIFECYCLE_KINDS = ['account_cleanup', 'media_cleanup', 'payment_event', 'premium_reconcile', 'checkout_reconcile', 'dispute_scan', 'dispute_reconcile'] as const;

export async function inspectLifecycleHealth() {
  const required = ['account_cleanup', 'media_cleanup'];
  if (env.PAYMENTS_ENABLED) required.push('payment_event', 'premium_reconcile', 'checkout_reconcile', 'dispute_scan', 'dispute_reconcile');
  const result = await pool.query(`SELECT
    EXISTS (SELECT 1 FROM runtime_heartbeats WHERE kind='lifecycle'
      AND heartbeat_at > clock_timestamp() - $1 * interval '1 second'
      AND details->>'healthy'='true' AND details->>'stopping' IS DISTINCT FROM 'true'
      AND details->'handlers' @> $2::jsonb
      AND (details->>'activeSince' IS NULL OR (details->>'activeSince')::timestamptz > clock_timestamp() - $3 * interval '1 second')) AS ready,
    COALESCE((SELECT extract(epoch FROM clock_timestamp()-max(heartbeat_at)) FROM runtime_heartbeats WHERE kind='lifecycle'), 1e9) AS heartbeat_age,
    COALESCE((SELECT max(extract(epoch FROM clock_timestamp()-available_at)) FROM background_jobs WHERE status='pending' AND available_at<clock_timestamp()),0) AS overdue_age,
    COALESCE((SELECT max(extract(epoch FROM clock_timestamp()-updated_at)) FROM background_jobs WHERE status='running'),0) AS running_age,
    (SELECT count(*)::integer FROM background_jobs WHERE status='running' AND lease_until<=clock_timestamp()) AS expired_leases,
    (SELECT count(*)::integer FROM background_jobs WHERE status='dead') AS dead_letters,
    COALESCE((SELECT max(extract(epoch FROM last_success_at)) FROM background_jobs),0) AS last_progress,
    COALESCE((SELECT max(extract(epoch FROM last_success_at)) FROM background_jobs WHERE kind IN ('account_cleanup','media_cleanup')),0) AS last_cleanup,
    COALESCE((SELECT sum(COALESCE((details->>'recoveryFailures')::integer,0)) FROM runtime_heartbeats WHERE kind='lifecycle'),0) AS recovery_failures`,
  [LIFECYCLE_HEARTBEAT_SECONDS, JSON.stringify(required), LIFECYCLE_STALL_SECONDS]);
  const row = result.rows[0];
  return {
    ready: row.ready === true,
    heartbeatAgeSeconds: Number(row.heartbeat_age),
    oldestOverdueSeconds: Number(row.overdue_age),
    oldestRunningSeconds: Number(row.running_age),
    expiredLeases: Number(row.expired_leases),
    deadLetters: Number(row.dead_letters),
    lastProgressTimestampSeconds: Number(row.last_progress),
    lastCleanupTimestampSeconds: Number(row.last_cleanup),
    recoveryFailures: Number(row.recovery_failures),
    requiredHandlers: required,
  };
}

export async function renderLifecycleMetrics(): Promise<string[]> {
  try {
    const health = await inspectLifecycleHealth();
    return [
      `yor_lifecycle_metrics_up 1`,
      `yor_lifecycle_ready ${health.ready ? 1 : 0}`,
      `yor_lifecycle_heartbeat_age_seconds ${health.heartbeatAgeSeconds}`,
      `yor_lifecycle_oldest_overdue_seconds ${health.oldestOverdueSeconds}`,
      `yor_lifecycle_oldest_running_seconds ${health.oldestRunningSeconds}`,
      `yor_lifecycle_expired_leases ${health.expiredLeases}`,
      `yor_lifecycle_dead_letters ${health.deadLetters}`,
      `yor_lifecycle_last_progress_timestamp_seconds ${health.lastProgressTimestampSeconds}`,
      `yor_lifecycle_last_cleanup_timestamp_seconds ${health.lastCleanupTimestampSeconds}`,
      `yor_lifecycle_recovery_failures_total ${health.recoveryFailures}`,
    ];
  } catch { return ['yor_lifecycle_metrics_up 0', 'yor_lifecycle_ready 0']; }
}
