import { and, eq } from "drizzle-orm";
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

    const transactionId = await db.transaction(async (tx) => {
      const [alreadySettled] = await tx.select({ id: ledgerTransactionsTable.id })
        .from(ledgerTransactionsTable)
        .where(eq(ledgerTransactionsTable.referenceId, referenceId));
      if (alreadySettled) {
        return alreadySettled.id;
      }

      const [settledOrder] = await tx.update(paymentOrdersTable)
        .set({
          providerPaymentId: input.paymentId,
          providerSignature: input.signature,
          status: "paid",
          paidAt: new Date().toISOString(),
        })
        .where(and(eq(paymentOrdersTable.id, order.id), eq(paymentOrdersTable.status, "created")))
        .returning({ id: paymentOrdersTable.id });
      if (!settledOrder) {
        throw new PaymentRequestError("This payment order has already been settled or cancelled");
      }

      const [ledger] = await tx.insert(ledgerTransactionsTable).values({
        id: randomUUID(),
        creditAccountId: order.creatorId,
        debitAccountId: order.payerId,
        amountMinor: order.amountMinor,
        currency: order.currency,
        referenceId,
        status: "completed",
      }).returning({ id: ledgerTransactionsTable.id });
      return ledger.id;
    });

    return { transactionId, status: "paid" as const };
  }

  async reconcileCapturedPayment(input: { orderId: string; paymentId: string }) {
    this.razorpay.assertConfigured();
    const [order] = await db.select().from(paymentOrdersTable).where(eq(paymentOrdersTable.providerOrderId, input.orderId));
    if (!order) throw new PaymentOrderNotFoundError("Payment order not found");
    const payment = await this.razorpay.getPayment(input.paymentId);
    if (payment.order_id !== order.providerOrderId || payment.amount !== order.amountMinor
      || payment.currency !== order.currency || payment.status !== "captured") {
      throw new PaymentRequestError("The payment was not captured for this order");
    }

    const referenceId = `razorpay:${order.providerOrderId}`;
    const transactionId = await db.transaction(async (tx) => {
      const [existing] = await tx.select({ id: ledgerTransactionsTable.id })
        .from(ledgerTransactionsTable).where(eq(ledgerTransactionsTable.referenceId, referenceId));
      if (existing) return existing.id;
      const [updated] = await tx.update(paymentOrdersTable).set({
        providerPaymentId: input.paymentId,
        status: "paid",
        paidAt: new Date().toISOString(),
      }).where(and(eq(paymentOrdersTable.id, order.id), eq(paymentOrdersTable.status, "created"))).returning({ id: paymentOrdersTable.id });
      if (!updated) throw new PaymentRequestError("This payment order has already been settled or cancelled");
      const [ledger] = await tx.insert(ledgerTransactionsTable).values({
        id: randomUUID(), creditAccountId: order.creatorId, debitAccountId: order.payerId,
        amountMinor: order.amountMinor, currency: order.currency, referenceId, status: "completed",
      }).returning({ id: ledgerTransactionsTable.id });
      return ledger.id;
    });
    return { transactionId, status: "paid" as const };
  }
}
