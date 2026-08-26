import { and, desc, eq, lt, or } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db } from "@workspace/db";
import { ledgerTransactionsTable, marketplaceOrdersTable, productsTable, usersTable } from "@workspace/db/schema";
import type { MarketplaceOrderRecord } from "../types/index.js";
import { env } from "../config/env.js";
import { RazorpayService } from "./razorpay-service.js";

export class MarketplaceRequestError extends Error {}
export class MarketplaceOrderNotFoundError extends Error {}
export class MarketplaceOrderForbiddenError extends Error {}

export class MarketplaceService {
  constructor(private readonly razorpay = new RazorpayService()) {}

  private async releaseExpiredReservations(): Promise<void> {
    const now = new Date().toISOString();
    const expired = await db.select({ id: marketplaceOrdersTable.id, productId: marketplaceOrdersTable.productId })
      .from(marketplaceOrdersTable)
      .where(and(eq(marketplaceOrdersTable.status, "created"), lt(marketplaceOrdersTable.reservationExpiresAt, now)));
    if (expired.length === 0) return;
    await db.transaction(async (tx) => {
      for (const order of expired) {
        const [cancelled] = await tx.update(marketplaceOrdersTable).set({ status: "cancelled" }).where(and(
          eq(marketplaceOrdersTable.id, order.id),
          eq(marketplaceOrdersTable.status, "created"),
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
    await this.releaseExpiredReservations();
    const [product] = await db.select().from(productsTable).where(eq(productsTable.id, input.productId));
    if (!product) throw new MarketplaceRequestError("Product not found");
    if (product.availability !== "active") throw new MarketplaceRequestError("This listing is no longer available");
    if (product.sellerId === input.buyerId) throw new MarketplaceRequestError("You cannot purchase your own listing");

    const [buyer, seller] = await Promise.all([
      db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.id, input.buyerId)),
      db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.id, product.sellerId)),
    ]);
    if (!buyer[0] || !seller[0]) throw new MarketplaceRequestError("The buyer or seller account was not found");

    const amountMinor = Math.round(Number(product.price) * 100);
    if (!Number.isSafeInteger(amountMinor) || amountMinor < 100) throw new MarketplaceRequestError("This listing has an invalid price");

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

    const paidAt = new Date().toISOString();
    let settled: MarketplaceOrderRecord | undefined;
    await db.transaction(async (tx) => {
      const [updatedOrder] = await tx.update(marketplaceOrdersTable).set({
        providerPaymentId: input.paymentId,
        providerSignature: input.signature,
        status: "paid",
        paidAt,
      }).where(and(eq(marketplaceOrdersTable.id, order.id), eq(marketplaceOrdersTable.status, "created"))).returning();
      if (!updatedOrder) {
        const [current] = await tx.select().from(marketplaceOrdersTable).where(eq(marketplaceOrdersTable.id, order.id));
        settled = current as MarketplaceOrderRecord | undefined;
        return;
      }

      const [sold] = await tx.update(productsTable).set({ availability: "sold" }).where(and(
        eq(productsTable.id, order.productId),
        eq(productsTable.availability, "reserved"),
      )).returning({ id: productsTable.id });
      if (!sold) throw new MarketplaceRequestError("The listing reservation expired before payment settlement");

      const referenceId = `marketplace:${order.providerOrderId}`;
      const [existingLedger] = await tx.select({ id: ledgerTransactionsTable.id }).from(ledgerTransactionsTable).where(eq(ledgerTransactionsTable.referenceId, referenceId));
      if (!existingLedger) {
        await tx.insert(ledgerTransactionsTable).values({
          id: randomUUID(),
          creditAccountId: order.sellerId,
          debitAccountId: order.buyerId,
          amountMinor: order.amountMinor,
          currency: order.currency,
          referenceId,
          status: "completed",
        });
      }
      settled = updatedOrder as MarketplaceOrderRecord;
    });
    if (!settled) throw new MarketplaceRequestError("Marketplace payment settlement could not be completed");
    return settled;
  }

  async listOrders(userId: string) {
    await this.releaseExpiredReservations();
    return (await db.select().from(marketplaceOrdersTable).where(or(
      eq(marketplaceOrdersTable.buyerId, userId),
      eq(marketplaceOrdersTable.sellerId, userId),
    )).orderBy(desc(marketplaceOrdersTable.createdAt)).limit(100)) as MarketplaceOrderRecord[];
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
