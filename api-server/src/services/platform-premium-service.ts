import { randomUUID } from 'node:crypto';
import type { PoolClient } from 'pg';
import { pool } from '@workspace/db';
import { env } from '../config/env.js';
import { PREMIUM_FEATURES, resolveFeatureFlags } from '../features/premium-features.js';
import { RazorpayService, PaymentProviderError, PaymentsNotConfiguredError } from './razorpay-service.js';
import type { CapturedPaymentInput, ProcessedRefundInput, PaymentWebhookHandler } from './payment-webhook-types.js';
import { FeatureEntitlementService } from './feature-entitlement-service.js';

export class PremiumRequestError extends Error {}
export interface PremiumPlan {
  key: string; name: string; priceMinor: number; currency: string; durationDays: number;
  features: string[]; termsVersion: string; refundPolicy: string;
}
interface PremiumOrder {
  id: string; user_id: string | null; plan_key: string; plan_snapshot: PremiumPlan;
  provider_order_id: string | null; provider_payment_id: string | null; receipt: string;
  amount_minor: number; currency: string; status: string; created_at: Date; paid_at: Date | null;
  last_payment_status: string | null;
  refund_cursor: number;
}
async function transaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try { await client.query('BEGIN'); const result = await fn(client); await client.query('COMMIT'); return result; }
  catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}

/** A prepaid platform plan. Creator memberships use their existing separate model. */
export class PlatformPremiumService implements PaymentWebhookHandler {
  constructor(private readonly razorpay = new RazorpayService()) {}

  async catalog() {
    const available = env.YOR_PREMIUM_ENABLED && env.PAYMENTS_ENABLED;
    const plan: PremiumPlan | null = env.YOR_PREMIUM_PRICE_MINOR >= 100 && env.YOR_PREMIUM_TERMS_VERSION && env.YOR_PREMIUM_REFUND_POLICY ? {
      key: `yor-premium:${env.YOR_PREMIUM_TERMS_VERSION}`, name: 'Yor Premium', priceMinor: env.YOR_PREMIUM_PRICE_MINOR,
      currency: 'INR', durationDays: env.YOR_PREMIUM_DURATION_DAYS, features: [...PREMIUM_FEATURES],
      termsVersion: env.YOR_PREMIUM_TERMS_VERSION, refundPolicy: env.YOR_PREMIUM_REFUND_POLICY,
    } : null;
    return { available: available && Boolean(plan), plan, operationalFeatures: resolveFeatureFlags(), automaticRenewal: false,
      billingModel: 'prepaid_fixed_term' as const, testMode: env.RAZORPAY_KEY_ID.startsWith('rzp_test_'), supportEmail: env.SUPPORT_EMAIL };
  }

