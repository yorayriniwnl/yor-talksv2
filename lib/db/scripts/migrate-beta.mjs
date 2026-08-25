import pg from "pg";

const { Client } = pg;
const connectionString = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/yor_talks";
const maintenanceWorkMem = process.env.DB_MAINTENANCE_WORK_MEM || "512MB";
const client = new Client({
  connectionString,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined,
});

const INDEX_NAME = "post_content_trgm_idx";
const CONTACT_SHIELD_SECRET = process.env.CONTACT_SHIELD_SECRET || "contact-shield-development-secret-change-me";

async function ensureContactShieldSchema() {
  console.log("[beta migration] Enabling IRL Shield contact privacy...");
  await client.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS contact_identity_digest text");
  await client.query("CREATE INDEX IF NOT EXISTS users_contact_identity_digest_idx ON users (contact_identity_digest)");
  await client.query(`
    CREATE TABLE IF NOT EXISTS contact_shields (
      id uuid PRIMARY KEY,
      owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      identifier_type text NOT NULL,
      identifier_digest text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT NOW()
    )
  `);
  await client.query("CREATE INDEX IF NOT EXISTS contact_shields_owner_idx ON contact_shields (owner_id)");
  await client.query("CREATE INDEX IF NOT EXISTS contact_shields_digest_idx ON contact_shields (identifier_type, identifier_digest)");
  await client.query("CREATE UNIQUE INDEX IF NOT EXISTS contact_shields_owner_identifier_idx ON contact_shields (owner_id, identifier_type, identifier_digest)");

  await client.query("CREATE EXTENSION IF NOT EXISTS pgcrypto");
  const backfill = await client.query(
    "UPDATE users SET contact_identity_digest = encode(hmac('email:' || lower(trim(email)), $1, 'sha256'), 'hex') WHERE contact_identity_digest IS NULL OR contact_identity_digest = ''",
    [CONTACT_SHIELD_SECRET],
  );
  console.log(`[beta migration] Backfilled ${backfill.rowCount ?? 0} user contact identities.`);
}

async function ensureGrievanceSchema() {
  console.log("[beta migration] Enabling persistent grievance intake...");
  await client.query(`
    CREATE TABLE IF NOT EXISTS grievance_tickets (
      id uuid PRIMARY KEY,
      ticket_id text NOT NULL UNIQUE,
      category text NOT NULL,
      reported_url text NOT NULL,
      reporter_name text NOT NULL,
      reporter_email text NOT NULL,
      description text NOT NULL,
      status text NOT NULL DEFAULT 'received',
      sla_deadline timestamptz NOT NULL,
      officer_note text,
      created_at timestamptz NOT NULL DEFAULT NOW(),
      updated_at timestamptz NOT NULL DEFAULT NOW()
    )
  `);
  await client.query("CREATE INDEX IF NOT EXISTS grievance_ticket_idx ON grievance_tickets (ticket_id)");
  await client.query("CREATE INDEX IF NOT EXISTS grievance_status_idx ON grievance_tickets (status, created_at)");
}

async function ensureContentSafetySchema() {
  console.log("[beta migration] Enabling three-layer content safety...");
  for (const table of ["posts", "articles", "videos", "stories", "live_streams"]) {
    await client.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS content_rating text NOT NULL DEFAULT 'regular'`);
    await client.query(`UPDATE ${table} SET content_rating = 'regular' WHERE content_rating IS NULL OR content_rating NOT IN ('child_safe', 'regular', 'mature')`);
  }
}

async function migrate() {
  await client.connect();
  let lockHeld = false;

  try {
    await client.query("SET statement_timeout = 0");
    await client.query("SET lock_timeout = '5s'");
    await client.query("SELECT set_config('maintenance_work_mem', $1, false)", [maintenanceWorkMem]);
    await client.query("SELECT pg_advisory_lock(hashtext('yor_beta_search_index'))");
    lockHeld = true;

    await ensureContactShieldSchema();
    await ensureGrievanceSchema();
    await ensureContentSafetySchema();

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
