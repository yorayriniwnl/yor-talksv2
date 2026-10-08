import { randomUUID } from 'node:crypto';
import { pool } from '@workspace/db';

export interface BackgroundJob {
  id: string; kind: string; payload: Record<string, unknown>; attempts: number; lease_token: string;
}

/** Durable leases; all handlers must be idempotent after a crash before completion. */
export class BackgroundJobRepository {
  async inspect(limit = 100) {
    return (await pool.query(`SELECT id,kind,status,attempts,available_at,lease_until,last_error,last_success_at,created_at,updated_at
      FROM background_jobs WHERE status<>'complete' ORDER BY available_at,id LIMIT $1`, [Math.max(1, Math.min(100, limit))])).rows;
  }

  async replayDead(id: string, operatorReason: string): Promise<void> {
    if (!/^[a-z0-9_]{3,80}$/i.test(operatorReason)) throw new Error('machine_reason_required');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const job = (await client.query('SELECT *,lease_until>clock_timestamp() AS lease_active FROM background_jobs WHERE id=$1 FOR UPDATE', [id])).rows[0];
      const leaseAbsent = job && !job.lease_token && !job.lease_until;
      const leaseExpired = job?.lease_until && !job.lease_active;
      if (!job || job.status !== 'dead' || !(leaseAbsent || leaseExpired)) throw new Error('only_unleased_dead_jobs_can_replay');
      await client.query(`INSERT INTO background_job_replays(job_id,previous_attempts,previous_error,operator_reason) VALUES($1,$2,$3,$4)`, [id, job.attempts, job.last_error, operatorReason]);
      await client.query(`UPDATE background_jobs SET status='pending',attempts=0,available_at=clock_timestamp(),last_error=NULL,
        lease_token=NULL,lease_until=NULL,updated_at=clock_timestamp() WHERE id=$1`, [id]);
      await client.query('COMMIT');
    } catch (error) { await client.query('ROLLBACK'); throw error; }
    finally { client.release(); }
  }

  async enqueue(kind: string, dedupKey: string, payload: Record<string, unknown>, delaySeconds = 0): Promise<string> {
    const result = await pool.query(`INSERT INTO background_jobs(id,kind,dedup_key,payload,available_at)
      VALUES($1,$2,$3,$4,now()+$5*interval '1 second') ON CONFLICT(dedup_key)
      DO UPDATE SET dedup_key=excluded.dedup_key RETURNING id`, [randomUUID(), kind, dedupKey, payload, delaySeconds]);
    return result.rows[0].id;
  }

  async claim(kinds: string[]): Promise<BackgroundJob | undefined> {
    // The eighth abandoned attempt becomes visible in the dead-letter queue.
    await pool.query(`UPDATE background_jobs SET status='dead', last_error='lease_expired', lease_token=NULL,lease_until=NULL,updated_at=clock_timestamp()
      WHERE status='running' AND lease_until<now() AND attempts>=8`);
    const result = await pool.query(`WITH next AS (
      SELECT id FROM background_jobs WHERE kind=ANY($1) AND attempts<8 AND
      ((status='pending' AND available_at<=now()) OR (status='running' AND lease_until<now()))
      ORDER BY available_at,id FOR UPDATE SKIP LOCKED LIMIT 1)
      UPDATE background_jobs j SET status='running', attempts=attempts+1, lease_token=$2,
        lease_until=now()+interval '2 minutes', updated_at=now() FROM next WHERE j.id=next.id RETURNING j.*`, [kinds, randomUUID()]);
    return result.rows[0];
  }

  async extend(job: BackgroundJob): Promise<boolean> {
    const result = await pool.query(`UPDATE background_jobs SET lease_until=clock_timestamp()+interval '2 minutes'
      WHERE id=$1 AND lease_token=$2 AND status='running' AND lease_until>clock_timestamp()`, [job.id, job.lease_token]);
    return result.rowCount === 1;
  }

  async finish(job: BackgroundJob): Promise<void> {
    const result = await pool.query(`UPDATE background_jobs SET status='complete', payload='{}', lease_token=NULL, lease_until=NULL, last_error=NULL, updated_at=now(),last_success_at=clock_timestamp()
      WHERE id=$1 AND lease_token=$2 AND status='running' AND lease_until>clock_timestamp()`, [job.id, job.lease_token]);
    if (result.rowCount !== 1) throw new Error('lease_lost');
  }

  async defer(job: BackgroundJob, delaySeconds: number): Promise<void> {
    const result = await pool.query(`UPDATE background_jobs SET status='pending',attempts=0,
      available_at=now()+$3*interval '1 second',lease_token=NULL,lease_until=NULL,last_error=NULL,updated_at=now(),last_success_at=clock_timestamp()
      WHERE id=$1 AND lease_token=$2 AND status='running' AND lease_until>clock_timestamp()`, [job.id, job.lease_token, Math.max(5, Math.min(86400, delaySeconds))]);
    if (result.rowCount !== 1) throw new Error('lease_lost');
  }

  async fail(job: BackgroundJob, code: string): Promise<void> {
    // Only machine codes belong in durable diagnostics; provider response bodies may contain private data.
    const safeCode = /^[a-z0-9_]{1,80}$/i.test(code) ? code : 'operation_failed';
    const result = await pool.query(`UPDATE background_jobs SET status=CASE WHEN attempts>=8 THEN 'dead' ELSE 'pending' END,
      available_at=now()+$3*interval '1 second', last_error=$4, lease_token=NULL, lease_until=NULL, updated_at=now()
      WHERE id=$1 AND lease_token=$2 AND status='running' AND lease_until>clock_timestamp()`, [job.id, job.lease_token, Math.min(3600, 2 ** job.attempts * 5), safeCode]);
    if (result.rowCount !== 1) throw new Error('lease_lost');
  }

  async heartbeat(workerId: string, details: Record<string, unknown> = {}): Promise<void> {
    await pool.query(`INSERT INTO runtime_heartbeats(worker_id,kind,details) VALUES($1,'lifecycle',$2)
      ON CONFLICT(worker_id) DO UPDATE SET heartbeat_at=now(),details=excluded.details`, [workerId, details]);
  }
}