  async createOrder(userId: string, input: { idempotencyKey: string; acceptedTermsVersion: string; acceptedPriceMinor: number }) {
    this.razorpay.assertConfigured();
    const catalog = await this.catalog();
    if (!catalog.available || !catalog.plan) throw new PaymentsNotConfiguredError();
    const plan = catalog.plan;
    if (input.acceptedTermsVersion !== plan.termsVersion || input.acceptedPriceMinor !== plan.priceMinor) throw new PremiumRequestError('The price or terms changed. Review them before continuing.');
    const result = await transaction(async client => {
      const user = await client.query(`SELECT id FROM users WHERE id=$1 AND coalesce(account_status,'active') NOT IN ('suspended','deactivated','deleted') FOR UPDATE`, [userId]);
      if (!user.rowCount) throw new PremiumRequestError('Account is unavailable');
      const existing = await client.query<PremiumOrder>('SELECT * FROM premium_orders WHERE user_id=$1 AND idempotency_key=$2', [userId, input.idempotencyKey]);
      if (existing.rows[0]) return { order: existing.rows[0], created: false };
      const active = await client.query(`SELECT 1 FROM premium_access WHERE user_id=$1 AND status IN ('active','cancelled','disputed','chargeback') AND ends_at>now()`, [userId]);
      if (active.rowCount) throw new PremiumRequestError('An active or disputed Premium term already exists. Review its status before buying another term.');
      const pending = await client.query(`SELECT 1 FROM premium_orders WHERE user_id=$1 AND status IN ('provider_pending','creation_unknown','created')`, [userId]);
      if (pending.rowCount) throw new PremiumRequestError('A checkout is already pending. Recover or cancel it before starting another.');
      await client.query(`INSERT INTO premium_plans(key,name,price_minor,currency,duration_days,features,terms_version,refund_policy,enabled)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,true) ON CONFLICT(key) DO UPDATE SET price_minor=excluded.price_minor,
        duration_days=excluded.duration_days,features=excluded.features,refund_policy=excluded.refund_policy,updated_at=now()`,
      [plan.key, plan.name, plan.priceMinor, plan.currency, plan.durationDays, JSON.stringify(plan.features), plan.termsVersion, plan.refundPolicy]);
      const id = randomUUID(), receipt = `yp_${id.replaceAll('-', '')}`;
      const order = await client.query<PremiumOrder>(`INSERT INTO premium_orders(id,user_id,plan_key,plan_snapshot,idempotency_key,receipt,amount_minor,currency)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`, [id, userId, plan.key, plan, input.idempotencyKey, receipt, plan.priceMinor, plan.currency]);
      await client.query(`INSERT INTO background_jobs(id,kind,dedup_key,payload,available_at) VALUES($1,'premium_reconcile',$2,$3,now()+interval '1 minute')`,
        [randomUUID(), `premium:${id}`, { orderId: id }]);
      return { order: order.rows[0]!, created: true };
    });
    if (result.created) {
      try {
        const provider = await this.razorpay.createOrder({ amountMinor: plan.priceMinor, receipt: result.order.receipt, notes: { product: 'yor_premium', localOrderId: result.order.id } });
        await this.bindProviderOrder(result.order, provider);
      } catch {
        // A timeout is an uncertain outcome. Never repeat the money-provider POST.
        await pool.query(`UPDATE premium_orders SET status='creation_unknown',updated_at=now() WHERE id=$1 AND status='provider_pending'`, [result.order.id]);
      }
    }
    return this.getOrder(userId, result.order.id);
  }

  private async bindProviderOrder(order: PremiumOrder, provider: { id: string; amount: number; currency: string; receipt?: string }) {
    if (provider.amount !== order.amount_minor || provider.currency !== order.currency || provider.receipt !== order.receipt) throw new PaymentProviderError('Premium provider association mismatch');
    await pool.query(`UPDATE premium_orders SET provider_order_id=$2,
      status=CASE WHEN status IN ('provider_pending','creation_unknown') THEN 'created' ELSE status END,updated_at=now()
      WHERE id=$1 AND (provider_order_id IS NULL OR provider_order_id=$2)`, [order.id, provider.id]);
  }

  async getOrder(userId: string, id: string) {
    const order = (await pool.query<PremiumOrder>('SELECT * FROM premium_orders WHERE id=$1 AND user_id=$2', [id, userId])).rows[0];
    if (!order) throw new PremiumRequestError('Premium order not found');
    return this.publicOrder(order);
  }
  private publicOrder(order: PremiumOrder) {
    return { id: order.id, providerOrderId: order.provider_order_id, amountMinor: order.amount_minor, currency: order.currency,
      status: order.status, lastPaymentStatus: order.last_payment_status, createdAt: order.created_at, paidAt: order.paid_at, plan: order.plan_snapshot, keyId: env.RAZORPAY_KEY_ID };
  }

  async state(userId: string) {
    const [access, orders] = await Promise.all([
      pool.query(`SELECT a.order_id,a.starts_at,a.ends_at,a.cancel_at_period_end,
        CASE WHEN a.status IN ('active','cancelled') AND ends_at<=now() THEN 'expired' ELSE a.status END AS status
        FROM premium_access a WHERE user_id=$1 ORDER BY starts_at DESC LIMIT 1`, [userId]),
      pool.query<PremiumOrder>('SELECT * FROM premium_orders WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50', [userId]),
    ]);
    return { catalog: await this.catalog(), subscription: access.rows[0] ?? null, orders: orders.rows.map(order => this.publicOrder(order)), enabledFeatures: await new FeatureEntitlementService().getSnapshot(userId) };
  }

  async verify(userId: string, id: string, input: { paymentId: string; signature: string }) {
    const order = (await pool.query<PremiumOrder>('SELECT * FROM premium_orders WHERE id=$1 AND user_id=$2', [id, userId])).rows[0];
    if (!order?.provider_order_id || !this.razorpay.verifySignature(order.provider_order_id, input.paymentId, input.signature)) throw new PremiumRequestError('Invalid payment confirmation');
    await this.reconcileCapturedPayment({ orderId: order.provider_order_id, paymentId: input.paymentId });
    return this.state(userId);
  }

