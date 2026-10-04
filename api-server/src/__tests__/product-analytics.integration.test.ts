import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, test } from "node:test";
import { pool } from "@workspace/db";
import { UserRepository } from "../repositories/user-repository.js";
import { ProductAnalyticsService, type ProductEvent } from "../services/product-analytics-service.js";
import { createTestUser } from "./test-helpers.js";

const service = new ProductAnalyticsService();
const eventIds: string[] = [];
const testUserIds: string[] = [];
const paymentOrderIds: string[] = [];
const ledgerIds: string[] = [];
const rollupDay = new Date();
rollupDay.setUTCHours(0, 0, 0, 0);
rollupDay.setUTCDate(rollupDay.getUTCDate() - 2);
const dayEnd = new Date(rollupDay);
dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

function navigationEvent(occurredAt: Date): ProductEvent {
  const event: ProductEvent = {
    eventId: randomUUID(),
    schemaVersion: 1,
    eventName: "navigation",
    occurredAt: occurredAt.toISOString(),
    properties: {},
  };
  eventIds.push(event.eventId);
  return event;
}

after(async () => {
  try {
    await pool.query("DROP TRIGGER IF EXISTS analytics_integration_failure ON product_analytics_daily");
    await pool.query("DROP FUNCTION IF EXISTS analytics_integration_failure_fn()");
    await pool.query("DROP TRIGGER IF EXISTS analytics_integration_corruption ON product_analytics_daily");
    await pool.query("DROP FUNCTION IF EXISTS analytics_integration_corruption_fn()");
    if (eventIds.length) {
      await pool.query("DELETE FROM product_analytics_events WHERE id = ANY($1::uuid[])", [eventIds]);
      await service.rollupDay(rollupDay);
    }
    if (testUserIds.length) {
      await pool.query("DELETE FROM ledger_transactions WHERE id = ANY($1::uuid[])", [ledgerIds]);
      await pool.query("DELETE FROM payment_orders WHERE id = ANY($1::uuid[])", [paymentOrderIds]);
      await pool.query("DELETE FROM users WHERE id = ANY($1::uuid[])", [testUserIds]);
    }
  } finally {
    await pool.end();
  }
});

test("analytics migration creates durable event, daily, and job-run tables", async () => {
  const result = await pool.query<{ name: string; exists: string | null }>(`
    SELECT name, to_regclass('public.' || name)::text AS exists
    FROM unnest(ARRAY[
      'product_analytics_events',
      'product_analytics_daily',
      'product_analytics_job_runs'
    ]) AS tables(name)
  `);
  assert.equal(result.rows.length, 3);
  assert.ok(result.rows.every((row) => row.exists));
});

test("ingestion deduplicates delivery and rollups respect UTC day boundaries", async () => {
  const user = await createTestUser(new UserRepository());
  testUserIds.push(user.id);
  const first = navigationEvent(rollupDay);
  const lastInside = navigationEvent(new Date(dayEnd.getTime() - 1));
  const firstNextDay = navigationEvent(dayEnd);

  assert.equal(await service.ingest(user.id, [first, lastInside]), 2);
  assert.equal(await service.ingest(user.id, [first]), 0);
  assert.equal(await service.ingest(user.id, [firstNextDay]), 1);

  await service.rollupDay(rollupDay);
  const result = await pool.query<{ event_count: string; unique_users: string }>(
    "SELECT event_count, unique_users FROM product_analytics_daily WHERE date = $1::timestamptz AND event_name = 'navigation'",
    [rollupDay.toISOString()],
  );
  assert.equal(Number(result.rows[0]?.event_count), 2);
  assert.equal(Number(result.rows[0]?.unique_users), 1);
});

