import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { pushSubscriptionsTable } from "@workspace/db/schema";
import type { PushSubscriptionRecord } from "../types/index.js";

export class PushSubscriptionRepository {
  async upsert(input: Omit<PushSubscriptionRecord, "id" | "createdAt" | "lastUsedAt">): Promise<PushSubscriptionRecord> {
    const [subscription] = await db.insert(pushSubscriptionsTable).values({
      id: randomUUID(),
      ...input,
    }).onConflictDoUpdate({
      target: [pushSubscriptionsTable.userId, pushSubscriptionsTable.endpoint],
      set: {
        p256dh: input.p256dh,
        auth: input.auth,
        userAgent: input.userAgent ?? null,
        lastUsedAt: new Date().toISOString(),
      },
    }).returning();
    return subscription as PushSubscriptionRecord;
  }

  async listForUser(userId: string): Promise<PushSubscriptionRecord[]> {
    return (await db.select().from(pushSubscriptionsTable).where(eq(pushSubscriptionsTable.userId, userId))) as PushSubscriptionRecord[];
  }

  async remove(userId: string, endpoint: string): Promise<boolean> {
    const deleted = await db.delete(pushSubscriptionsTable).where(and(
      eq(pushSubscriptionsTable.userId, userId),
      eq(pushSubscriptionsTable.endpoint, endpoint),
    )).returning({ id: pushSubscriptionsTable.id });
    return deleted.length > 0;
  }

  async removeByEndpoint(endpoint: string): Promise<boolean> {
    const deleted = await db.delete(pushSubscriptionsTable)
      .where(eq(pushSubscriptionsTable.endpoint, endpoint))
      .returning({ id: pushSubscriptionsTable.id });
    return deleted.length > 0;
  }

  async markUsed(id: string): Promise<void> {
    await db.update(pushSubscriptionsTable)
      .set({ lastUsedAt: new Date().toISOString() })
      .where(eq(pushSubscriptionsTable.id, id));
  }
}