  async recover(userId: string, id: string) {
    await this.getOrder(userId, id);
    await this.reconcileOrder(id);
    return this.state(userId);
  }

  async reconcileOrder(id: string): Promise<number> {
    if (!env.PAYMENTS_ENABLED) return 3600;
    let order = (await pool.query<PremiumOrder>('SELECT * FROM premium_orders WHERE id=$1', [id])).rows[0];
    if (!order) return 86400;
    if (!order.provider_order_id) {
      const provider = await this.razorpay.findOrderByReceipt(order.receipt);
      if (!provider) throw new PaymentProviderError('Provider creation is unresolved; retained for reconciliation');
      await this.bindProviderOrder(order, provider);
      order = { ...order, provider_order_id: provider.id };
    }
    const payments = await this.razorpay.getOrderPayments(order.provider_order_id!);
    if (!payments.length) {
      if (['paid','failed'].includes(order.status)) return 86400;
      if (Date.now() - new Date(order.created_at).getTime() < 24 * 60 * 60 * 1000) return 300;
      await pool.query(`UPDATE premium_orders SET status='expired',updated_at=now() WHERE id=$1 AND status IN ('created','cancelled')`, [id]);
      return 86400;
    }
    for (const payment of payments) {
      await this.reconcileCapturedPayment({ orderId: order.provider_order_id!, paymentId: payment.id });
      const refunds = await this.razorpay.getPaymentRefunds(payment.id, order.refund_cursor);
      for (const refund of refunds) if (refund.status === 'processed') await this.reconcileRefund({ id: refund.id, paymentId: payment.id, amountMinor: refund.amount, currency: refund.currency });
      await pool.query('UPDATE premium_orders SET refund_cursor=$2 WHERE id=$1 AND refund_cursor=$3', [order.id, refunds.length === 100 ? order.refund_cursor + 100 : 0, order.refund_cursor]);
      if (refunds.length === 100) return 5;
    }
    return 86400;
  }

  async hasProviderOrder(orderId: string) { return (await pool.query('SELECT 1 FROM premium_orders WHERE provider_order_id=$1', [orderId])).rowCount === 1; }
  async hasProviderPayment(paymentId: string) { return (await pool.query('SELECT 1 FROM premium_orders WHERE provider_payment_id=$1', [paymentId])).rowCount === 1; }

  async recoverProviderOrder(provider: { id: string; amount: number; currency: string; receipt?: string; notes?: Record<string, string> }): Promise<boolean> {
    if (!provider.receipt?.startsWith('yp_')) return false;
    const order = (await pool.query<PremiumOrder>('SELECT * FROM premium_orders WHERE receipt=$1', [provider.receipt])).rows[0];
    if (!order) return false;
    if (provider.notes?.product !== 'yor_premium' || provider.notes?.localOrderId !== order.id) throw new PremiumRequestError('Provider notes association mismatch');
    await this.bindProviderOrder(order, provider);
    return true;
  }

  async reconcileCapturedPayment(input: CapturedPaymentInput) {
    const order = (await pool.query<PremiumOrder>('SELECT * FROM premium_orders WHERE provider_order_id=$1', [input.orderId])).rows[0];
    if (!order) throw new PremiumRequestError('Premium payment order not found');
    const [payment, provider] = await Promise.all([this.razorpay.getPayment(input.paymentId), this.razorpay.getOrder(input.orderId)]);
    if (payment.order_id !== input.orderId || payment.amount !== order.amount_minor || payment.currency !== order.currency
      || !['captured','refunded'].includes(payment.status) || provider.receipt !== order.receipt
      || provider.amount !== order.amount_minor || provider.currency !== order.currency) throw new PremiumRequestError('Payment amount, currency or association mismatch');
    await transaction(async client => {
      if (order.user_id) await client.query('SELECT id FROM users WHERE id=$1 FOR UPDATE', [order.user_id]);
      const locked = (await client.query<PremiumOrder>('SELECT * FROM premium_orders WHERE id=$1 FOR UPDATE', [order.id])).rows[0]!;
      if (locked.provider_payment_id && locked.provider_payment_id !== input.paymentId) throw new PremiumRequestError('Another payment already settled this order');
      if (['paid','refunded','disputed','chargeback','refund_required'].includes(locked.status)) return;
      const grant = Boolean(locked.user_id) && !['cancelled','failed','expired'].includes(locked.status) && payment.status === 'captured';
      await client.query(`UPDATE premium_orders SET provider_payment_id=$2,status=$3,last_payment_status='captured',paid_at=coalesce(paid_at,now()),updated_at=now() WHERE id=$1`, [locked.id, input.paymentId, grant ? 'paid' : 'refund_required']);
      await client.query(`INSERT INTO ledger_transactions(id,amount_minor,currency,reference_id,status) VALUES($1,$2,$3,$4,'completed') ON CONFLICT(reference_id) DO NOTHING`, [randomUUID(), locked.amount_minor, locked.currency, `premium:${locked.id}`]);
      if (grant) await client.query(`INSERT INTO premium_access(order_id,user_id,starts_at,ends_at)
        VALUES($1,$2,now(),now()+$3*interval '1 day') ON CONFLICT(order_id) DO NOTHING`, [locked.id, locked.user_id, locked.plan_snapshot.durationDays]);
    });
  }

