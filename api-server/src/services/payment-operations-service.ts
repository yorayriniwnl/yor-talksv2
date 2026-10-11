import { randomUUID } from 'node:crypto';
import { pool } from '@workspace/db';
import { paymentTransaction, CheckoutRequestError } from './checkout-intent-service.js';

const paymentKinds = ['payment_event','premium_reconcile','checkout_reconcile','dispute_reconcile','dispute_scan'];
export class PaymentOperationsService {
  async snapshot() {
    const [jobs,disputes,checkouts,events,exposure] = await Promise.all([
      pool.query(`SELECT id,kind,status,attempts,last_error,available_at,updated_at FROM background_jobs
        WHERE kind=ANY($1::text[]) AND (status='dead' OR attempts>0) ORDER BY updated_at DESC LIMIT 100`,[paymentKinds]),
      pool.query(`SELECT id,payment_id,product,order_id,status,amount_minor,amount_deducted,currency,respond_by,checked_at
        FROM payment_disputes ORDER BY updated_at DESC LIMIT 100`),
      pool.query(`SELECT 'premium' AS product,id,status,amount_minor,currency,created_at FROM premium_orders WHERE status IN ('creation_unknown','refund_required')
        UNION ALL SELECT i.product,i.id,coalesce(t.status,s.status,m.status),i.amount_minor,i.currency,i.created_at FROM checkout_intents i
        LEFT JOIN payment_orders t ON i.product='tip' AND t.id=i.id LEFT JOIN subscription_orders s ON i.product='membership' AND s.id=i.id
        LEFT JOIN marketplace_orders m ON i.product='marketplace' AND m.id=i.id
        WHERE i.status='creation_unknown' OR coalesce(t.status,s.status,m.status)='refund_required' ORDER BY created_at DESC LIMIT 100`),
      pool.query(`SELECT event_id,event_type,status,last_error,received_at,processed_at FROM payment_events
        WHERE status NOT IN ('processed','ignored') ORDER BY received_at LIMIT 100`),
      pool.query(`SELECT product,order_id,amount_minor,excess_minor,updated_at FROM payment_dispute_reserves
        WHERE excess_minor>0 ORDER BY updated_at DESC LIMIT 100`),
    ]);
    return { jobs:jobs.rows,disputes:disputes.rows,checkouts:checkouts.rows,events:events.rows,exposure:exposure.rows };
  }
  async retry(actorId: string, jobId: string, reason: string) {
    await paymentTransaction(async client => {
      const job=(await client.query('SELECT id,kind,status,attempts,last_error FROM background_jobs WHERE id=$1 FOR UPDATE',[jobId])).rows[0];
      if (!job || !paymentKinds.includes(job.kind) || job.status!=='dead') throw new CheckoutRequestError('Only a failed payment job can be retried');
      await client.query(`INSERT INTO payment_operation_audit(id,actor_id,action,target_id,reason) VALUES($1,$2,'retry_payment_job',$3,$4)`,[randomUUID(),actorId,jobId,reason]);
      await client.query(`INSERT INTO background_job_replays(job_id,previous_attempts,previous_error,operator_reason) VALUES($1,$2,$3,'staff_payment_retry')`, [jobId,job.attempts,job.last_error]);
      await client.query(`UPDATE background_jobs SET status='pending',attempts=0,available_at=now(),last_error=NULL,lease_token=NULL,lease_until=NULL,updated_at=now() WHERE id=$1`,[jobId]);
    });
  }
  async recordReconcile(actorId: string, id: string, reason: string) {
    await pool.query(`INSERT INTO payment_operation_audit(id,actor_id,action,target_id,reason) VALUES($1,$2,'request_dispute_reconciliation',$3,$4)`,[randomUUID(),actorId,id,reason]);
  }
}
