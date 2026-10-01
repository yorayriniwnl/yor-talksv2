import { and, asc, desc, eq, gte, isNotNull, lt, sql } from "drizzle-orm";
import { db, pool } from "@workspace/db";
import {
  commentsTable,
  communityMembersTable,
  postLikesTable,
  productAnalyticsDailyTable,
  productAnalyticsEventsTable,
  productAnalyticsJobsTable,
  reelViewsTable,
  storyReactionsTable,
  storyViewsTable,
  usersTable,
} from "@workspace/db/schema";
import { z } from "zod";
import { randomUUID } from "node:crypto";

const navigationEventSchema = z.object({}).strict();
const profilerEventSchema = z.object({
  id: z.literal("App"),
  phase: z.enum(["mount", "update", "nested-update"]),
  actualDuration: z.number().finite().min(0).max(60_000),
  baseDuration: z.number().finite().min(0).max(60_000),
}).strict();

export const productEventSchema = z.discriminatedUnion("eventName", [
  z.object({
    eventId: z.string().uuid(),
    schemaVersion: z.literal(1),
    eventName: z.literal("navigation"),
    occurredAt: z.string().datetime({ offset: true }),
    properties: navigationEventSchema.default({}),
  }).strict(),
  z.object({
    eventId: z.string().uuid(),
    schemaVersion: z.literal(1),
    eventName: z.literal("react:profiler"),
    occurredAt: z.string().datetime({ offset: true }),
    properties: profilerEventSchema,
  }).strict(),
]);

export const productEventBatchSchema = z.array(productEventSchema).min(1).max(20).superRefine((events, context) => {
  const now = Date.now();
  events.forEach((event, index) => {
    const occurredAt = Date.parse(event.occurredAt);
    if (occurredAt < now - 90 * 86_400_000 || occurredAt > now + 5 * 60_000) {
      context.addIssue({ code: "custom", path: [index, "occurredAt"], message: "Event timestamp is outside the accepted window" });
    }
  });
});
export type ProductEvent = z.infer<typeof productEventSchema>;

class AnalyticsRollupQualityError extends Error {
  readonly code = "analytics_rollup_mismatch";

  constructor() {
    super("Daily analytics rollup does not match raw events");
    this.name = "AnalyticsRollupQualityError";
  }
}

export class ProductAnalyticsService {
  async ingest(actorId: string | null, events: ProductEvent[]): Promise<number> {
    const rows = events.map((event) => ({
      id: event.eventId,
      schemaVersion: event.schemaVersion,
      eventName: event.eventName,
      actorId,
      occurredAt: event.occurredAt,
      properties: event.properties,
    }));
    const inserted = await db.insert(productAnalyticsEventsTable).values(rows)
      .onConflictDoNothing({ target: productAnalyticsEventsTable.id })
      .returning({ id: productAnalyticsEventsTable.id });
    return inserted.length;
  }

