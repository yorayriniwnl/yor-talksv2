import { and, eq, inArray, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import {
  entitlementsTable,
  ledgerTransactionsTable,
  subscriptionOrdersTable,
  subscriptionsTable,
  usersTable,
} from "@workspace/db/schema";
import { db, pool } from "@workspace/db";
import { env } from "../config/env.js";
import { RazorpayService } from "./razorpay-service.js";
import type { CapturedPaymentInput, ProcessedRefundInput } from "./payment-webhook-types.js";
import { CheckoutIntentService, checkoutHash, lockPaymentParties, paymentTransaction } from './checkout-intent-service.js';

export const SUBSCRIPTION_TIERS = [
  {
    id: "chai",
    name: "Desi Chai Club",
    priceMinor: 4_900,
    badge: "☕",
    perks: ["30-day creator support membership", "Membership status and billing history", "No automatic renewal; no Yor Premium perks"],
  },
  {
    id: "elite",
    name: "Squad Elite Warrior",
    priceMinor: 19_900,
    badge: "⚡",
    perks: ["30-day creator support membership", "Membership status and billing history", "No automatic renewal; no Yor Premium perks"],
  },
  {
    id: "vip",
    name: "Maha Maharaja VIP",
    priceMinor: 99_900,
    badge: "👑",
    perks: ["30-day creator support membership", "Membership status and billing history", "No automatic renewal; no Yor Premium perks"],
  },
] as const;

export type SubscriptionTierId = typeof SUBSCRIPTION_TIERS[number]["id"];

export class SubscriptionRequestError extends Error {}
export class SubscriptionOrderNotFoundError extends Error {}
export class SubscriptionOrderForbiddenError extends Error {}

function addMembershipPeriod(date = new Date()): string {
  const expiresAt = new Date(date);
  expiresAt.setUTCDate(expiresAt.getUTCDate() + 30);
  return expiresAt.toISOString();
}

function tierFor(id: string) {
  return SUBSCRIPTION_TIERS.find((tier) => tier.id === id);
}

export class SubscriptionService {
  constructor(private readonly razorpay = new RazorpayService()) {}

  getTiers() {
    return SUBSCRIPTION_TIERS.map((tier) => ({ ...tier, currency: "INR" as const }));
  }

  async createOrder(input: { subscriberId: string; creatorId: string; tier: string; idempotencyKey?: string }) {
    // A previously-created checkout is unavailable too when payments pause.
    this.razorpay.assertConfigured();
    if (input.subscriberId === input.creatorId) {
      throw new SubscriptionRequestError("You cannot subscribe to your own creator membership");
    }

    const tier = tierFor(input.tier);
    if (!tier) {
      throw new SubscriptionRequestError("That membership tier is not available");
    }

    const intents = new CheckoutIntentService(this.razorpay), key = input.idempotencyKey ?? randomUUID();
    const hash = checkoutHash([input.creatorId,tier.id,tier.priceMinor]);
    const reserved = await paymentTransaction(async client => {
      await lockPaymentParties(client, [input.subscriberId,input.creatorId]);
      const repeated = await intents.findRepeat(client, 'membership', input.subscriberId, key, hash);
      if (repeated) return { intent: repeated, created: false };
      const active = await client.query(`SELECT 1 FROM subscriptions WHERE subscriber_id=$1 AND creator_id=$2 AND status IN ('active','disputed','chargeback') AND expires_at>timezone('UTC',now())`, [input.subscriberId,input.creatorId]);
      if (active.rowCount) throw new SubscriptionRequestError('You already have an active membership or a disputed term for this creator');
      const pending = (await client.query(`SELECT i.*,s.tier FROM subscriptions s JOIN subscription_orders o ON o.subscription_id=s.id
        JOIN checkout_intents i ON i.id=o.id WHERE s.subscriber_id=$1 AND s.creator_id=$2 AND s.status='pending'
        AND o.status IN ('provider_pending','created') LIMIT 1`, [input.subscriberId,input.creatorId])).rows[0];
      if (pending) {
        if (pending.tier !== tier.id) throw new SubscriptionRequestError('Recover or cancel your pending membership before choosing another tier');
        return { intent: pending, created: false };
      }
      const subscriptionId = randomUUID(), id = randomUUID();
      await client.query(`INSERT INTO subscriptions(id,subscriber_id,creator_id,tier,status,price_minor,currency,started_at)
        VALUES($1,$2,$3,$4,'pending',$5,'INR',now())`, [subscriptionId,input.subscriberId,input.creatorId,tier.id,tier.priceMinor]);
      await client.query(`INSERT INTO subscription_orders(id,subscription_id,subscriber_id,creator_id,provider_order_id,amount_minor,status)
        VALUES($1,$2,$3,$4,$5,$6,'provider_pending')`, [id,subscriptionId,input.subscriberId,input.creatorId,`pending_${id.replaceAll('-','')}`,tier.priceMinor]);
      return { intent: await intents.reserve(client, { id, product: 'membership', ownerId: input.subscriberId, key, hash, amountMinor: tier.priceMinor }), created: true };
    });
    const intent = reserved.created ? await intents.createRemote(reserved.intent) : reserved.intent;
    const order = (await pool.query('SELECT subscription_id FROM subscription_orders WHERE id=$1', [intent.id])).rows[0];
    return { ...await intents.publicState(intent), subscriptionId: order.subscription_id as string, orderId: intent.provider_order_id, tier: tier.id };
  }

  async verifyPayment(input: { subscriberId: string; subscriptionId: string; orderId: string; paymentId: string; signature: string }) {
    this.razorpay.assertConfigured();
    const [order] = await db.select().from(subscriptionOrdersTable).where(eq(subscriptionOrdersTable.providerOrderId, input.orderId));
    if (!order) throw new SubscriptionOrderNotFoundError("Membership payment order not found");
    if (order.subscriberId !== input.subscriberId) throw new SubscriptionOrderForbiddenError("This membership payment is not yours");
    if (order.subscriptionId !== input.subscriptionId) throw new SubscriptionOrderForbiddenError("This membership payment does not match the subscription");

    if (!this.razorpay.verifySignature(order.providerOrderId, input.paymentId, input.signature)) {
      throw new SubscriptionRequestError("Membership payment signature could not be verified");
    }
    return this.reconcileCapturedPayment({ orderId: input.orderId, paymentId: input.paymentId });
  }

  async hasProviderOrder(orderId: string): Promise<boolean> {
    const [order] = await db.select({ id: subscriptionOrdersTable.id }).from(subscriptionOrdersTable)
      .where(and(eq(subscriptionOrdersTable.provider, "razorpay"), eq(subscriptionOrdersTable.providerOrderId, orderId)));
    return Boolean(order);
  }

  async hasProviderPayment(paymentId: string): Promise<boolean> {
    const [order] = await db.select({ id: subscriptionOrdersTable.id }).from(subscriptionOrdersTable)
      .where(and(eq(subscriptionOrdersTable.provider, "razorpay"), eq(subscriptionOrdersTable.providerPaymentId, paymentId)));
    return Boolean(order);
  }

  async reconcileCapturedPayment(input: CapturedPaymentInput) {
    this.razorpay.assertConfigured();
    const [order] = await db.select().from(subscriptionOrdersTable).where(eq(subscriptionOrdersTable.providerOrderId, input.orderId));
    if (!order) throw new SubscriptionOrderNotFoundError("Membership payment order not found");
    const intents = new CheckoutIntentService(this.razorpay);
    await intents.ensureProviderOrder(await intents.get(order.id));
    const payment = await this.razorpay.getPayment(input.paymentId);
    if (payment.order_id !== order.providerOrderId || payment.amount !== order.amountMinor
      || payment.currency !== order.currency || !["captured", "refunded"].includes(payment.status)) {
      throw new SubscriptionRequestError("The membership payment was not captured for this order");
    }
    return this.settleCapturedOrder(order.id, input.paymentId, payment.status === 'captured');
  }

  async reconcileFailedPayment(input: CapturedPaymentInput) { return new CheckoutIntentService(this.razorpay).failedAttempt('membership', input); }

  async recoverProviderOrder(order: Awaited<ReturnType<RazorpayService['getOrder']>>) { return new CheckoutIntentService(this.razorpay).recoverProviderOrder('membership', order); }

  async reconcileRefund(input: ProcessedRefundInput): Promise<boolean> {
    const [order] = await db.select().from(subscriptionOrdersTable).where(eq(subscriptionOrdersTable.providerPaymentId, input.paymentId));
    if (!order) return false;
    if (!this.isValidRefund(input, order.amountMinor, order.currency)) throw new SubscriptionRequestError("Refund details do not match the membership order");

    await db.transaction(async (tx) => {
      const [lockedOrder] = await tx.select().from(subscriptionOrdersTable).where(eq(subscriptionOrdersTable.id, order.id)).for("update");
      if (!lockedOrder || lockedOrder.providerPaymentId !== input.paymentId) throw new SubscriptionRequestError("Refund payment does not match the membership order");
      const prefix = `subscription:refund:${input.paymentId}:`;
      const referenceId = `${prefix}${input.id}`;
      const [existingRefund] = await tx.select({ id: ledgerTransactionsTable.id, amountMinor: ledgerTransactionsTable.amountMinor })
        .from(ledgerTransactionsTable).where(eq(ledgerTransactionsTable.referenceId, referenceId));
      if (existingRefund) {
        if (existingRefund.amountMinor !== input.amountMinor) throw new SubscriptionRequestError("Refund id was already recorded with a different amount");
        return;
      }
      if (!['paid','refunded','refund_required','disputed','chargeback'].includes(lockedOrder.status)) throw new SubscriptionRequestError("Only a settled membership can be refunded");
      const [refundedTotal] = await tx.select({ total: sql<number>`coalesce(sum(${ledgerTransactionsTable.amountMinor}), 0)` })
        .from(ledgerTransactionsTable)
        .where(sql`starts_with(${ledgerTransactionsTable.referenceId},${prefix})`);
      const nextRefundedTotal = Number(refundedTotal?.total ?? 0) + input.amountMinor;
      if (nextRefundedTotal > lockedOrder.amountMinor) throw new SubscriptionRequestError("Refunds exceed the original membership amount");

      const [capturedLedger] = await tx.select({ credited: ledgerTransactionsTable.creditAccountId }).from(ledgerTransactionsTable).where(eq(ledgerTransactionsTable.referenceId, `subscription:${lockedOrder.providerOrderId}`));
      await tx.insert(ledgerTransactionsTable).values({
        id: randomUUID(),
        creditAccountId: null,
        debitAccountId: capturedLedger?.credited ?? null,
        amountMinor: input.amountMinor,
        currency: lockedOrder.currency,
        referenceId,
        status: "completed",
      });
      {
        await tx.update(subscriptionOrdersTable).set({ status: "refunded" })
          .where(eq(subscriptionOrdersTable.id, lockedOrder.id));
        await tx.update(subscriptionsTable).set({ status: "refunded" }).where(eq(subscriptionsTable.id, lockedOrder.subscriptionId));
        await tx.update(entitlementsTable).set({ status: "revoked" }).where(and(
          eq(entitlementsTable.entityType, "subscription"),
          eq(entitlementsTable.entityId, lockedOrder.subscriptionId),
          inArray(entitlementsTable.status, ['active','disputed']),
        ));
      }
      await tx.execute(sql`SELECT yor_sync_dispute_reserve('membership', ${lockedOrder.id}::uuid)`);
    });
    return true;
  }

  private isValidRefund(input: ProcessedRefundInput, amountMinor: number, currency: string): boolean {
    return Number.isSafeInteger(input.amountMinor) && input.amountMinor > 0
      && input.amountMinor <= amountMinor && (!input.currency || input.currency === currency);
  }

  private async settleCapturedOrder(orderId: string, paymentId: string, captured: boolean) {
    const startedAt = new Date();
    const expiresAt = addMembershipPeriod(startedAt);
    return db.transaction(async (tx) => {
      const [lockedOrder] = await tx.select().from(subscriptionOrdersTable).where(eq(subscriptionOrdersTable.id, orderId)).for("update");
      if (!lockedOrder) throw new SubscriptionOrderNotFoundError("Membership payment order not found");
      const referenceId = `subscription:${lockedOrder.providerOrderId}`;
      const [existing] = await tx.select({ id: ledgerTransactionsTable.id })
        .from(ledgerTransactionsTable).where(eq(ledgerTransactionsTable.referenceId, referenceId));
      if (existing) {
        if (lockedOrder.providerPaymentId && lockedOrder.providerPaymentId !== paymentId) {
          throw new SubscriptionRequestError("Another payment has already been linked to this membership order");
        }
        const [subscription] = await tx.select({ expiresAt: subscriptionsTable.expiresAt, status: subscriptionsTable.status })
          .from(subscriptionsTable).where(eq(subscriptionsTable.id, lockedOrder.subscriptionId));
        return { subscriptionId: lockedOrder.subscriptionId, status: subscription?.status ?? 'unavailable', expiresAt: subscription?.expiresAt ?? null };
      }
      if (!['created','cancelled','expired'].includes(lockedOrder.status)) throw new SubscriptionRequestError("This membership payment is no longer payable");
      const [subscription] = await tx.select().from(subscriptionsTable).where(eq(subscriptionsTable.id, lockedOrder.subscriptionId)).for('update');
      const grant = captured && lockedOrder.status === 'created' && subscription?.status === 'pending' && Boolean(lockedOrder.subscriberId && lockedOrder.creatorId);

      const [updatedOrder] = await tx.update(subscriptionOrdersTable).set({
        providerPaymentId: paymentId,
        providerSignature: null,
        status: grant ? 'paid' : 'refund_required',
        paidAt: startedAt.toISOString(),
      }).where(eq(subscriptionOrdersTable.id, lockedOrder.id))
        .returning({ id: subscriptionOrdersTable.id });
      if (!updatedOrder) throw new SubscriptionRequestError("This membership payment is no longer payable");

      await tx.update(subscriptionsTable).set(grant ? { status: "active", startedAt: startedAt.toISOString(), expiresAt } : { status: 'refund_required' })
        .where(eq(subscriptionsTable.id, lockedOrder.subscriptionId));
      if (grant && lockedOrder.subscriberId && lockedOrder.creatorId) {
      const [existingEntitlement] = await tx.select({ id: entitlementsTable.id }).from(entitlementsTable).where(and(
        eq(entitlementsTable.entityType, "subscription"),
        eq(entitlementsTable.entityId, lockedOrder.subscriptionId),
      ));
      if (existingEntitlement) {
        await tx.update(entitlementsTable).set({ status: "active", grantedAt: startedAt.toISOString(), expiresAt })
          .where(eq(entitlementsTable.id, existingEntitlement.id));
      } else {
        await tx.insert(entitlementsTable).values({
          id: randomUUID(),
          userId: lockedOrder.subscriberId,
          entityType: "subscription",
          entityId: lockedOrder.subscriptionId,
          status: "active",
          grantedAt: startedAt.toISOString(),
          expiresAt,
        });
      }
      }
      await tx.insert(ledgerTransactionsTable).values({
        id: randomUUID(),
        creditAccountId: grant ? lockedOrder.creatorId : null,
        debitAccountId: null,
        amountMinor: lockedOrder.amountMinor,
        currency: lockedOrder.currency,
        referenceId,
        status: "completed",
      });
      return { subscriptionId: lockedOrder.subscriptionId, status: grant ? 'active' : 'refund_required', expiresAt: grant ? expiresAt : null };
    });
  }

  async listForSubscriber(subscriberId: string) {
    await pool.query(`UPDATE subscriptions SET status='expired' WHERE subscriber_id=$1 AND status='active' AND expires_at<=timezone('UTC',now())`, [subscriberId]);
    return db.select().from(subscriptionsTable).where(eq(subscriptionsTable.subscriberId, subscriberId)).limit(100);
  }

  async cancel(subscriptionId: string, subscriberId: string) {
    await paymentTransaction(async client => {
      await client.query('SELECT id FROM subscription_orders WHERE subscription_id=$1 FOR UPDATE', [subscriptionId]);
      const sub = (await client.query('SELECT * FROM subscriptions WHERE id=$1 AND subscriber_id=$2 FOR UPDATE', [subscriptionId,subscriberId])).rows[0];
      if (!sub) throw new SubscriptionRequestError('Membership not found');
      if (['active','disputed','chargeback'].includes(sub.status)) await client.query('UPDATE subscriptions SET cancel_at_period_end=true WHERE id=$1', [subscriptionId]);
      if (sub.status === 'pending') {
        await client.query(`UPDATE subscriptions SET status='cancelled',cancel_at_period_end=true WHERE id=$1`, [subscriptionId]);
        await client.query(`UPDATE subscription_orders SET status='cancelled' WHERE subscription_id=$1 AND status IN ('provider_pending','created')`, [subscriptionId]);
      }
    });
    return (await db.select().from(subscriptionsTable).where(eq(subscriptionsTable.id, subscriptionId)))[0]!;
  }
}
