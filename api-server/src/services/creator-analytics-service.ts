import { and, desc, eq, gte, lt, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import {
  creatorAnalyticsDailyTable,
  creatorProfileViewEventsTable,
  ledgerTransactionsTable,
  postsTable,
  userFollowsTable,
  videosTable,
} from "@workspace/db/schema";
import { db } from "@workspace/db";

function dayWindow(date = new Date()) {
  const start = new Date(date);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { date: start.toISOString(), nextDate: end.toISOString() };
}

export class CreatorAnalyticsService {
  async recordProfileView(creatorId: string, viewerId: string): Promise<void> {
    if (creatorId === viewerId) return;
    const { date } = dayWindow();
    try {
      await db.transaction(async (tx) => {
        const [newView] = await tx.insert(creatorProfileViewEventsTable).values({
          id: randomUUID(),
          creatorId,
          viewerId,
          viewDate: date,
        }).onConflictDoNothing().returning({ id: creatorProfileViewEventsTable.id });
        if (!newView) return;
        await tx.insert(creatorAnalyticsDailyTable).values({
          id: randomUUID(),
          creatorId,
          date,
          profileViews: 1,
        }).onConflictDoUpdate({
          target: [creatorAnalyticsDailyTable.creatorId, creatorAnalyticsDailyTable.date],
          set: { profileViews: sql`${creatorAnalyticsDailyTable.profileViews} + 1` },
        });
      });
    } catch {
      // Analytics must never make a profile unavailable when an optional
      // rollup write is temporarily unavailable.
    }
  }

  async getRecent(creatorId: string) {
    const { date, nextDate } = dayWindow();
    const [postTotals, videoTotals, followerTotals, earnings, current] = await Promise.all([
      db.select({
        views: sql<number>`coalesce(sum(${postsTable.views}), 0)`,
        engagement: sql<number>`coalesce(sum(${postsTable.likesCount} + ${postsTable.commentsCount} + ${postsTable.shareCount} + ${postsTable.repostCount}), 0)`,
      }).from(postsTable).where(eq(postsTable.authorId, creatorId)),
      db.select({
        views: sql<number>`coalesce(sum(${videosTable.views}), 0)`,
        engagement: sql<number>`coalesce(sum(jsonb_array_length(coalesce(${videosTable.likedBy}, '[]'::jsonb))), 0)`,
      }).from(videosTable).where(eq(videosTable.authorId, creatorId)),
      db.select({ count: sql<number>`count(*)` }).from(userFollowsTable).where(and(
        eq(userFollowsTable.followingId, creatorId),
        gte(userFollowsTable.createdAt, date),
        lt(userFollowsTable.createdAt, nextDate),
      )),
      db.select({ total: sql<number>`coalesce(sum(${ledgerTransactionsTable.amountMinor}), 0)` }).from(ledgerTransactionsTable).where(and(
        eq(ledgerTransactionsTable.creditAccountId, creatorId),
        eq(ledgerTransactionsTable.status, "completed"),
        gte(ledgerTransactionsTable.createdAt, date),
        lt(ledgerTransactionsTable.createdAt, nextDate),
      )),
      db.select({ profileViews: creatorAnalyticsDailyTable.profileViews }).from(creatorAnalyticsDailyTable).where(and(
        eq(creatorAnalyticsDailyTable.creatorId, creatorId),
        eq(creatorAnalyticsDailyTable.date, date),
      )),
    ]);

    const snapshot = {
      profileViews: Number(current[0]?.profileViews ?? 0),
      newFollowers: Number(followerTotals[0]?.count ?? 0),
      totalPostViews: Number(postTotals[0]?.views ?? 0),
      totalReelViews: Number(videoTotals[0]?.views ?? 0),
      totalEngagement: Number(postTotals[0]?.engagement ?? 0) + Number(videoTotals[0]?.engagement ?? 0),
      estimatedEarnings: Number(earnings[0]?.total ?? 0),
    };

    await db.insert(creatorAnalyticsDailyTable).values({ id: randomUUID(), creatorId, date, ...snapshot }).onConflictDoUpdate({
      target: [creatorAnalyticsDailyTable.creatorId, creatorAnalyticsDailyTable.date],
      set: snapshot,
    });

    return db.select().from(creatorAnalyticsDailyTable)
      .where(eq(creatorAnalyticsDailyTable.creatorId, creatorId))
      .orderBy(desc(creatorAnalyticsDailyTable.date))
      .limit(30);
  }
}