test("concurrent repeated rollups are idempotent and source KPI queries execute", async () => {
  const user = await createTestUser(new UserRepository());
  testUserIds.push(user.id);
  const event = navigationEvent(new Date(rollupDay.getTime() + 12 * 60 * 60_000));
  assert.equal(await service.ingest(user.id, [event]), 1);

  await Promise.all(Array.from({ length: 4 }, () => service.rollupDay(rollupDay)));
  const result = await pool.query<{ event_count: string; unique_users: string }>(
    "SELECT event_count, unique_users FROM product_analytics_daily WHERE date = $1::timestamptz AND event_name = 'navigation'",
    [rollupDay.toISOString()],
  );
  assert.equal(Number(result.rows[0]?.event_count), 3);
  assert.equal(Number(result.rows[0]?.unique_users), 2);

  const overview = await service.getOverview();
  assert.ok(Number.isInteger(overview.dau));
  assert.ok(Number.isInteger(overview.contentEngagement30d.storyViews));
  assert.ok(Number.isInteger(overview.financialReconciliation.missingLedgerEntries));
  assert.ok(Array.isArray(overview.retentionCohorts));
});

test("source KPIs calculate activation, cohort retention, engagement, and ledger reconciliation", async () => {
  const before = await service.getOverview();
  const now = new Date();
  const activationSignupAt = new Date(now.getTime() - 14 * 86_400_000);
  const activationUser = await createTestUser(new UserRepository(), { createdAt: activationSignupAt.toISOString() });
  const dormantUser = await createTestUser(new UserRepository(), { createdAt: activationSignupAt.toISOString() });
  const retentionSignup = new Date(now.getTime() - 60 * 86_400_000);
  const retentionUser = await createTestUser(new UserRepository(), { createdAt: retentionSignup.toISOString() });
  testUserIds.push(activationUser.id, dormantUser.id, retentionUser.id);

  const postId = randomUUID();
  await pool.query("INSERT INTO posts (id, author_id, content, created_at) VALUES ($1, $2, 'integration fixture', $3)", [
    postId,
    activationUser.id,
    new Date(activationSignupAt.getTime() + 2 * 86_400_000).toISOString(),
  ]);
  // Test engagement within the period, independently of subsecond database /
  // application clock skew at the overview's exclusive upper boundary.
  const engagementAt = new Date(now.getTime() - 60_000).toISOString();
  await pool.query("INSERT INTO post_likes (post_id, user_id, created_at) VALUES ($1, $2, $3)", [postId, dormantUser.id, engagementAt]);
  await pool.query("INSERT INTO comments (id, post_id, author_id, content, created_at) VALUES ($1, $2, $3, 'integration fixture', $4)", [randomUUID(), postId, dormantUser.id, engagementAt]);

  const storyId = randomUUID();
  await pool.query("INSERT INTO stories (id, author_id, media_url, type, expires_at) VALUES ($1, $2, 'https://example.test/story.jpg', 'image', $3)", [
    storyId,
    activationUser.id,
    new Date(now.getTime() + 86_400_000).toISOString(),
  ]);
  await pool.query("INSERT INTO story_views (story_id, user_id, viewed_at) VALUES ($1, $2, $3)", [storyId, dormantUser.id, engagementAt]);
  await pool.query("INSERT INTO story_reactions (story_id, user_id, emoji, created_at) VALUES ($1, $2, 'heart', $3)", [storyId, dormantUser.id, engagementAt]);

  const communityId = randomUUID();
  await pool.query("INSERT INTO communities (id, name, slug, owner_id) VALUES ($1, 'Analytics fixture', $2, $3)", [communityId, `analytics-${communityId}`, activationUser.id]);
  await pool.query("INSERT INTO community_members (community_id, user_id, created_at) VALUES ($1, $2, $3)", [communityId, dormantUser.id, engagementAt]);

  const cohortDate = new Date(Date.UTC(retentionSignup.getUTCFullYear(), retentionSignup.getUTCMonth(), retentionSignup.getUTCDate()));
  for (const dayOffset of [1, 7, 30]) {
    const occurredAt = new Date(cohortDate);
    occurredAt.setUTCDate(occurredAt.getUTCDate() + dayOffset);
    occurredAt.setUTCHours(12, 0, 0, 0);
    const eventId = randomUUID();
    eventIds.push(eventId);
    await service.ingest(retentionUser.id, [{
      eventId,
      schemaVersion: 1,
      eventName: "navigation",
      occurredAt: occurredAt.toISOString(),
      properties: {},
    }]);
  }

  const payerId = activationUser.id;
  const creatorId = dormantUser.id;
  const orders = [
    { key: "match", amount: 500, paid: true },
    { key: "missing", amount: 1000, paid: true },
    { key: "mismatch", amount: 750, paid: true },
    { key: "not-paid", amount: 900, paid: false },
  ];
  for (const order of orders) {
    const orderId = randomUUID();
    const providerOrderId = `analytics-${order.key}-${randomUUID()}`;
    paymentOrderIds.push(orderId);
    await pool.query(`
      INSERT INTO payment_orders (id, payer_id, creator_id, provider, provider_order_id, amount_minor, currency, status)
      VALUES ($1, $2, $3, 'razorpay', $4, $5, 'INR', $6)
    `, [orderId, payerId, creatorId, providerOrderId, order.amount, order.paid ? "paid" : "created"]);
    if (order.key === "match" || order.key === "mismatch" || order.key === "not-paid") {
      const ledgerId = randomUUID();
      ledgerIds.push(ledgerId);
      await pool.query(`
        INSERT INTO ledger_transactions (id, credit_account_id, debit_account_id, amount_minor, currency, reference_id, status)
        VALUES ($1, $2, $3, $4, 'INR', $5, 'completed')
      `, [ledgerId, creatorId, payerId, order.key === "mismatch" ? 700 : order.amount, `razorpay:${providerOrderId}`]);
    }
  }
  const orphanLedgerId = randomUUID();
  ledgerIds.push(orphanLedgerId);
  await pool.query(`
    INSERT INTO ledger_transactions (id, credit_account_id, debit_account_id, amount_minor, currency, reference_id, status)
    VALUES ($1, $2, $3, 100, 'INR', $4, 'completed')
  `, [orphanLedgerId, creatorId, payerId, `razorpay:orphan-${randomUUID()}`]);

  const after = await service.getOverview();
  assert.equal(after.activation7d.eligibleAccounts - before.activation7d.eligibleAccounts, 2);
  assert.equal(after.activation7d.activatedAccounts - before.activation7d.activatedAccounts, 1);
  assert.equal(after.contentEngagement30d.comments - before.contentEngagement30d.comments, 1);
  assert.equal(after.contentEngagement30d.postLikes - before.contentEngagement30d.postLikes, 1);
  assert.equal(after.contentEngagement30d.storyViews - before.contentEngagement30d.storyViews, 1);
  assert.equal(after.contentEngagement30d.storyReactions - before.contentEngagement30d.storyReactions, 1);
  assert.equal(after.contentEngagement30d.communityJoins - before.contentEngagement30d.communityJoins, 1);
  assert.equal(after.financialReconciliation.paidOrders - before.financialReconciliation.paidOrders, 3);
  assert.equal(after.financialReconciliation.recordedPaidAmountMinorInr - before.financialReconciliation.recordedPaidAmountMinorInr, 2250);
  assert.equal(after.financialReconciliation.missingLedgerEntries - before.financialReconciliation.missingLedgerEntries, 1);
  assert.equal(after.financialReconciliation.amountOrCurrencyMismatches - before.financialReconciliation.amountOrCurrencyMismatches, 1);
  assert.equal(after.financialReconciliation.orphanLedgerEntries - before.financialReconciliation.orphanLedgerEntries, 2);
  assert.equal(after.financialReconciliation.missingProviderPaymentIds - before.financialReconciliation.missingProviderPaymentIds, 3);
  const cohort = after.retentionCohorts.find((row) => row.cohortDate === cohortDate.toISOString().slice(0, 10));
  assert.ok(cohort);
  assert.equal(cohort!.signups, 1);
  assert.equal(cohort!.day1Retained, 1);
  assert.equal(cohort!.day7Retained, 1);
  assert.equal(cohort!.day30Retained, 1);
});

