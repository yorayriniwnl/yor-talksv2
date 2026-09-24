import { and, desc, eq, inArray, like, lt, or, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db } from "@workspace/db";
import { ledgerTransactionsTable, marketplaceOrdersTable, productsTable, usersTable } from "@workspace/db/schema";
import type { MarketplaceOrderRecord } from "../types/index.js";
import { env } from "../config/env.js";
import { RazorpayService } from "./razorpay-service.js";
import { ContentSafetyService } from "./content-safety-service.js";
import { toMinorUnits } from "../lib/money.js";
import type { CapturedPaymentInput, ProcessedRefundInput } from "./payment-webhook-types.js";

export class MarketplaceRequestError extends Error {}
export class MarketplaceOrderNotFoundError extends Error {}
export class MarketplaceOrderForbiddenError extends Error {}

export class MarketplaceService {
  constructor(
    private readonly razorpay = new RazorpayService(),
    private readonly contentSafetyService = new ContentSafetyService(),
  ) {}

  private async releaseExpiredReservations(): Promise<void> {
    const now = new Date().toISOString();
    const expired = await db.select({ id: marketplaceOrdersTable.id, productId: marketplaceOrdersTable.productId })
      .from(marketplaceOrdersTable)
      .where(and(inArray(marketplaceOrdersTable.status, ["created", "provider_pending"]), lt(marketplaceOrdersTable.reservationExpiresAt, now)));
    if (expired.length === 0) return;
    await db.transaction(async (tx) => {
      for (const order of expired) {
        const [cancelled] = await tx.update(marketplaceOrdersTable).set({ status: "cancelled" }).where(and(
          eq(marketplaceOrdersTable.id, order.id),
          inArray(marketplaceOrdersTable.status, ["created", "provider_pending"]),
        )).returning({ id: marketplaceOrdersTable.id });
        if (cancelled) {
          await tx.update(productsTable).set({ availability: "active" }).where(and(
            eq(productsTable.id, order.productId),
            eq(productsTable.availability, "reserved"),
          ));
        }
      }
    });
  }

