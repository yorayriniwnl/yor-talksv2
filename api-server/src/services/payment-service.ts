import { and, eq, like, sql } from "drizzle-orm";
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
  }) {
    this.razorpay.assertConfigured();
    if (input.payerId === input.creatorId) {
      throw new PaymentRequestError("You cannot send a tip to yourself");
    }

    const [payer] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.id, input.payerId));
    const [creator] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.id, input.creatorId));
    if (!payer || !creator) {
      throw new PaymentRequestError("The payer or creator account was not found");
    }

    if (input.streamId) {
      const [stream] = await db.select({ id: liveStreamsTable.id }).from(liveStreamsTable).where(eq(liveStreamsTable.id, input.streamId));
      if (!stream) {
        throw new PaymentRequestError("The live stream was not found");
      }
    }

    const providerOrder = await this.razorpay.createOrder({
      amountMinor: input.amountMinor,
      receipt: this.razorpay.createReceipt(),
      notes: {
        payerId: input.payerId,
        creatorId: input.creatorId,
        ...(input.streamId ? { streamId: input.streamId } : {}),
      },
    });

    const [order] = await db.insert(paymentOrdersTable).values({
      id: randomUUID(),
      payerId: input.payerId,
      creatorId: input.creatorId,
      streamId: input.streamId,
      provider: "razorpay",
      providerOrderId: providerOrder.id,
      amountMinor: input.amountMinor,
      currency: "INR",
      status: "created",
      message: input.message?.trim() || "",
    }).returning();

    return {
      orderId: order.providerOrderId,
      amountMinor: order.amountMinor,
      currency: order.currency,
      keyId: env.RAZORPAY_KEY_ID,
    };
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
    if (order.status === "refunded") throw new PaymentRequestError("This payment has been refunded");

    const referenceId = `razorpay:${order.providerOrderId}`;
    const [existingLedger] = await db.select({ id: ledgerTransactionsTable.id })
      .from(ledgerTransactionsTable)
      .where(eq(ledgerTransactionsTable.referenceId, referenceId));
    if (existingLedger) {
      return { transactionId: existingLedger.id, status: "paid" as const };
    }

    if (!this.razorpay.verifySignature(order.providerOrderId, input.paymentId, input.signature)) {
      throw new PaymentRequestError("Payment signature could not be verified");
    }

    const payment = await this.razorpay.getPayment(input.paymentId);
    if (
      payment.order_id !== order.providerOrderId ||
      payment.amount !== order.amountMinor ||
      payment.currency !== order.currency ||
      payment.status !== "captured"
    ) {
      throw new PaymentRequestError("The payment was not captured for this order");
    }

    const transactionId = await this.settleCapturedOrder(order.id, input.paymentId, input.signature);

    return { transactionId, status: "paid" as const };
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
    const payment = await this.razorpay.getPayment(input.paymentId);
    if (payment.order_id !== order.providerOrderId || payment.amount !== order.amountMinor
      || payment.currency !== order.currency || !["captured", "refunded"].includes(payment.status)) {
      throw new PaymentRequestError("The payment was not captured for this order");
    }
    const transactionId = await this.settleCapturedOrder(order.id, input.paymentId);
    return { transactionId, status: "paid" as const };
  }

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
      if (lockedOrder.status !== "paid" && lockedOrder.status !== "refunded") throw new PaymentRequestError("Only a settled payment can be refunded");
      const [refundedTotal] = await tx.select({ total: sql<number>`coalesce(sum(${ledgerTransactionsTable.amountMinor}), 0)` })
        .from(ledgerTransactionsTable)
        .where(and(eq(ledgerTransactionsTable.debitAccountId, lockedOrder.creatorId), like(ledgerTransactionsTable.referenceId, `${prefix}%`)));
      const nextRefundedTotal = Number(refundedTotal?.total ?? 0) + input.amountMinor;
      if (nextRefundedTotal > lockedOrder.amountMinor) throw new PaymentRequestError("Refunds exceed the original payment amount");

      await tx.insert(ledgerTransactionsTable).values({
        id: randomUUID(),
        creditAccountId: null,
        debitAccountId: lockedOrder.creatorId,
        amountMinor: input.amountMinor,
        currency: lockedOrder.currency,
        referenceId,
        status: "completed",
      });
      if (nextRefundedTotal === lockedOrder.amountMinor) {
        await tx.update(paymentOrdersTable).set({ status: "refunded" })
          .where(and(eq(paymentOrdersTable.id, lockedOrder.id), eq(paymentOrdersTable.status, "paid")));
      }
    });
    return true;
  }

  private isValidRefund(input: ProcessedRefundInput, amountMinor: number, currency: string): boolean {
    return Number.isSafeInteger(input.amountMinor) && input.amountMinor > 0
      && input.amountMinor <= amountMinor && (!input.currency || input.currency === currency);
  }

  private async settleCapturedOrder(orderId: string, paymentId: string, signature?: string): Promise<string> {
    const referenceId = `razorpay:${orderId}`;
    return db.transaction(async (tx) => {
      const [lockedOrder] = await tx.select().from(paymentOrdersTable).where(eq(paymentOrdersTable.id, orderId)).for("update");
      if (!lockedOrder) throw new PaymentRequestError("Payment order no longer exists");
      const [existing] = await tx.select({ id: ledgerTransactionsTable.id })
        .from(ledgerTransactionsTable).where(eq(ledgerTransactionsTable.referenceId, referenceId));
      if (existing) {
        if (lockedOrder.providerPaymentId && lockedOrder.providerPaymentId !== paymentId) {
          throw new PaymentRequestError("Another payment has already been linked to this order");
        }
        return existing.id;
      }
      if (lockedOrder.status !== "created") throw new PaymentRequestError("This payment order has already been settled or cancelled");

      const [settledOrder] = await tx.update(paymentOrdersTable).set({
        providerPaymentId: paymentId,
        providerSignature: signature ?? null,
        status: "paid",
        paidAt: new Date().toISOString(),
      }).where(and(eq(paymentOrdersTable.id, lockedOrder.id), eq(paymentOrdersTable.status, "created")))
        .returning({ id: paymentOrdersTable.id });
      if (!settledOrder) throw new PaymentRequestError("This payment order has already been settled or cancelled");

      const [ledger] = await tx.insert(ledgerTransactionsTable).values({
        id: randomUUID(),
        creditAccountId: lockedOrder.creatorId,
        debitAccountId: null,
        amountMinor: lockedOrder.amountMinor,
        currency: lockedOrder.currency,
        referenceId,
        status: "completed",
      }).returning({ id: ledgerTransactionsTable.id });
      return ledger.id;
    });
  }
}
