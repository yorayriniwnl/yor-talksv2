import { createHash, randomUUID } from 'node:crypto';
import type { PoolClient } from 'pg';
import { pool } from '@workspace/db';
import { env } from '../config/env.js';
import { RazorpayService, PaymentProviderError } from './razorpay-service.js';
import type { CapturedPaymentInput, PaymentWebhookHandler } from './payment-webhook-types.js';

export type CheckoutProduct = 'tip' | 'membership' | 'marketplace';
const tables = { tip: 'payment_orders', membership: 'subscription_orders', marketplace: 'marketplace_orders' } as const;
export interface CheckoutIntent {
  id: string; product: CheckoutProduct; owner_id: string | null; idempotency_key: string; input_hash: string;
  receipt: string | null; provider_order_id: string | null; amount_minor: number; currency: string;
  legacy: boolean; status: string; refund_cursor: number; last_payment_status: string | null; created_at: Date;
}
export class CheckoutRequestError extends Error {}
export async function paymentTransaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try { await client.query('BEGIN'); const value = await work(client); await client.query('COMMIT'); return value; }
  catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}
export function checkoutHash(values: unknown[]): string { return createHash('sha256').update(JSON.stringify(values)).digest('hex'); }
export async function lockPaymentParties(client: PoolClient, ids: string[]): Promise<void> {
  const unique = [...new Set(ids)].sort();
  const result = await client.query(`SELECT id FROM users WHERE id=ANY($1::uuid[]) AND coalesce(account_status,'active')='active' ORDER BY id FOR UPDATE`, [unique]);
  if (result.rowCount !== unique.length) throw new CheckoutRequestError('A payment account is unavailable');
}