  async createOrder(input: {
    buyerId: string;
    productId: string;
    shippingName: string;
    shippingAddress: string;
    shippingPhone?: string;
  }) {
    this.razorpay.assertConfigured();
    await this.releaseExpiredReservations();
    const [product] = await db.select().from(productsTable).where(eq(productsTable.id, input.productId));
    if (!product) throw new MarketplaceRequestError("Product not found");
    if (!(await this.contentSafetyService.isVisible(product, input.buyerId, product.sellerId))) {
      throw new MarketplaceRequestError("This listing is not available for your account");
    }
    if (product.availability !== "active") throw new MarketplaceRequestError("This listing is no longer available");
    if (product.sellerId === input.buyerId) throw new MarketplaceRequestError("You cannot purchase your own listing");

    const [buyer, seller] = await Promise.all([
      db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.id, input.buyerId)),
      db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.id, product.sellerId)),
    ]);
    if (!buyer[0] || !seller[0]) throw new MarketplaceRequestError("The buyer or seller account was not found");

    const amountMinor = toMinorUnits(Number(product.price));
    if (!amountMinor || amountMinor < 100) throw new MarketplaceRequestError("This listing has an invalid price");

    const orderId = randomUUID();
    const pendingProviderOrderId = `pending_${orderId.replaceAll("-", "")}`;
    await db.transaction(async (tx) => {
      const [reserved] = await tx.update(productsTable).set({ availability: "reserved" }).where(and(
        eq(productsTable.id, input.productId),
        eq(productsTable.availability, "active"),
      )).returning({ id: productsTable.id });
      if (!reserved) throw new MarketplaceRequestError("This listing was just reserved by another buyer");
      await tx.insert(marketplaceOrdersTable).values({
        id: orderId,
        productId: input.productId,
        buyerId: input.buyerId,
        sellerId: product.sellerId,
        provider: "razorpay",
        providerOrderId: pendingProviderOrderId,
        amountMinor,
        currency: "INR",
        status: "provider_pending",
        shippingName: input.shippingName,
        shippingAddress: input.shippingAddress,
        shippingPhone: input.shippingPhone || null,
        reservationExpiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      });
    });

    let providerOrder;
    try {
      providerOrder = await this.razorpay.createOrder({
        amountMinor,
        receipt: this.razorpay.createReceipt(),
        notes: { type: "marketplace_purchase", orderId, productId: input.productId, buyerId: input.buyerId, sellerId: product.sellerId },
      });
    } catch (error) {
      await db.transaction(async (tx) => {
        await tx.update(marketplaceOrdersTable).set({ status: "failed" }).where(and(eq(marketplaceOrdersTable.id, orderId), eq(marketplaceOrdersTable.status, "provider_pending")));
        await tx.update(productsTable).set({ availability: "active" }).where(and(eq(productsTable.id, input.productId), eq(productsTable.availability, "reserved")));
      });
      throw error;
    }

    await db.update(marketplaceOrdersTable).set({ providerOrderId: providerOrder.id, status: "created" }).where(and(
      eq(marketplaceOrdersTable.id, orderId),
      eq(marketplaceOrdersTable.providerOrderId, pendingProviderOrderId),
      eq(marketplaceOrdersTable.status, "provider_pending"),
    ));

    return {
      orderId,
      providerOrderId: providerOrder.id,
      amountMinor,
      currency: "INR",
      keyId: env.RAZORPAY_KEY_ID,
    };
  }

  async verifyPayment(input: { buyerId: string; providerOrderId: string; paymentId: string; signature: string }) {
    const [order] = await db.select().from(marketplaceOrdersTable).where(eq(marketplaceOrdersTable.providerOrderId, input.providerOrderId));
    if (!order) throw new MarketplaceOrderNotFoundError("Marketplace payment order not found");
    if (order.buyerId !== input.buyerId) throw new MarketplaceOrderForbiddenError("This marketplace payment is not yours");
    if (order.status === "paid" || order.status === "fulfilled") return order as MarketplaceOrderRecord;
    if (order.status !== "created") throw new MarketplaceRequestError("This marketplace payment is no longer payable");

    if (!this.razorpay.verifySignature(order.providerOrderId, input.paymentId, input.signature)) throw new MarketplaceRequestError("Marketplace payment signature could not be verified");
    const payment = await this.razorpay.getPayment(input.paymentId);
    if (payment.order_id !== order.providerOrderId || payment.amount !== order.amountMinor || payment.currency !== order.currency || payment.status !== "captured") {
      throw new MarketplaceRequestError("The marketplace payment was not captured for this order");
    }

    return this.settleCapturedOrder(order.id, input.paymentId, input.signature);
  }

  async hasProviderOrder(orderId: string): Promise<boolean> {
    const [order] = await db.select({ id: marketplaceOrdersTable.id }).from(marketplaceOrdersTable)
      .where(and(eq(marketplaceOrdersTable.provider, "razorpay"), eq(marketplaceOrdersTable.providerOrderId, orderId)));
    return Boolean(order);
  }

  async hasProviderPayment(paymentId: string): Promise<boolean> {
    const [order] = await db.select({ id: marketplaceOrdersTable.id }).from(marketplaceOrdersTable)
      .where(and(eq(marketplaceOrdersTable.provider, "razorpay"), eq(marketplaceOrdersTable.providerPaymentId, paymentId)));
    return Boolean(order);
  }

  async reconcileCapturedPayment(input: CapturedPaymentInput) {
    this.razorpay.assertConfigured();
    const [order] = await db.select().from(marketplaceOrdersTable).where(eq(marketplaceOrdersTable.providerOrderId, input.orderId));
    if (!order) throw new MarketplaceOrderNotFoundError("Marketplace payment order not found");
    const payment = await this.razorpay.getPayment(input.paymentId);
    if (payment.order_id !== order.providerOrderId || payment.amount !== order.amountMinor
      || payment.currency !== order.currency || !["captured", "refunded"].includes(payment.status)) {
      throw new MarketplaceRequestError("The marketplace payment was not captured for this order");
    }
    return this.settleCapturedOrder(order.id, input.paymentId);
  }

  async reconcileRefund(input: ProcessedRefundInput): Promise<boolean> {
    const [order] = await db.select().from(marketplaceOrdersTable).where(eq(marketplaceOrdersTable.providerPaymentId, input.paymentId));
    if (!order) return false;
    if (!this.isValidRefund(input, order.amountMinor, order.currency)) throw new MarketplaceRequestError("Refund details do not match the marketplace order");

    await db.transaction(async (tx) => {
      const [lockedOrder] = await tx.select().from(marketplaceOrdersTable).where(eq(marketplaceOrdersTable.id, order.id)).for("update");
      if (!lockedOrder || lockedOrder.providerPaymentId !== input.paymentId) throw new MarketplaceRequestError("Refund payment does not match the marketplace order");
      const prefix = `marketplace:refund:${input.paymentId}:`;
      const referenceId = `${prefix}${input.id}`;
      const [existingRefund] = await tx.select({ id: ledgerTransactionsTable.id, amountMinor: ledgerTransactionsTable.amountMinor })
        .from(ledgerTransactionsTable).where(eq(ledgerTransactionsTable.referenceId, referenceId));
      if (existingRefund) {
        if (existingRefund.amountMinor !== input.amountMinor) throw new MarketplaceRequestError("Refund id was already recorded with a different amount");
        return;
      }
      if (!(["paid", "fulfilled", "refund_required", "refunded"] as string[]).includes(lockedOrder.status)) {
        throw new MarketplaceRequestError("Only a settled marketplace order can be refunded");
      }
      const [refundedTotal] = await tx.select({ total: sql<number>`coalesce(sum(${ledgerTransactionsTable.amountMinor}), 0)` })
        .from(ledgerTransactionsTable)
        .where(like(ledgerTransactionsTable.referenceId, `${prefix}%`));
      const nextRefundedTotal = Number(refundedTotal?.total ?? 0) + input.amountMinor;
      if (nextRefundedTotal > lockedOrder.amountMinor) throw new MarketplaceRequestError("Refunds exceed the original marketplace amount");

      await tx.insert(ledgerTransactionsTable).values({
        id: randomUUID(),
        creditAccountId: null,
        debitAccountId: lockedOrder.status === "refund_required" ? null : lockedOrder.sellerId,
        amountMinor: input.amountMinor,
        currency: lockedOrder.currency,
        referenceId,
        status: "completed",
      });
      if (nextRefundedTotal === lockedOrder.amountMinor) {
        await tx.update(marketplaceOrdersTable).set({ status: "refunded" }).where(and(
          eq(marketplaceOrdersTable.id, lockedOrder.id),
          inArray(marketplaceOrdersTable.status, ["paid", "fulfilled", "refund_required"]),
        ));
      }
    });
    return true;
  }

  private isValidRefund(input: ProcessedRefundInput, amountMinor: number, currency: string): boolean {
    return Number.isSafeInteger(input.amountMinor) && input.amountMinor > 0
      && input.amountMinor <= amountMinor && (!input.currency || input.currency === currency);
  }

  private async settleCapturedOrder(orderId: string, paymentId: string, signature?: string): Promise<MarketplaceOrderRecord> {
    return db.transaction(async (tx) => {
      const [lockedOrder] = await tx.select().from(marketplaceOrdersTable).where(eq(marketplaceOrdersTable.id, orderId)).for("update");
      if (!lockedOrder) throw new MarketplaceOrderNotFoundError("Marketplace payment order not found");
      const referenceId = `marketplace:${lockedOrder.providerOrderId}`;
      const [existing] = await tx.select({ id: ledgerTransactionsTable.id }).from(ledgerTransactionsTable)
        .where(eq(ledgerTransactionsTable.referenceId, referenceId));
      if (existing) {
        if (lockedOrder.providerPaymentId && lockedOrder.providerPaymentId !== paymentId) {
          throw new MarketplaceRequestError("Another payment has already been linked to this marketplace order");
        }
        return lockedOrder as MarketplaceOrderRecord;
      }
      if (lockedOrder.status === "refund_required" && lockedOrder.providerPaymentId === paymentId) {
        return lockedOrder as MarketplaceOrderRecord;
      }
      if (lockedOrder.status === "cancelled" || lockedOrder.status === "failed") {
        const [latePayment] = await tx.update(marketplaceOrdersTable).set({
          providerPaymentId: paymentId,
          providerSignature: signature ?? null,
          status: "refund_required",
          paidAt: new Date().toISOString(),
        }).where(and(eq(marketplaceOrdersTable.id, lockedOrder.id), inArray(marketplaceOrdersTable.status, ["cancelled", "failed"])))
          .returning();
        if (!latePayment) throw new MarketplaceRequestError("Late marketplace payment could not be queued for refund");
        return latePayment as MarketplaceOrderRecord;
      }
      if (lockedOrder.status !== "created") throw new MarketplaceRequestError("This marketplace payment is no longer payable");

      const paidAt = new Date().toISOString();
      const [updatedOrder] = await tx.update(marketplaceOrdersTable).set({
        providerPaymentId: paymentId,
        providerSignature: signature ?? null,
        status: "paid",
        paidAt,
      }).where(and(eq(marketplaceOrdersTable.id, lockedOrder.id), eq(marketplaceOrdersTable.status, "created"))).returning();
      if (!updatedOrder) throw new MarketplaceRequestError("This marketplace payment is no longer payable");

      const [sold] = await tx.update(productsTable).set({ availability: "sold" }).where(and(
        eq(productsTable.id, lockedOrder.productId),
        eq(productsTable.availability, "reserved"),
      )).returning({ id: productsTable.id });
      if (!sold) throw new MarketplaceRequestError("The listing reservation expired before payment settlement");
      await tx.insert(ledgerTransactionsTable).values({
        id: randomUUID(),
        creditAccountId: lockedOrder.sellerId,
        debitAccountId: null,
        amountMinor: lockedOrder.amountMinor,
        currency: lockedOrder.currency,
        referenceId,
        status: "completed",
      });
      return updatedOrder as MarketplaceOrderRecord;
    });
  }

  async listOrders(userId: string) {
    await this.releaseExpiredReservations();
    const orders = await db.select().from(marketplaceOrdersTable).where(or(
      eq(marketplaceOrdersTable.buyerId, userId),
      eq(marketplaceOrdersTable.sellerId, userId),
    )).orderBy(desc(marketplaceOrdersTable.createdAt)).limit(100);
    const paymentIds = orders.map((order) => order.providerPaymentId).filter((id): id is string => Boolean(id));
    if (!paymentIds.length) return orders as MarketplaceOrderRecord[];
    const refundRows = await db.select({
      paymentId: sql<string>`split_part(${ledgerTransactionsTable.referenceId}, ':', 3)`,
      total: sql<number>`coalesce(sum(${ledgerTransactionsTable.amountMinor}), 0)`,
    }).from(ledgerTransactionsTable).where(and(
      eq(ledgerTransactionsTable.status, "completed"),
      eq(ledgerTransactionsTable.currency, "INR"),
      like(ledgerTransactionsTable.referenceId, "marketplace:refund:%"),
      inArray(sql<string>`split_part(${ledgerTransactionsTable.referenceId}, ':', 3)`, paymentIds),
    )).groupBy(sql`split_part(${ledgerTransactionsTable.referenceId}, ':', 3)`);
    const refundsByPayment = new Map(refundRows.map((row) => [row.paymentId, Number(row.total ?? 0)]));
    return orders.map((order) => ({
      ...order,
      refundedAmountMinor: order.providerPaymentId ? refundsByPayment.get(order.providerPaymentId) ?? 0 : 0,
    })) as MarketplaceOrderRecord[];
  }

  async cancelOrder(orderId: string, buyerId: string) {
    const [order] = await db.update(marketplaceOrdersTable).set({ status: "cancelled" }).where(and(
      eq(marketplaceOrdersTable.id, orderId),
      eq(marketplaceOrdersTable.buyerId, buyerId),
      eq(marketplaceOrdersTable.status, "created"),
    )).returning();
    if (!order) throw new MarketplaceRequestError("Only an unpaid order can be cancelled");
    await db.update(productsTable).set({ availability: "active" }).where(and(eq(productsTable.id, order.productId), eq(productsTable.availability, "reserved")));
    return order as MarketplaceOrderRecord;
  }

  async fulfillOrder(orderId: string, sellerId: string) {
    const [order] = await db.update(marketplaceOrdersTable).set({
      status: "fulfilled",
      fulfilledAt: new Date().toISOString(),
    }).where(and(
      eq(marketplaceOrdersTable.id, orderId),
      eq(marketplaceOrdersTable.sellerId, sellerId),
      eq(marketplaceOrdersTable.status, "paid"),
    )).returning();
    if (!order) throw new MarketplaceRequestError("Only a paid order belonging to you can be fulfilled");
    return order as MarketplaceOrderRecord;
  }
}
