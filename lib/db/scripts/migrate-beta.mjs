import pg from "pg";

const { Client } = pg;
const connectionString = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/yor_talks";
const client = new Client({
  connectionString,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined,
});

const INDEX_NAME = "post_content_trgm_idx";

async function migrate() {
  await client.connect();
  let lockHeld = false;

  try {
    await client.query("SET statement_timeout = 0");
    await client.query("SET lock_timeout = '5s'");
    await client.query("SELECT pg_advisory_lock(hashtext('yor_beta_search_index'))");
    lockHeld = true;

    console.log("[beta migration] Enabling indexed post search...");
    await client.query("CREATE EXTENSION IF NOT EXISTS pg_trgm");

    const existing = await client.query(
      "SELECT indisvalid FROM pg_index WHERE indexrelid = to_regclass('public.post_content_trgm_idx')",
    );

    if (existing.rows[0]?.indisvalid === false) {
      console.log("[beta migration] Removing an incomplete search index...");
      await client.query(`DROP INDEX CONCURRENTLY IF EXISTS ${INDEX_NAME}`);
    }

    await client.query(
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS ${INDEX_NAME} ON posts USING gin (content gin_trgm_ops)`,
    );
    console.log("[beta migration] Search index is ready.");
  } finally {
    if (lockHeld) {
      await client.query("SELECT pg_advisory_unlock(hashtext('yor_beta_search_index'))");
    }
    await client.end();
  }
}

migrate().catch((error) => {
  console.error("[beta migration] Failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
