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
import { CheckoutIntentService, checkoutHash, lockPaymentParties, paymentTransaction } from './checkout-intent-service.js';

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
      .where(and(inArray(marketplaceOrdersTable.status, ["created", "provider_pending"]), lt(marketplaceOrdersTable.reservationExpiresAt, now)))
      .orderBy(marketplaceOrdersTable.reservationExpiresAt).limit(100);
    if (expired.length === 0) return;
    await db.transaction(async (tx) => {
      for (const order of expired) {
        const [cancelled] = await tx.update(marketplaceOrdersTable).set({ status: "cancelled" }).where(and(
          eq(marketplaceOrdersTable.id, order.id),
          inArray(marketplaceOrdersTable.status, ["created", "provider_pending"]),
        )).returning({ id: marketplaceOrdersTable.id });
        if (cancelled) {
          await tx.update(productsTable).set({ availability: "active" }).where(and(
            sql`${productsTable.id} = ${order.productId}`,
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
    idempotencyKey?: string;
  }) {
    this.razorpay.assertConfigured();
    await this.releaseExpiredReservations();
    const [product] = await db.select().from(productsTable).where(eq(productsTable.id, input.productId));
    if (!product) throw new MarketplaceRequestError("Product not found");
    if (!(await this.contentSafetyService.isVisible(product, input.buyerId, product.sellerId))) {
      throw new MarketplaceRequestError("This listing is not available for your account");
    }
    if (product.sellerId === input.buyerId) throw new MarketplaceRequestError("You cannot purchase your own listing");

    const amountMinor = toMinorUnits(Number(product.price));
    if (!amountMinor || amountMinor < 100) throw new MarketplaceRequestError("This listing has an invalid price");

    const intents = new CheckoutIntentService(this.razorpay), key = input.idempotencyKey ?? randomUUID();
    const hash = checkoutHash([input.productId,input.shippingName,input.shippingAddress,input.shippingPhone ?? null]);
    const reserved = await paymentTransaction(async client => {
      await lockPaymentParties(client, [input.buyerId,product.sellerId]);
      const existing = await intents.findRepeat(client, 'marketplace', input.buyerId, key, hash);
      if (existing) return { intent: existing, created: false };
      const reservation = await client.query(`UPDATE products SET availability='reserved' WHERE id=$1 AND availability='active' AND price=$2 AND seller_id=$3 RETURNING id`, [input.productId,product.price,product.sellerId]);
      if (!reservation.rowCount) throw new MarketplaceRequestError('This listing was reserved or its price changed. Review it before retrying.');
      const id = randomUUID();
      await client.query(`INSERT INTO marketplace_orders(id,product_id,buyer_id,seller_id,provider_order_id,amount_minor,status,shipping_name,shipping_address,shipping_phone,reservation_expires_at,product_snapshot)
        VALUES($1,$2,$3,$4,$5,$6,'provider_pending',$7,$8,$9,timezone('UTC',now())+interval '15 minutes',$10)`,
      [id,input.productId,input.buyerId,product.sellerId,`pending_${id.replaceAll('-','')}`,amountMinor,input.shippingName,input.shippingAddress,input.shippingPhone ?? null,{ id: product.id, title: product.title }]);
      return { intent: await intents.reserve(client, { id, product: 'marketplace', ownerId: input.buyerId, key, hash, amountMinor }), created: true };
    });
    const intent = reserved.created ? await intents.createRemote(reserved.intent) : reserved.intent;
    return { ...await intents.publicState(intent), orderId: intent.id };
  }

  async verifyPayment(input: { buyerId: string; providerOrderId: string; paymentId: string; signature: string }) {
    this.razorpay.assertConfigured();
    const [order] = await db.select().from(marketplaceOrdersTable).where(eq(marketplaceOrdersTable.providerOrderId, input.providerOrderId));
    if (!order) throw new MarketplaceOrderNotFoundError("Marketplace payment order not found");
    if (order.buyerId !== input.buyerId) throw new MarketplaceOrderForbiddenError("This marketplace payment is not yours");
    if (!this.razorpay.verifySignature(order.providerOrderId, input.paymentId, input.signature)) throw new MarketplaceRequestError("Marketplace payment signature could not be verified");
    return this.reconcileCapturedPayment({ orderId: input.providerOrderId, paymentId: input.paymentId });
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
    await this.releaseExpiredReservations();
    const [order] = await db.select().from(marketplaceOrdersTable).where(eq(marketplaceOrdersTable.providerOrderId, input.orderId));
    if (!order) throw new MarketplaceOrderNotFoundError("Marketplace payment order not found");
    const intents = new CheckoutIntentService(this.razorpay);
    await intents.ensureProviderOrder(await intents.get(order.id));
    const payment = await this.razorpay.getPayment(input.paymentId);
    if (payment.order_id !== order.providerOrderId || payment.amount !== order.amountMinor
      || payment.currency !== order.currency || !["captured", "refunded"].includes(payment.status)) {
      throw new MarketplaceRequestError("The marketplace payment was not captured for this order");
    }
    return this.settleCapturedOrder(order.id, input.paymentId, payment.status === 'captured');
  }

  async reconcileFailedPayment(input: CapturedPaymentInput) { return new CheckoutIntentService(this.razorpay).failedAttempt('marketplace', input); }

  async recoverProviderOrder(order: Awaited<ReturnType<RazorpayService['getOrder']>>) { return new CheckoutIntentService(this.razorpay).recoverProviderOrder('marketplace', order); }

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
      if (!(["paid", "fulfilled", "refund_required", "refunded", "disputed", "chargeback"] as string[]).includes(lockedOrder.status)) {
        throw new MarketplaceRequestError("Only a settled marketplace order can be refunded");
      }
      const [refundedTotal] = await tx.select({ total: sql<number>`coalesce(sum(${ledgerTransactionsTable.amountMinor}), 0)` })
        .from(ledgerTransactionsTable)
        .where(sql`starts_with(${ledgerTransactionsTable.referenceId},${prefix})`);
      const nextRefundedTotal = Number(refundedTotal?.total ?? 0) + input.amountMinor;
      if (nextRefundedTotal > lockedOrder.amountMinor) throw new MarketplaceRequestError("Refunds exceed the original marketplace amount");

      const [capturedLedger] = await tx.select({ credited: ledgerTransactionsTable.creditAccountId }).from(ledgerTransactionsTable).where(eq(ledgerTransactionsTable.referenceId, `marketplace:${lockedOrder.providerOrderId}`));
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
        await tx.update(marketplaceOrdersTable).set({ status: "refunded" }).where(and(
          eq(marketplaceOrdersTable.id, lockedOrder.id),
          inArray(marketplaceOrdersTable.status, ["paid", "fulfilled", "refund_required", "disputed", "chargeback"]),
        ));
      }
      await tx.execute(sql`SELECT yor_sync_dispute_reserve('marketplace', ${lockedOrder.id}::uuid)`);
    });
    return true;
  }

  private isValidRefund(input: ProcessedRefundInput, amountMinor: number, currency: string): boolean {
    return Number.isSafeInteger(input.amountMinor) && input.amountMinor > 0
      && input.amountMinor <= amountMinor && (!input.currency || input.currency === currency);
  }

  private async settleCapturedOrder(orderId: string, paymentId: string, captured: boolean): Promise<MarketplaceOrderRecord> {
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
      if (!captured || lockedOrder.status === "cancelled" || lockedOrder.status === "failed" || !lockedOrder.productId || !lockedOrder.sellerId || !lockedOrder.buyerId) {
        const [latePayment] = await tx.update(marketplaceOrdersTable).set({
          providerPaymentId: paymentId,
          providerSignature: null,
          status: "refund_required",
          paidAt: new Date().toISOString(),
        }).where(and(eq(marketplaceOrdersTable.id, lockedOrder.id), inArray(marketplaceOrdersTable.status, ["created", "cancelled", "failed"])))
          .returning();
        if (!latePayment) throw new MarketplaceRequestError("Late marketplace payment could not be queued for refund");
        await tx.insert(ledgerTransactionsTable).values({ id: randomUUID(), creditAccountId: null, debitAccountId: null,
          amountMinor: lockedOrder.amountMinor, currency: lockedOrder.currency, referenceId, status: 'completed' });
        // A cancelled order may now have a different buyer's reservation.
        if (lockedOrder.status === 'created' && lockedOrder.productId) await tx.update(productsTable).set({ availability: 'active' }).where(and(eq(productsTable.id, lockedOrder.productId),eq(productsTable.availability,'reserved')));
        return latePayment as MarketplaceOrderRecord;
      }
      if (lockedOrder.status !== "created") throw new MarketplaceRequestError("This marketplace payment is no longer payable");

      const paidAt = new Date().toISOString();
      const [updatedOrder] = await tx.update(marketplaceOrdersTable).set({
        providerPaymentId: paymentId,
        providerSignature: null,
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
    return db.transaction(async tx => {
      const [current] = await tx.select().from(marketplaceOrdersTable).where(and(eq(marketplaceOrdersTable.id, orderId), eq(marketplaceOrdersTable.buyerId, buyerId))).for('update');
      if (current?.status === 'cancelled') return current as MarketplaceOrderRecord;
      const [order] = await tx.update(marketplaceOrdersTable).set({ status: "cancelled" }).where(and(
        eq(marketplaceOrdersTable.id, orderId), eq(marketplaceOrdersTable.buyerId, buyerId), inArray(marketplaceOrdersTable.status, ['provider_pending','created']),
      )).returning();
      if (!order) throw new MarketplaceRequestError("Only an unpaid order can be cancelled");
      if (order.productId) await tx.update(productsTable).set({ availability: "active" }).where(and(eq(productsTable.id, order.productId), eq(productsTable.availability, "reserved")));
      return order as MarketplaceOrderRecord;
    });
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