  async rollupDay(day: Date): Promise<void> {
    const start = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate()));
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);
    const date = start.toISOString();

    await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext('yor-product-analytics-rollup'), hashtext(${date}))`);
      await tx.delete(productAnalyticsDailyTable).where(eq(productAnalyticsDailyTable.date, date));
      await tx.execute(sql`
        INSERT INTO product_analytics_daily (date, event_name, event_count, unique_users, rolled_up_at)
        SELECT ${date}::timestamptz, event_name, count(*)::integer, count(DISTINCT actor_id)::integer, NOW()
        FROM product_analytics_events
        WHERE occurred_at >= ${date}::timestamptz AND occurred_at < ${end.toISOString()}::timestamptz
        GROUP BY event_name
        UNION ALL
        SELECT ${date}::timestamptz, 'active_users', count(*)::integer, count(*)::integer, NOW()
        FROM (
          SELECT DISTINCT actor_id
          FROM product_analytics_events
          WHERE actor_id IS NOT NULL
            AND occurred_at >= ${date}::timestamptz AND occurred_at < ${end.toISOString()}::timestamptz
        ) active
      `);
    });
  }

  async runDailyRollup(day: Date): Promise<void> {
    const id = randomUUID();
    const start = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate()));
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);
    await db.insert(productAnalyticsJobsTable).values({
      id,
      jobName: "product-analytics-daily-rollup",
      status: "running",
      processedThrough: start.toISOString(),
    });
    try {
      await this.rollupDay(day);
      const quality = await pool.query<{ mismatches: string }>(`
        WITH expected AS (
          SELECT event_name, count(*)::integer AS event_count, count(DISTINCT actor_id)::integer AS unique_users
          FROM product_analytics_events
          WHERE occurred_at >= $1::timestamptz AND occurred_at < $2::timestamptz
          GROUP BY event_name
        ), actual AS (
          SELECT event_name, event_count, unique_users
          FROM product_analytics_daily WHERE date = $1::timestamptz
        )
        SELECT count(*)::text AS mismatches
        FROM expected
        FULL OUTER JOIN actual USING (event_name)
        WHERE coalesce(expected.event_name, actual.event_name) <> 'active_users'
          AND (expected.event_name IS NULL OR actual.event_name IS NULL
            OR expected.event_count IS DISTINCT FROM actual.event_count
            OR expected.unique_users IS DISTINCT FROM actual.unique_users)
      `, [start.toISOString(), end.toISOString()]);
      if (Number(quality.rows[0]?.mismatches ?? 0) > 0) throw new AnalyticsRollupQualityError();
      const [counts] = await db.select({ count: sql<number>`count(*)` }).from(productAnalyticsEventsTable).where(and(
        gte(productAnalyticsEventsTable.occurredAt, start.toISOString()),
        lt(productAnalyticsEventsTable.occurredAt, end.toISOString()),
      ));
      await db.update(productAnalyticsJobsTable).set({
        status: "succeeded",
        finishedAt: new Date().toISOString(),
        processedEvents: Number(counts?.count ?? 0),
      }).where(eq(productAnalyticsJobsTable.id, id));
    } catch (error) {
      await db.update(productAnalyticsJobsTable).set({
        status: "failed",
        finishedAt: new Date().toISOString(),
        errorCode: error instanceof AnalyticsRollupQualityError ? error.code : "analytics_rollup_failed",
      }).where(eq(productAnalyticsJobsTable.id, id));
      throw error;
    }
  }

  async getDaily(from: Date, toExclusive: Date) {
    return db.select().from(productAnalyticsDailyTable).where(and(
      gte(productAnalyticsDailyTable.date, from.toISOString()),
      lt(productAnalyticsDailyTable.date, toExclusive.toISOString()),
    )).orderBy(asc(productAnalyticsDailyTable.date), asc(productAnalyticsDailyTable.eventName));
  }

  async getOverview(now = new Date()) {
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const weekAgo = new Date(now.getTime() - 7 * 86_400_000);
    const monthAgo = new Date(now.getTime() - 30 * 86_400_000);
    const activationStart = new Date(now.getTime() - 37 * 86_400_000);
    const activationEnd = new Date(now.getTime() - 7 * 86_400_000);
    const activeUsersSince = (from: Date) => db.select({ count: sql<number>`count(DISTINCT ${productAnalyticsEventsTable.actorId})` })
      .from(productAnalyticsEventsTable).where(and(
        isNotNull(productAnalyticsEventsTable.actorId),
        gte(productAnalyticsEventsTable.occurredAt, from.toISOString()),
        lt(productAnalyticsEventsTable.occurredAt, now.toISOString()),
      ));
    const [dau, wau, mau, acquisition, latestRollup, latestJob, comments, likes, storyViews, storyReactions, communityJoins, reelViews, activation, retention, reconciliation] = await Promise.all([
      activeUsersSince(today),
      activeUsersSince(weekAgo),
      activeUsersSince(monthAgo),
      db.select({ count: sql<number>`count(*)` }).from(usersTable).where(and(
        gte(usersTable.createdAt, monthAgo.toISOString()),
        lt(usersTable.createdAt, now.toISOString()),
      )),
      db.select({ date: productAnalyticsDailyTable.date, rolledUpAt: productAnalyticsDailyTable.rolledUpAt })
        .from(productAnalyticsDailyTable).orderBy(desc(productAnalyticsDailyTable.date)).limit(1),
      db.select({ status: productAnalyticsJobsTable.status, startedAt: productAnalyticsJobsTable.startedAt,
        finishedAt: productAnalyticsJobsTable.finishedAt, processedThrough: productAnalyticsJobsTable.processedThrough,
        processedEvents: productAnalyticsJobsTable.processedEvents, errorCode: productAnalyticsJobsTable.errorCode })
        .from(productAnalyticsJobsTable).orderBy(desc(productAnalyticsJobsTable.startedAt)).limit(1),
      db.select({ count: sql<number>`count(*)` }).from(commentsTable).where(and(gte(commentsTable.createdAt, monthAgo.toISOString()), lt(commentsTable.createdAt, now.toISOString()))),
      db.select({ count: sql<number>`count(*)` }).from(postLikesTable).where(and(gte(postLikesTable.createdAt, monthAgo.toISOString()), lt(postLikesTable.createdAt, now.toISOString()))),
      db.select({ count: sql<number>`count(*)` }).from(storyViewsTable).where(and(gte(storyViewsTable.viewedAt, monthAgo.toISOString()), lt(storyViewsTable.viewedAt, now.toISOString()))),
      db.select({ count: sql<number>`count(*)` }).from(storyReactionsTable).where(and(gte(storyReactionsTable.createdAt, monthAgo.toISOString()), lt(storyReactionsTable.createdAt, now.toISOString()))),
      db.select({ count: sql<number>`count(*)` }).from(communityMembersTable).where(and(gte(communityMembersTable.createdAt, monthAgo.toISOString()), lt(communityMembersTable.createdAt, now.toISOString()))),
      db.select({ count: sql<number>`count(*)` }).from(reelViewsTable).where(and(gte(reelViewsTable.startedAt, monthAgo.toISOString()), lt(reelViewsTable.startedAt, now.toISOString()))),
      pool.query<{ eligible: string; activated: string }>(`
        WITH eligible AS (
          SELECT id, created_at FROM users
          WHERE created_at >= $1::timestamptz AND created_at < $2::timestamptz
            AND coalesce(account_status, 'active') NOT IN ('deactivated', 'suspended')
        ), actions AS (
          SELECT author_id AS actor_id, created_at AS occurred_at FROM posts
          UNION ALL SELECT author_id, created_at FROM comments
          UNION ALL SELECT follower_id, created_at FROM user_follows
          UNION ALL SELECT user_id, created_at FROM community_members
          UNION ALL SELECT sender_id, created_at FROM messages
          UNION ALL SELECT user_id, viewed_at FROM story_views
          UNION ALL SELECT user_id, created_at FROM post_likes
        )
        SELECT count(*)::text AS eligible,
          count(*) FILTER (WHERE EXISTS (
            SELECT 1 FROM actions
            WHERE actions.actor_id = eligible.id
              AND actions.occurred_at >= eligible.created_at
              AND actions.occurred_at < eligible.created_at + interval '7 days'
          ))::text AS activated
        FROM eligible
      `, [activationStart.toISOString(), activationEnd.toISOString()]),
      pool.query<{ cohortDate: string; signups: string; day1: string; day7: string; day30: string }>(`
        WITH cohorts AS (
          SELECT id, date_trunc('day', created_at AT TIME ZONE 'UTC') AS cohort_date
          FROM users
          WHERE created_at >= date_trunc('day', NOW() AT TIME ZONE 'UTC') - interval '90 days'
            AND created_at < date_trunc('day', NOW() AT TIME ZONE 'UTC') - interval '30 days'
            AND coalesce(account_status, 'active') NOT IN ('deactivated', 'suspended')
        )
        SELECT cohort_date::date::text AS "cohortDate", count(*)::text AS signups,
          count(*) FILTER (WHERE EXISTS (
            SELECT 1 FROM product_analytics_events event
            WHERE event.actor_id = cohorts.id
              AND event.occurred_at >= (cohort_date AT TIME ZONE 'UTC') + interval '1 day'
              AND event.occurred_at < (cohort_date AT TIME ZONE 'UTC') + interval '2 days'
          ))::text AS day1,
          count(*) FILTER (WHERE EXISTS (
            SELECT 1 FROM product_analytics_events event
            WHERE event.actor_id = cohorts.id
              AND event.occurred_at >= (cohort_date AT TIME ZONE 'UTC') + interval '7 days'
              AND event.occurred_at < (cohort_date AT TIME ZONE 'UTC') + interval '8 days'
          ))::text AS day7,
          count(*) FILTER (WHERE EXISTS (
            SELECT 1 FROM product_analytics_events event
            WHERE event.actor_id = cohorts.id
              AND event.occurred_at >= (cohort_date AT TIME ZONE 'UTC') + interval '30 days'
              AND event.occurred_at < (cohort_date AT TIME ZONE 'UTC') + interval '31 days'
          ))::text AS day30
        FROM cohorts GROUP BY cohort_date ORDER BY cohort_date
      `),
      pool.query<{
        paidOrders: string;
        recordedPaidAmountMinorInr: string;
        missingLedger: string;
        amountMismatch: string;
        orphanLedger: string;
        missingProviderPaymentId: string;
      }>(`
        WITH razorpay_orders AS (
          SELECT * FROM payment_orders WHERE provider = 'razorpay'
        ), razorpay_ledger AS (
          SELECT * FROM ledger_transactions WHERE reference_id LIKE 'razorpay:%'
        )
        SELECT
          (SELECT count(*) FROM razorpay_orders WHERE status = 'paid')::text AS "paidOrders",
          (SELECT coalesce(sum(amount_minor), 0) FROM razorpay_orders WHERE status = 'paid' AND currency = 'INR')::text AS "recordedPaidAmountMinorInr",
          (SELECT count(*) FROM razorpay_orders WHERE status = 'paid' AND provider_payment_id IS NULL)::text AS "missingProviderPaymentId",
          (SELECT count(*) FROM razorpay_orders orders LEFT JOIN razorpay_ledger ledger
            ON ledger.reference_id = 'razorpay:' || orders.provider_order_id
            WHERE orders.status = 'paid' AND ledger.id IS NULL)::text AS "missingLedger",
          (SELECT count(*) FROM razorpay_orders orders JOIN razorpay_ledger ledger
            ON ledger.reference_id = 'razorpay:' || orders.provider_order_id
            WHERE orders.status = 'paid' AND
              (orders.amount_minor <> ledger.amount_minor OR orders.currency <> ledger.currency OR ledger.status <> 'completed'
                OR ledger.credit_account_id IS DISTINCT FROM orders.creator_id
                OR ledger.debit_account_id IS DISTINCT FROM orders.payer_id))::text AS "amountMismatch",
          (SELECT count(*) FROM razorpay_ledger ledger LEFT JOIN razorpay_orders orders
            ON ledger.reference_id = 'razorpay:' || orders.provider_order_id
            WHERE orders.id IS NULL OR orders.status <> 'paid')::text AS "orphanLedger"
      `),
    ]);
    const activationCounts = activation.rows[0];
    const reconciliationCounts = reconciliation.rows[0];
    const cohortRetention = retention.rows.map((row) => ({
      cohortDate: row.cohortDate,
      signups: Number(row.signups),
      day1Retained: Number(row.day1),
      day7Retained: Number(row.day7),
      day30Retained: Number(row.day30),
    }));
    const latestJobRecord = latestJob[0];
    return {
      dau: Number(dau[0]?.count ?? 0),
      wau: Number(wau[0]?.count ?? 0),
      mau: Number(mau[0]?.count ?? 0),
      newAccounts30d: Number(acquisition[0]?.count ?? 0),
      activation7d: {
        eligibleAccounts: Number(activationCounts?.eligible ?? 0),
        activatedAccounts: Number(activationCounts?.activated ?? 0),
      },
      retentionCohorts: cohortRetention,
      contentEngagement30d: {
        comments: Number(comments[0]?.count ?? 0),
        postLikes: Number(likes[0]?.count ?? 0),
        storyViews: Number(storyViews[0]?.count ?? 0),
        storyReactions: Number(storyReactions[0]?.count ?? 0),
        communityJoins: Number(communityJoins[0]?.count ?? 0),
        reelViews: Number(reelViews[0]?.count ?? 0),
      },
      financialReconciliation: {
        paidOrders: Number(reconciliationCounts?.paidOrders ?? 0),
        recordedPaidAmountMinorInr: Number(reconciliationCounts?.recordedPaidAmountMinorInr ?? 0),
        missingLedgerEntries: Number(reconciliationCounts?.missingLedger ?? 0),
        amountOrCurrencyMismatches: Number(reconciliationCounts?.amountMismatch ?? 0),
        orphanLedgerEntries: Number(reconciliationCounts?.orphanLedger ?? 0),
        missingProviderPaymentIds: Number(reconciliationCounts?.missingProviderPaymentId ?? 0),
      },
      latestRollup: latestRollup[0] ?? null,
      pipeline: latestJobRecord ? {
        ...latestJobRecord,
        fresh: latestJobRecord.status === "succeeded"
          && Date.parse(latestJobRecord.finishedAt ?? "") >= now.getTime() - 26 * 60 * 60_000,
      } : null,
    };
  }

  async pruneEvents(retentionDays = 90): Promise<number> {
    const cutoff = new Date(Date.now() - retentionDays * 86_400_000).toISOString();
    let totalDeleted = 0;
    while (true) {
      const result = await pool.query(`
        WITH expired AS (
          SELECT id FROM product_analytics_events
          WHERE occurred_at < $1
          ORDER BY occurred_at
          LIMIT 10000
        )
        DELETE FROM product_analytics_events events
        USING expired
        WHERE events.id = expired.id
        RETURNING events.id
      `, [cutoff]);
      totalDeleted += result.rowCount ?? 0;
      if (!result.rowCount || result.rowCount < 10_000) break;
    }
    return totalDeleted;
  }
}