export class CheckoutIntentService {
  constructor(private readonly provider = new RazorpayService()) {}
  async findRepeat(client: PoolClient, product: CheckoutProduct, ownerId: string, key: string, hash: string): Promise<CheckoutIntent | undefined> {
    const item = (await client.query<CheckoutIntent>('SELECT * FROM checkout_intents WHERE product=$1 AND owner_id=$2 AND idempotency_key=$3', [product,ownerId,key])).rows[0];
    if (item && item.input_hash !== hash) throw new CheckoutRequestError('This checkout key belongs to a different request');
    return item;
  }
  async reserve(client: PoolClient, input: { id: string; product: CheckoutProduct; ownerId: string; key: string; hash: string; amountMinor: number }): Promise<CheckoutIntent> {
    const receipt = `yc_${input.id.replaceAll('-','')}`;
    const result = await client.query<CheckoutIntent>(`INSERT INTO checkout_intents(id,product,owner_id,idempotency_key,input_hash,receipt,amount_minor,currency)
      VALUES($1,$2,$3,$4,$5,$6,$7,'INR') RETURNING *`, [input.id,input.product,input.ownerId,input.key,input.hash,receipt,input.amountMinor]);
    await client.query(`INSERT INTO background_jobs(id,kind,dedup_key,payload,available_at) VALUES($1,'checkout_reconcile',$2,$3,now()+interval '1 minute')`,
      [randomUUID(), `checkout:${input.id}`, { checkoutId: input.id }]);
    return result.rows[0]!;
  }
  async get(id: string): Promise<CheckoutIntent> {
    const item = (await pool.query<CheckoutIntent>('SELECT * FROM checkout_intents WHERE id=$1', [id])).rows[0];
    if (!item) throw new CheckoutRequestError('Checkout not found'); return item;
  }
  async createRemote(intent: CheckoutIntent): Promise<CheckoutIntent> {
    try {
      const order = await this.provider.createOrder({ amountMinor: intent.amount_minor, receipt: intent.receipt!, notes: { product: intent.product, localOrderId: intent.id } });
      await this.bind(intent, order);
    } catch {
      // Never infer failure from a timeout, and never repeat this POST.
      await pool.query(`UPDATE checkout_intents SET status='creation_unknown',updated_at=now() WHERE id=$1 AND status='provider_pending'`, [intent.id]);
    }
    return this.get(intent.id);
  }
  private async bind(intent: CheckoutIntent, order: Awaited<ReturnType<RazorpayService['getOrder']>>) {
    if (order.amount !== intent.amount_minor || order.currency !== intent.currency || (intent.receipt && order.receipt !== intent.receipt)
      || (!intent.legacy && (order.notes?.localOrderId !== intent.id || order.notes.product !== intent.product))) throw new PaymentProviderError('Checkout provider association mismatch');
    await paymentTransaction(async client => {
      const locked = (await client.query<CheckoutIntent>('SELECT * FROM checkout_intents WHERE id=$1 FOR UPDATE', [intent.id])).rows[0]!;
      if (locked.provider_order_id && locked.provider_order_id !== order.id) throw new CheckoutRequestError('Checkout already has a different provider order');
      await client.query(`UPDATE checkout_intents SET provider_order_id=$2,receipt=coalesce(receipt,$3),status='created',updated_at=now() WHERE id=$1`, [intent.id,order.id,order.receipt ?? null]);
      const bound = await client.query(`UPDATE ${tables[intent.product]} SET provider_order_id=$2,status=CASE WHEN status IN ('provider_pending','creation_unknown') THEN 'created' ELSE status END
        WHERE id=$1 AND (provider_order_id=$2 OR provider_order_id=$3)`, [intent.id,order.id,`pending_${intent.id.replaceAll('-','')}`]);
      if (bound.rowCount !== 1) throw new CheckoutRequestError('Local checkout association mismatch');
    });
  }
  async recoverProviderOrder(product: CheckoutProduct, order: Awaited<ReturnType<RazorpayService['getOrder']>>): Promise<boolean> {
    const intent = (await pool.query<CheckoutIntent>('SELECT * FROM checkout_intents WHERE product=$1 AND (receipt=$2 OR provider_order_id=$3)', [product,order.receipt ?? null,order.id])).rows[0];
    if (intent) { await this.bind(intent, order); return true; }
    // A legacy uncertain marketplace order stored its local id in provider notes.
    const legacyId = order.notes?.orderId;
    if (product !== 'marketplace' || !legacyId || !/^[a-f0-9-]{36}$/i.test(legacyId) || order.notes?.type !== 'marketplace_purchase') return false;
    const legacy = (await pool.query<CheckoutIntent>(`SELECT * FROM checkout_intents WHERE id=$1 AND product=$2 AND legacy=true AND provider_order_id IS NULL`, [legacyId,product])).rows[0];
    if (!legacy) return false;
    await this.bind(legacy, order); return true;
  }
  async ensureProviderOrder(intent: CheckoutIntent): Promise<string> {
    if (intent.provider_order_id) {
      const order = await this.provider.getOrder(intent.provider_order_id); await this.bind(intent, order); return order.id;
    }
    if (!intent.receipt) throw new CheckoutRequestError('Legacy checkout needs provider association review');
    const order = await this.provider.findOrderByReceipt(intent.receipt);
    if (!order) throw new PaymentProviderError('Provider creation remains unresolved');
    await this.bind(intent, order); return order.id;
  }
  async failedAttempt(product: CheckoutProduct, input: CapturedPaymentInput) {
    const intent = (await pool.query<CheckoutIntent>('SELECT * FROM checkout_intents WHERE product=$1 AND provider_order_id=$2', [product,input.orderId])).rows[0];
    if (!intent) throw new CheckoutRequestError('Checkout not found');
    const payment = await this.provider.getPayment(input.paymentId);
    if (payment.order_id !== input.orderId || payment.amount !== intent.amount_minor || payment.currency !== intent.currency || payment.status !== 'failed') throw new PaymentProviderError('Failed payment association mismatch');
    await pool.query(`UPDATE checkout_intents SET last_payment_status='failed' WHERE id=$1 AND EXISTS(SELECT 1 FROM ${tables[product]} o WHERE o.id=$1 AND o.status='created')`, [intent.id]);
  }
  async reconcile(id: string, handler: PaymentWebhookHandler): Promise<number> {
    if (!env.PAYMENTS_ENABLED) return 3600;
    const intent = await this.get(id), providerOrderId = await this.ensureProviderOrder(intent);
    const payments = await this.provider.getOrderPayments(providerOrderId);
    for (const payment of payments) {
      await handler.reconcileCapturedPayment({ orderId: providerOrderId, paymentId: payment.id });
      const refunds = await this.provider.getPaymentRefunds(payment.id, intent.refund_cursor);
      for (const refund of refunds) {
        if (refund.status === 'processed') await handler.reconcileRefund({ id: refund.id, paymentId: payment.id, amountMinor: refund.amount, currency: refund.currency });
      }
      await pool.query('UPDATE checkout_intents SET refund_cursor=$2 WHERE id=$1 AND refund_cursor=$3', [id, refunds.length === 100 ? intent.refund_cursor + 100 : 0, intent.refund_cursor]);
      if (refunds.length === 100) return 5;
    }
    if (!payments.length && intent.product !== 'marketplace' && Date.now() - new Date(intent.created_at).getTime() >= 86400000) {
      await paymentTransaction(async client => {
        const expired = await client.query(`UPDATE ${tables[intent.product]} SET status='expired' WHERE id=$1 AND status IN ('created','provider_pending') RETURNING *`, [id]);
        if (intent.product === 'membership' && expired.rows[0]) await client.query(`UPDATE subscriptions SET status='expired' WHERE id=$1 AND status='pending'`, [expired.rows[0].subscription_id]);
      });
    }
    // Keep paid records periodically reconciled; outages remain durable retries.
    return payments.length ? 86400 : Date.now() - new Date(intent.created_at).getTime() < 86400000 ? 300 : 86400;
  }
  async publicState(intent: CheckoutIntent) {
    const order = (await pool.query(`SELECT status,provider_payment_id FROM ${tables[intent.product]} WHERE id=$1`, [intent.id])).rows[0];
    return { checkoutId: intent.id, product: intent.product, providerOrderId: intent.provider_order_id,
      status: order?.status ?? intent.status, providerState: intent.status, lastPaymentStatus: order?.provider_payment_id ? 'captured' : intent.last_payment_status,
      amountMinor: intent.amount_minor, currency: intent.currency, createdAt: intent.created_at, keyId: env.RAZORPAY_KEY_ID };
  }
  async owned(userId: string, id: string) { const intent = await this.get(id); if (intent.owner_id !== userId) throw new CheckoutRequestError('Checkout not found'); return intent; }
  async list(userId: string) {
    const items = (await pool.query(`SELECT i.*,coalesce(t.status,s.status,m.status) AS order_status,coalesce(t.provider_payment_id,s.provider_payment_id,m.provider_payment_id) AS payment_id,s.subscription_id
      FROM checkout_intents i LEFT JOIN payment_orders t ON i.product='tip' AND t.id=i.id
      LEFT JOIN subscription_orders s ON i.product='membership' AND s.id=i.id
      LEFT JOIN marketplace_orders m ON i.product='marketplace' AND m.id=i.id
      WHERE i.owner_id=$1 ORDER BY i.created_at DESC LIMIT 50`, [userId])).rows;
    return items.map(item => ({ checkoutId: item.id as string, product: item.product as CheckoutProduct, providerOrderId: item.provider_order_id as string | null,
      status: item.order_status as string, providerState: item.status as string, lastPaymentStatus: item.payment_id ? 'captured' : item.last_payment_status as string | null,
      amountMinor: item.amount_minor as number, currency: item.currency as string,
      createdAt: item.created_at as Date, subscriptionId: item.subscription_id as string | null, keyId: env.RAZORPAY_KEY_ID }));
  }
}