test("failed rollup state is durable and a later retry succeeds", async () => {
  await pool.query(`
    CREATE OR REPLACE FUNCTION analytics_integration_failure_fn() RETURNS trigger AS $$
    BEGIN
      RAISE EXCEPTION 'analytics_integration_trigger';
    END;
    $$ LANGUAGE plpgsql
  `);
  await pool.query(`
    CREATE TRIGGER analytics_integration_failure
    BEFORE INSERT ON product_analytics_daily
    FOR EACH ROW EXECUTE FUNCTION analytics_integration_failure_fn()
  `);

  await assert.rejects(service.runDailyRollup(rollupDay), (error: Error & { cause?: unknown }) => {
    assert.match(String(error.cause), /analytics_integration_trigger/);
    return true;
  });
  await pool.query("DROP TRIGGER analytics_integration_failure ON product_analytics_daily");
  await pool.query("DROP FUNCTION analytics_integration_failure_fn()");
  const failed = await pool.query<{ status: string; error_code: string }>(`
    SELECT status, error_code FROM product_analytics_job_runs
    WHERE job_name = 'product-analytics-daily-rollup'
    ORDER BY started_at DESC LIMIT 1
  `);
  assert.equal(failed.rows[0]?.status, "failed");
  assert.equal(failed.rows[0]?.error_code, "analytics_rollup_failed");

  await service.runDailyRollup(rollupDay);
  const recovered = await pool.query<{ status: string; finished_at: Date | null }>(`
    SELECT status, finished_at FROM product_analytics_job_runs
    WHERE job_name = 'product-analytics-daily-rollup'
    ORDER BY started_at DESC LIMIT 1
  `);
  assert.equal(recovered.rows[0]?.status, "succeeded");
  assert.ok(recovered.rows[0]?.finished_at);
});

