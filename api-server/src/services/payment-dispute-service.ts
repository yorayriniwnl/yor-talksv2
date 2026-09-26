import { createHash, randomUUID } from 'node:crypto';
import { pool } from '@workspace/db';
import { env } from '../config/env.js';
import { BackgroundJobRepository } from '../repositories/background-job-repository.js';
import { paymentTransaction } from './checkout-intent-service.js';
import { RazorpayService, PaymentProviderError } from './razorpay-service.js';

const tables = { tip: 'payment_orders', membership: 'subscription_orders', marketplace: 'marketplace_orders', premium: 'premium_orders' } as const;
export class PaymentDisputeService {
  constructor(private readonly provider: RazorpayService, private readonly prepareCapture: (paymentId: string) => Promise<void>) {}

  async reconcile(id: string): Promise<number> {
    if (!env.PAYMENTS_ENABLED) return 3600;
    const initial = await this.provider.getDispute(id);
    await this.prepareCapture(initial.payment_id);
    await paymentTransaction(async client => {
      const matches = (await client.query<{ id: string; product: keyof typeof tables }>(Object.entries(tables)
        .map(([product,table])=>`SELECT id,'${product}' AS product FROM ${table} WHERE provider_payment_id=$1`).join(' UNION ALL '), [initial.payment_id])).rows;
      if (matches.length!==1) throw new PaymentProviderError('Dispute payment association is missing or ambiguous');
      const match=matches[0]!;
      const order=(await client.query(`SELECT * FROM ${tables[match.product]} WHERE id=$1 FOR UPDATE`,[match.id])).rows[0];
      // Fetch AFTER acquiring the order lock so a delayed handler cannot apply an
      // earlier provider snapshot after a concurrent handler has resolved it.
      const current=await this.provider.getDispute(id);
      if (current.payment_id!==initial.payment_id || current.currency!==order.currency || current.amount>order.amount_minor) throw new PaymentProviderError('Dispute does not match the payment');
      const previous=(await client.query('SELECT * FROM payment_disputes WHERE id=$1 FOR UPDATE',[id])).rows[0];
      if (previous && (previous.payment_id!==current.payment_id || previous.amount_minor!==current.amount || previous.currency!==current.currency)) throw new PaymentProviderError('Dispute identity changed');
      await client.query(`INSERT INTO payment_disputes(id,payment_id,status,amount_minor,currency,amount_deducted,product,order_id,respond_by,checked_at)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,to_timestamp($9),now()) ON CONFLICT(id) DO UPDATE SET status=excluded.status,
        amount_deducted=excluded.amount_deducted,respond_by=excluded.respond_by,checked_at=now(),updated_at=now(),product=excluded.product,order_id=excluded.order_id`,
      [id,current.payment_id,current.status,current.amount,current.currency,current.amount_deducted,match.product,match.id,current.respond_by??null]);
      const hash=createHash('sha256').update(JSON.stringify([current.status,current.amount_deducted,current.respond_by??null])).digest('hex');
      await client.query(`INSERT INTO payment_dispute_history(dispute_id,snapshot_hash,status,amount_deducted) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING`,[id,hash,current.status,current.amount_deducted]);
      await client.query('SELECT yor_sync_dispute_reserve($1,$2)',[match.product,match.id]);
      await client.query(`INSERT INTO background_jobs(id,kind,dedup_key,payload,available_at)
        VALUES($1,'dispute_reconcile',$2,$3,now()+interval '5 minutes') ON CONFLICT(dedup_key) DO NOTHING`,[randomUUID(),`dispute:${id}`,{disputeId:id}]);
    });
    return 3600;
  }

  async scan(): Promise<number> {
    if (!env.PAYMENTS_ENABLED) return 3600;
    const cursor=Number((await pool.query(`SELECT cursor FROM provider_reconciliation_cursors WHERE name='razorpay_disputes'`)).rows[0]?.cursor??0);
    const disputes=await this.provider.listDisputes(cursor);
    const jobs=new BackgroundJobRepository();
    for (const dispute of disputes) await jobs.enqueue('dispute_reconcile',`dispute:${dispute.id}`,{disputeId:dispute.id});
    await pool.query(`UPDATE provider_reconciliation_cursors SET cursor=$1,updated_at=now() WHERE name='razorpay_disputes' AND cursor=$2`,[disputes.length===50?cursor+50:0,cursor]);
    return disputes.length===50?5:3600;
  }
}
