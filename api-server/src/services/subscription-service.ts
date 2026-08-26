import { and, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import {
  entitlementsTable,
  ledgerTransactionsTable,
  subscriptionOrdersTable,
  subscriptionsTable,
  usersTable,
} from "@workspace/db/schema";
import { db } from "@workspace/db";
import { env } from "../config/env.js";
import { RazorpayService } from "./razorpay-service.js";

export const SUBSCRIPTION_TIERS = [
  {
    id: "chai",
    name: "Desi Chai Club",
    priceMinor: 4_900,
    badge: "☕",
    perks: ["Member badge", "VIP live chat", "Members-only posts"],
  },
  {
    id: "elite",
    name: "Squad Elite Warrior",
    priceMinor: 19_900,
    badge: "⚡",
    perks: ["Everything in Chai Club", "Early access", "Vote on creator content"],
  },
  {
    id: "vip",
    name: "Maha Maharaja VIP",
    priceMinor: 99_900,
    badge: "👑",
    perks: ["Everything in Elite Warrior", "Priority community access", "Monthly creator session"],
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

  async createOrder(input: { subscriberId: string; creatorId: string; tier: string }) {
    if (input.subscriberId === input.creatorId) {
      throw new SubscriptionRequestError("You cannot subscribe to your own creator membership");
    }

    const tier = tierFor(input.tier);
    if (!tier) {
      throw new SubscriptionRequestError("That membership tier is not available");
    }

    const [subscriber, creator] = await Promise.all([
      db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.id, input.subscriberId)),
      db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.id, input.creatorId)),
    ]);
    if (!subscriber[0] || !creator[0]) {
      throw new SubscriptionRequestError("The subscriber or creator account was not found");
    }

    const now = new Date();
    const existing = await db.select().from(subscriptionsTable).where(and(
      eq(subscriptionsTable.subscriberId, input.subscriberId),
      eq(subscriptionsTable.creatorId, input.creatorId),
    ));
    const active = existing.find((subscription) => subscription.status === "active" && (!subscription.expiresAt || new Date(subscription.expiresAt) > now));
    if (active) {
      throw new SubscriptionRequestError("You already have an active membership for this creator");
    }
    const pending = existing.find((subscription) => subscription.status === "pending");
    if (pending) {
      const pendingOrder = await db.select().from(subscriptionOrdersTable).where(and(
        eq(subscriptionOrdersTable.subscriptionId, pending.id),
        eq(subscriptionOrdersTable.status, "created"),
      ));
      if (pendingOrder[0]) {
        return {
          subscriptionId: pending.id,
          orderId: pendingOrder[0].providerOrderId,
          amountMinor: pendingOrder[0].amountMinor,
          currency: pendingOrder[0].currency,
          keyId: env.RAZORPAY_KEY_ID,
          tier: pending.tier,
        };
      }
    }

    const subscriptionId = randomUUID();
    const providerOrder = await this.razorpay.createOrder({
      amountMinor: tier.priceMinor,
      receipt: this.razorpay.createReceipt(),
      notes: {
        type: "creator_membership",
        subscriptionId,
        subscriberId: input.subscriberId,
        creatorId: input.creatorId,
        tier: tier.id,
      },
    });

    await db.transaction(async (tx) => {
      await tx.insert(subscriptionsTable).values({
        id: subscriptionId,
        subscriberId: input.subscriberId,
        creatorId: input.creatorId,
        tier: tier.id,
        status: "pending",
        priceMinor: tier.priceMinor,
        currency: "INR",
        startedAt: new Date().toISOString(),
      });
      await tx.insert(subscriptionOrdersTable).values({
        id: randomUUID(),
        subscriptionId,
        subscriberId: input.subscriberId,
        creatorId: input.creatorId,
        provider: "razorpay",
        providerOrderId: providerOrder.id,
        amountMinor: tier.priceMinor,
        currency: "INR",
        status: "created",
      });
    });

    return {
      subscriptionId,
      orderId: providerOrder.id,
      amountMinor: tier.priceMinor,
      currency: "INR",
      keyId: env.RAZORPAY_KEY_ID,
      tier: tier.id,
    };
  }

  async verifyPayment(input: { subscriberId: string; orderId: string; paymentId: string; signature: string }) {
    const [order] = await db.select().from(subscriptionOrdersTable).where(eq(subscriptionOrdersTable.providerOrderId, input.orderId));
    if (!order) throw new SubscriptionOrderNotFoundError("Membership payment order not found");
    if (order.subscriberId !== input.subscriberId) throw new SubscriptionOrderForbiddenError("This membership payment is not yours");

    if (order.status === "paid") {
      const [subscription] = await db.select().from(subscriptionsTable).where(eq(subscriptionsTable.id, order.subscriptionId));
      return { subscriptionId: order.subscriptionId, status: "active" as const, expiresAt: subscription?.expiresAt ?? null };
    }
    if (order.status !== "created") throw new SubscriptionRequestError("This membership payment is no longer payable");

    if (!this.razorpay.verifySignature(order.providerOrderId, input.paymentId, input.signature)) {
      throw new SubscriptionRequestError("Membership payment signature could not be verified");
    }
    const payment = await this.razorpay.getPayment(input.paymentId);
    if (payment.order_id !== order.providerOrderId || payment.amount !== order.amountMinor || payment.currency !== order.currency || payment.status !== "captured") {
      throw new SubscriptionRequestError("The membership payment was not captured for this order");
    }

    const startedAt = new Date();
    const expiresAt = addMembershipPeriod(startedAt);
    await db.transaction(async (tx) => {
      const [updatedOrder] = await tx.update(subscriptionOrdersTable).set({
        providerPaymentId: input.paymentId,
        providerSignature: input.signature,
        status: "paid",
        paidAt: startedAt.toISOString(),
      }).where(and(eq(subscriptionOrdersTable.id, order.id), eq(subscriptionOrdersTable.status, "created"))).returning({ id: subscriptionOrdersTable.id });
      if (!updatedOrder) return;

      await tx.update(subscriptionsTable).set({
        status: "active",
        startedAt: startedAt.toISOString(),
        expiresAt,
      }).where(eq(subscriptionsTable.id, order.subscriptionId));

      const [existingEntitlement] = await tx.select({ id: entitlementsTable.id }).from(entitlementsTable).where(and(
        eq(entitlementsTable.userId, order.subscriberId),
        eq(entitlementsTable.entityType, "subscription"),
        eq(entitlementsTable.entityId, order.subscriptionId),
      ));
      if (existingEntitlement) {
        await tx.update(entitlementsTable).set({ status: "active", grantedAt: startedAt.toISOString(), expiresAt }).where(eq(entitlementsTable.id, existingEntitlement.id));
      } else {
        await tx.insert(entitlementsTable).values({
          id: randomUUID(),
          userId: order.subscriberId,
          entityType: "subscription",
          entityId: order.subscriptionId,
          status: "active",
          grantedAt: startedAt.toISOString(),
          expiresAt,
        });
      }

      const referenceId = `subscription:${order.providerOrderId}`;
      const [existingLedger] = await tx.select({ id: ledgerTransactionsTable.id }).from(ledgerTransactionsTable).where(eq(ledgerTransactionsTable.referenceId, referenceId));
      if (!existingLedger) {
        await tx.insert(ledgerTransactionsTable).values({
          id: randomUUID(),
          creditAccountId: order.creatorId,
          debitAccountId: order.subscriberId,
          amountMinor: order.amountMinor,
          currency: order.currency,
          referenceId,
          status: "completed",
        });
      }
    });

    return { subscriptionId: order.subscriptionId, status: "active" as const, expiresAt };
  }

  async listForSubscriber(subscriberId: string) {
    const subscriptions = await db.select().from(subscriptionsTable).where(eq(subscriptionsTable.subscriberId, subscriberId));
    const now = new Date();
    await Promise.all(subscriptions.map(async (subscription) => {
      if (subscription.status === "active" && subscription.expiresAt && new Date(subscription.expiresAt) <= now) {
        await db.update(subscriptionsTable).set({ status: "expired" }).where(and(eq(subscriptionsTable.id, subscription.id), eq(subscriptionsTable.status, "active")));
        subscription.status = "expired";
      }
    }));
    return subscriptions;
  }

  async cancel(subscriptionId: string, subscriberId: string) {
    const [subscription] = await db.update(subscriptionsTable).set({ status: "cancelled" }).where(and(
      eq(subscriptionsTable.id, subscriptionId),
      eq(subscriptionsTable.subscriberId, subscriberId),
      eq(subscriptionsTable.status, "active"),
    )).returning();
    if (!subscription) throw new SubscriptionRequestError("Active membership not found");
    await db.update(entitlementsTable).set({ status: "revoked" }).where(and(
      eq(entitlementsTable.userId, subscriberId),
      eq(entitlementsTable.entityType, "subscription"),
      eq(entitlementsTable.entityId, subscriptionId),
      eq(entitlementsTable.status, "active"),
    ));
    return subscription;
  }
}
