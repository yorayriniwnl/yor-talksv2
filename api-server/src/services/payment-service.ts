import { and, eq, or, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db } from "@workspace/db";
import {
  ledgerTransactionsTable,
  liveStreamsTable,
  paymentOrdersTable,
  usersTable,
} from "@workspace/db/schema";
import { env } from "../config/env.js";
import { RazorpayService } from "./razorpay-service.js";
import type { CapturedPaymentInput, ProcessedRefundInput } from "./payment-webhook-types.js";
import { CheckoutIntentService, checkoutHash, lockPaymentParties, paymentTransaction } from './checkout-intent-service.js';

export class PaymentOrderNotFoundError extends Error {}
export class PaymentOrderForbiddenError extends Error {}
export class PaymentRequestError extends Error {}

export class PaymentService {
  constructor(private readonly razorpay = new RazorpayService()) {}

  verifyWebhookSignature(payload: Buffer, signature: string): boolean {
    return this.razorpay.verifyWebhookSignature(payload, signature);
  }

  async createTipOrder(input: {
    payerId: string;
    creatorId: string;
    streamId?: string;
    amountMinor: number;
    message?: string;
    idempotencyKey?: string;
  }) {
    this.razorpay.assertConfigured();
    if (input.payerId === input.creatorId) {
      throw new PaymentRequestError("You cannot send a tip to yourself");
    }

    if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor<100 || input.amountMinor>1_000_000) throw new PaymentRequestError('Invalid tip amount');
    const intents = new CheckoutIntentService(this.razorpay), key = input.idempotencyKey ?? randomUUID();
    const hash = checkoutHash([input.creatorId,input.streamId ?? null,input.amountMinor,input.message?.trim() ?? '']);
    const reserved = await paymentTransaction(async client => {
      await lockPaymentParties(client, [input.payerId,input.creatorId]);
      const existing = await intents.findRepeat(client, 'tip', input.payerId, key, hash);
      if (existing) return { intent: existing, created: false };
      if (input.streamId && !(await client.query('SELECT id FROM live_streams WHERE id=$1 AND host_id=$2', [input.streamId,input.creatorId])).rowCount) throw new PaymentRequestError('The stream does not belong to this creator');
      const id = randomUUID();
      await client.query(`INSERT INTO payment_orders(id,payer_id,creator_id,stream_id,provider_order_id,amount_minor,status,message)
        VALUES($1,$2,$3,$4,$5,$6,'provider_pending',$7)`, [id,input.payerId,input.creatorId,input.streamId ?? null,`pending_${id.replaceAll('-','')}`,input.amountMinor,input.message?.trim() ?? '']);
      return { intent: await intents.reserve(client, { id, product: 'tip', ownerId: input.payerId, key, hash, amountMinor: input.amountMinor }), created: true };
    });
    const intent = reserved.created ? await intents.createRemote(reserved.intent) : reserved.intent;
    return { ...await intents.publicState(intent), orderId: intent.provider_order_id };
  }

  async verifyTipPayment(input: {
    payerId: string;
    orderId: string;
    paymentId: string;
    signature: string;
  }) {
    this.razorpay.assertConfigured();
    const [order] = await db.select().from(paymentOrdersTable).where(eq(paymentOrdersTable.providerOrderId, input.orderId));
    if (!order) {
      throw new PaymentOrderNotFoundError("Payment order not found");
    }
    if (order.payerId !== input.payerId) {
      throw new PaymentOrderForbiddenError("This payment order belongs to another account");
    }
    if (!this.razorpay.verifySignature(order.providerOrderId, input.paymentId, input.signature)) {
      throw new PaymentRequestError("Payment signature could not be verified");
    }

    return this.reconcileCapturedPayment({ orderId: input.orderId, paymentId: input.paymentId });
  }

  async hasProviderOrder(orderId: string): Promise<boolean> {
    const [order] = await db.select({ id: paymentOrdersTable.id }).from(paymentOrdersTable)
      .where(and(eq(paymentOrdersTable.provider, "razorpay"), eq(paymentOrdersTable.providerOrderId, orderId)));
    return Boolean(order);
  }

  async hasProviderPayment(paymentId: string): Promise<boolean> {
    const [order] = await db.select({ id: paymentOrdersTable.id }).from(paymentOrdersTable)
      .where(and(eq(paymentOrdersTable.provider, "razorpay"), eq(paymentOrdersTable.providerPaymentId, paymentId)));
    return Boolean(order);
  }

  async reconcileCapturedPayment(input: CapturedPaymentInput) {
    this.razorpay.assertConfigured();
    const [order] = await db.select().from(paymentOrdersTable).where(eq(paymentOrdersTable.providerOrderId, input.orderId));
    if (!order) throw new PaymentOrderNotFoundError("Payment order not found");
    const intents = new CheckoutIntentService(this.razorpay);
    await intents.ensureProviderOrder(await intents.get(order.id));
    const payment = await this.razorpay.getPayment(input.paymentId);
    if (payment.order_id !== order.providerOrderId || payment.amount !== order.amountMinor
      || payment.currency !== order.currency || !["captured", "refunded"].includes(payment.status)) {
      throw new PaymentRequestError("The payment was not captured for this order");
    }
    return this.settleCapturedOrder(order.id, input.paymentId, payment.status === 'captured');
  }

  async reconcileFailedPayment(input: CapturedPaymentInput) { return new CheckoutIntentService(this.razorpay).failedAttempt('tip', input); }

  async recoverProviderOrder(order: Awaited<ReturnType<RazorpayService['getOrder']>>) { return new CheckoutIntentService(this.razorpay).recoverProviderOrder('tip', order); }

  async reconcileRefund(input: ProcessedRefundInput): Promise<boolean> {
    const [order] = await db.select().from(paymentOrdersTable).where(eq(paymentOrdersTable.providerPaymentId, input.paymentId));
    if (!order) return false;
    if (!this.isValidRefund(input, order.amountMinor, order.currency)) throw new PaymentRequestError("Refund details do not match the payment order");

    await db.transaction(async (tx) => {
      const [lockedOrder] = await tx.select().from(paymentOrdersTable).where(eq(paymentOrdersTable.id, order.id)).for("update");
      if (!lockedOrder || lockedOrder.providerPaymentId !== input.paymentId) throw new PaymentRequestError("Refund payment does not match the payment order");
      const prefix = `razorpay:refund:${input.paymentId}:`;
      const referenceId = `${prefix}${input.id}`;
      const [existingRefund] = await tx.select({ id: ledgerTransactionsTable.id, amountMinor: ledgerTransactionsTable.amountMinor })
        .from(ledgerTransactionsTable).where(eq(ledgerTransactionsTable.referenceId, referenceId));
      if (existingRefund) {
        if (existingRefund.amountMinor !== input.amountMinor) throw new PaymentRequestError("Refund id was already recorded with a different amount");
        return;
      }
      if (!['paid','refunded','refund_required','disputed','chargeback'].includes(lockedOrder.status)) throw new PaymentRequestError("Only a settled payment can be refunded");
      const [refundedTotal] = await tx.select({ total: sql<number>`coalesce(sum(${ledgerTransactionsTable.amountMinor}), 0)` })
        .from(ledgerTransactionsTable)
        .where(sql`starts_with(${ledgerTransactionsTable.referenceId},${prefix})`);
      const nextRefundedTotal = Number(refundedTotal?.total ?? 0) + input.amountMinor;
      if (nextRefundedTotal > lockedOrder.amountMinor) throw new PaymentRequestError("Refunds exceed the original payment amount");

      const [capturedLedger] = await tx.select({ credited: ledgerTransactionsTable.creditAccountId }).from(ledgerTransactionsTable)
        .where(or(eq(ledgerTransactionsTable.referenceId, `razorpay:${lockedOrder.providerOrderId}`), eq(ledgerTransactionsTable.referenceId, `razorpay:${lockedOrder.id}`)));
      await tx.insert(ledgerTransactionsTable).values({
        id: randomUUID(),
        creditAccountId: null,
        debitAccountId: capturedLedger?.credited ?? null,
        amountMinor: input.amountMinor,
        currency: lockedOrder.currency,
        referenceId,
        status: "completed",
      });
      if (nextRefundedTotal === lockedOrder.amountMinor) {
        await tx.update(paymentOrdersTable).set({ status: "refunded" })
          .where(eq(paymentOrdersTable.id, lockedOrder.id));
      }
      await tx.execute(sql`SELECT yor_sync_dispute_reserve('tip', ${lockedOrder.id}::uuid)`);
    });
    return true;
  }

  private isValidRefund(input: ProcessedRefundInput, amountMinor: number, currency: string): boolean {
    return Number.isSafeInteger(input.amountMinor) && input.amountMinor > 0
      && input.amountMinor <= amountMinor && (!input.currency || input.currency === currency);
  }


  private async settleCapturedOrder(orderId: string, paymentId: string, captured: boolean) {
    return db.transaction(async (tx) => {
      const [lockedOrder] = await tx.select().from(paymentOrdersTable).where(eq(paymentOrdersTable.id, orderId)).for("update");
      if (!lockedOrder) throw new PaymentRequestError("Payment order no longer exists");
      const referenceId = `razorpay:${lockedOrder.providerOrderId}`;
      const [existing] = await tx.select({ id: ledgerTransactionsTable.id })
        .from(ledgerTransactionsTable).where(or(eq(ledgerTransactionsTable.referenceId, referenceId), eq(ledgerTransactionsTable.referenceId, `razorpay:${orderId}`)));
      if (existing) {
        if (lockedOrder.providerPaymentId && lockedOrder.providerPaymentId !== paymentId) {
          throw new PaymentRequestError("Another payment has already been linked to this order");
        }
        return { transactionId: existing.id, status: lockedOrder.status };
      }
      if (!["created", "cancelled", "expired"].includes(lockedOrder.status)) {
        throw new PaymentRequestError("This payment order has already been settled or cancelled");
      }
      const status = captured && lockedOrder.status === "created" && lockedOrder.creatorId && lockedOrder.payerId
        ? "paid"
        : "refund_required";

      const [settledOrder] = await tx.update(paymentOrdersTable).set({
        providerPaymentId: paymentId,
        providerSignature: null,
        status,
        paidAt: new Date().toISOString(),
      }).where(eq(paymentOrdersTable.id, lockedOrder.id))
        .returning({ id: paymentOrdersTable.id });
      if (!settledOrder) throw new PaymentRequestError("This payment order has already been settled or cancelled");

      const [ledger] = await tx.insert(ledgerTransactionsTable).values({
        id: randomUUID(),
        creditAccountId: status === "paid" ? lockedOrder.creatorId : null,
        debitAccountId: null,
        amountMinor: lockedOrder.amountMinor,
        currency: lockedOrder.currency,
        referenceId,
        status: "completed",
      }).returning({ id: ledgerTransactionsTable.id });
      return { transactionId: ledger.id, status };
    });
  }

}