import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, test, type TestContext } from "node:test";
import { pool } from "@workspace/db";
import { FeatureEntitlementService } from "../services/feature-entitlement-service.js";

after(() => pool.end());

async function fixture(t: TestContext, storage: "timestamp" | "timestamptz", zone: string) {
  const client = await pool.connect();
  const query = client.query.bind(client);
  let restoreQuery = () => {};
  t.after(async () => {
    restoreQuery();
    try { await query("DISCARD TEMP"); await query("RESET TimeZone"); }
    finally { client.release(); }
  });
  await query("SELECT set_config('TimeZone',$1,false)", [zone]);
  // Private TEMP shadows exercise the real entitlement query without changing
  // public schemas, accounts, existing orders or the caller's connection pool.
  await query(`CREATE TEMP TABLE user_feature_overrides (
    user_id uuid, feature_key text, enabled boolean, status text, expires_at ${storage}
  )`);
  await query("CREATE TEMP TABLE premium_orders (id uuid, status text, plan_snapshot jsonb)");
  await query(`CREATE TEMP TABLE premium_access (
    order_id uuid, user_id uuid, status text, starts_at timestamptz, ends_at timestamptz
  )`);
  const mock = t.mock.method(pool, "query", query);
  restoreQuery = () => mock.mock.restore();
  const userId = randomUUID(), orderId = randomUUID();
  await query("INSERT INTO premium_orders VALUES($1,'paid',$2)", [orderId, JSON.stringify({ features: ["MESSAGE_FONT"] })]);
  await query(`INSERT INTO premium_access VALUES($1,$2,'active',
    clock_timestamp()-interval '1 hour',clock_timestamp()+interval '1 hour')`, [orderId, userId]);
  const writeOverride = async (enabled: boolean, expiresAt: string | null) => {
    await query("DELETE FROM user_feature_overrides");
    await query("INSERT INTO user_feature_overrides VALUES($1,'MESSAGE_FONT',$2,'active',$3)", [userId, enabled, expiresAt]);
  };
  const service = new FeatureEntitlementService(undefined, { MESSAGE_FONT: true });
  return { query, userId, writeOverride, service };
}

for (const storage of ["timestamp", "timestamptz"] as const) {
  for (const zone of ["UTC", "Asia/Calcutta", "America/New_York"]) {
    test(`active feature denial overrides paid access with ${storage} in ${zone}`, async t => {
      const f = await fixture(t, storage, zone);
      const future = new Date(Date.now() + 3_600_000).toISOString();
      const past = new Date(Date.now() - 3_600_000).toISOString();
      assert.equal(await f.service.hasFeature(f.userId, "MESSAGE_FONT"), true, "the synthetic paid grant must be usable before a denial");
      await f.writeOverride(false, future);
      assert.equal(await f.service.hasFeature(f.userId, "MESSAGE_FONT"), false, "a future denial must suppress the paid grant");
      await f.writeOverride(false, past);
      assert.equal(await f.service.hasFeature(f.userId, "MESSAGE_FONT"), true, "an expired denial must permit the current paid grant");
      await f.writeOverride(false, null);
      assert.equal(await f.service.hasFeature(f.userId, "MESSAGE_FONT"), false, "an indefinite administrative denial remains effective");
      await f.query("DELETE FROM premium_access");
      await f.writeOverride(true, future);
      assert.equal(await f.service.hasFeature(f.userId, "MESSAGE_FONT"), true, "a future temporary override grants only an available feature");
      assert.equal(await new FeatureEntitlementService(undefined, { MESSAGE_FONT: false }).hasFeature(f.userId, "MESSAGE_FONT"), false);
      await f.writeOverride(true, past);
      assert.equal(await f.service.hasFeature(f.userId, "MESSAGE_FONT"), false, "an expired positive override cannot grant access");
      await f.writeOverride(true, null);
      assert.equal(await f.service.hasFeature(f.userId, "MESSAGE_FONT"), false, "positive overrides must have an expiry");
      assert.equal((await f.query("SHOW TimeZone")).rows[0].TimeZone, zone, "the entitlement query must preserve the caller's timezone");
    });
  }
}
