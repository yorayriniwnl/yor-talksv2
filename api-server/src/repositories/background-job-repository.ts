import { randomUUID } from 'node:crypto';
import { pool } from '@workspace/db';

export interface BackgroundJob {
  id: string; kind: string; payload: Record<string, unknown>; attempts: number; lease_token: string;
}

/** Durable leases; all handlers must be idempotent after a crash before completion. */
export class BackgroundJobRepository {
  async enqueue(kind: string, dedupKey: string, payload: Record<string, unknown>, delaySeconds = 0): Promise<string> {
    const result = await pool.query(`INSERT INTO background_jobs(id,kind,dedup_key,payload,available_at)
      VALUES($1,$2,$3,$4,now()+$5*interval '1 second') ON CONFLICT(dedup_key)
      DO UPDATE SET dedup_key=excluded.dedup_key RETURNING id`, [randomUUID(), kind, dedupKey, payload, delaySeconds]);
    return result.rows[0].id;
  }

  async claim(kinds: string[]): Promise<BackgroundJob | undefined> {
    // The eighth abandoned attempt becomes visible in the dead-letter queue.
    await pool.query(`UPDATE background_jobs SET status='dead', last_error='lease_expired', updated_at=now()
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
    const result = await pool.query(`UPDATE background_jobs SET lease_until=now()+interval '2 minutes'
      WHERE id=$1 AND lease_token=$2 AND status='running' AND lease_until>now()`, [job.id, job.lease_token]);
    return result.rowCount === 1;
  }

  async finish(job: BackgroundJob): Promise<void> {
    await pool.query(`UPDATE background_jobs SET status='complete', payload='{}', lease_token=NULL, lease_until=NULL, last_error=NULL, updated_at=now()
      WHERE id=$1 AND lease_token=$2 AND status='running'`, [job.id, job.lease_token]);
  }

  async defer(job: BackgroundJob, delaySeconds: number): Promise<void> {
    await pool.query(`UPDATE background_jobs SET status='pending',attempts=0,
      available_at=now()+$3*interval '1 second',lease_token=NULL,lease_until=NULL,last_error=NULL,updated_at=now()
      WHERE id=$1 AND lease_token=$2 AND status='running'`, [job.id, job.lease_token, Math.max(5, Math.min(3600, delaySeconds))]);
  }

  async fail(job: BackgroundJob, code: string): Promise<void> {
    // Only machine codes belong in durable diagnostics; provider response bodies may contain private data.
    const safeCode = /^[a-z0-9_]{1,80}$/i.test(code) ? code : 'operation_failed';
    await pool.query(`UPDATE background_jobs SET status=CASE WHEN attempts>=8 THEN 'dead' ELSE 'pending' END,
      available_at=now()+$3*interval '1 second', last_error=$4, lease_token=NULL, lease_until=NULL, updated_at=now()
      WHERE id=$1 AND lease_token=$2 AND status='running'`, [job.id, job.lease_token, Math.min(3600, 2 ** job.attempts * 5), safeCode]);
  }

  async heartbeat(workerId: string, details: Record<string, unknown> = {}): Promise<void> {
    await pool.query(`INSERT INTO runtime_heartbeats(worker_id,kind,details) VALUES($1,'lifecycle',$2)
      ON CONFLICT(worker_id) DO UPDATE SET heartbeat_at=now(),details=excluded.details`, [workerId, details]);
  }
}