test("rollup quality mismatches persist an alertable failure and clean retry recovers", async () => {
  await pool.query(`
    CREATE OR REPLACE FUNCTION analytics_integration_corruption_fn() RETURNS trigger AS $$
    BEGIN
      IF NEW.event_name = 'navigation' THEN
        UPDATE product_analytics_daily SET event_count = event_count + 1
        WHERE date = NEW.date AND event_name = NEW.event_name;
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
  `);
  await pool.query(`
    CREATE TRIGGER analytics_integration_corruption
    AFTER INSERT ON product_analytics_daily
    FOR EACH ROW EXECUTE FUNCTION analytics_integration_corruption_fn()
  `);

  await assert.rejects(service.runDailyRollup(rollupDay), /AnalyticsRollupQualityError/);
  await pool.query("DROP TRIGGER analytics_integration_corruption ON product_analytics_daily");
  await pool.query("DROP FUNCTION analytics_integration_corruption_fn()");
  const failed = (await pool.query<{ status: string; error_code: string }>(`
    SELECT status, error_code FROM product_analytics_job_runs
    WHERE job_name = 'product-analytics-daily-rollup'
    ORDER BY started_at DESC LIMIT 1
  `)).rows[0];
  assert.equal(failed.status, "failed");
  assert.equal(failed.error_code, "analytics_rollup_mismatch");

  await service.runDailyRollup(rollupDay);
  const recovered = (await pool.query<{ status: string }>(`
    SELECT status FROM product_analytics_job_runs
    WHERE job_name = 'product-analytics-daily-rollup'
    ORDER BY started_at DESC LIMIT 1
  `)).rows[0];
  assert.equal(recovered.status, "succeeded");
});