  async reconcileFailedPayment(input: CapturedPaymentInput): Promise<void> {
    const payment = await this.razorpay.getPayment(input.paymentId);
    const order = (await pool.query<PremiumOrder>('SELECT * FROM premium_orders WHERE provider_order_id=$1', [input.orderId])).rows[0];
    if (!order || payment.order_id !== input.orderId || payment.amount !== order.amount_minor || payment.currency !== order.currency || payment.status !== 'failed') throw new PremiumRequestError('Failed payment association mismatch');
    await pool.query(`UPDATE premium_orders SET last_payment_status='failed',updated_at=now() WHERE id=$1 AND status='created'`, [order.id]);
  }

  async reconcileRefund(input: ProcessedRefundInput): Promise<boolean> {
    return transaction(async client => {
      const order = (await client.query<PremiumOrder>('SELECT * FROM premium_orders WHERE provider_payment_id=$1 FOR UPDATE', [input.paymentId])).rows[0];
      if (!order) return false;
      if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor<=0 || (input.currency && input.currency!==order.currency)) throw new PremiumRequestError('Invalid refund');
      const reference = `premium:refund:${input.paymentId}:${input.id}`;
      const existing = (await client.query('SELECT amount_minor FROM ledger_transactions WHERE reference_id=$1', [reference])).rows[0];
      if (existing) { if (existing.amount_minor !== input.amountMinor) throw new PremiumRequestError('Refund amount changed'); return true; }
      const prefix = `premium:refund:${input.paymentId}:`;
      const total = Number((await client.query('SELECT coalesce(sum(amount_minor),0) AS amount FROM ledger_transactions WHERE starts_with(reference_id,$1)', [prefix])).rows[0].amount);
      if (total + input.amountMinor > order.amount_minor) throw new PremiumRequestError('Refunds exceed purchase amount');
      await client.query(`INSERT INTO ledger_transactions(id,amount_minor,currency,reference_id,status) VALUES($1,$2,$3,$4,'completed')`, [randomUUID(), input.amountMinor, order.currency, reference]);
      // Any refunded term loses perks; core functionality and existing content remain.
      await client.query(`UPDATE premium_orders SET status='refunded',updated_at=now() WHERE id=$1`, [order.id]);
      await client.query(`UPDATE premium_access SET status='refunded',updated_at=now() WHERE order_id=$1`, [order.id]);
      await client.query('SELECT yor_sync_dispute_reserve($1,$2)', ['premium',order.id]);
      return true;
    });
  }

  async cancel(userId: string, id: string) {
    await transaction(async client => {
      const order = (await client.query<PremiumOrder>('SELECT * FROM premium_orders WHERE id=$1 AND user_id=$2 FOR UPDATE', [id,userId])).rows[0];
      if (!order) throw new PremiumRequestError('Premium order not found');
      if (['paid','disputed','chargeback'].includes(order.status)) {
        await client.query(`UPDATE premium_access SET status=CASE WHEN status='active' THEN 'cancelled' ELSE status END,cancel_at_period_end=true,updated_at=now()
          WHERE order_id=$1 AND status IN ('active','disputed','chargeback')`, [id]);
      } else if (['provider_pending','creation_unknown','created'].includes(order.status)) {
        await client.query(`UPDATE premium_orders SET status='cancelled',updated_at=now() WHERE id=$1`, [id]);
      }
    });
    return this.state(userId);
  }
}
