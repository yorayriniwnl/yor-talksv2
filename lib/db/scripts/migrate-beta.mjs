import pg from "pg";
import path from "node:path";
import { fileURLToPath } from "node:url";

const { Client } = pg;
const connectionString = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/yor_talks";
const maintenanceWorkMem = process.env.DB_MAINTENANCE_WORK_MEM || "512MB";
const client = new Client({
  connectionString,
  ssl: process.env.DB_SSL === "true"
    ? { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== "false" }
    : undefined,
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

async function ensureGoogleSignInSchema() {
  console.log("[beta migration] Enabling Google sign-in account links...");
  await client.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS google_subject text");
  await client.query("CREATE UNIQUE INDEX IF NOT EXISTS users_google_subject_idx ON users (google_subject) WHERE google_subject IS NOT NULL");
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

async function ensureCreatorWorkspaceSchema() {
  console.log("[beta migration] Enabling creator workspace persistence...");
  await client.query(`
    CREATE TABLE IF NOT EXISTS creator_workspace_items (
      id uuid PRIMARY KEY,
      owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      kind text NOT NULL,
      item_key text NOT NULL,
      payload jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_at timestamptz NOT NULL DEFAULT NOW(),
      updated_at timestamptz NOT NULL DEFAULT NOW()
    )
  `);
  await client.query("CREATE INDEX IF NOT EXISTS creator_workspace_owner_kind_idx ON creator_workspace_items (owner_id, kind)");
  await client.query("CREATE UNIQUE INDEX IF NOT EXISTS creator_workspace_owner_kind_key_idx ON creator_workspace_items (owner_id, kind, item_key)");
}

async function ensureContentSafetySchema() {
  console.log("[beta migration] Enabling three-layer content safety...");
  for (const table of ["posts", "articles", "videos", "stories", "live_streams"]) {
    await client.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS content_rating text DEFAULT 'regular'`);
    await client.query(`UPDATE ${table} SET content_rating = 'regular' WHERE content_rating IS NULL OR btrim(content_rating) = ''`);
    await client.query(`ALTER TABLE ${table} ALTER COLUMN content_rating SET DEFAULT 'regular'`);
    await client.query(`ALTER TABLE ${table} ALTER COLUMN content_rating SET NOT NULL`);
  }
}

async function ensureContentCategorySchema() {
  console.log("[beta migration] Enabling required content categories...");
  // Normalize existing rows before tightening the column. This keeps the
  // three-layer category contract true for both legacy and new content.
  await client.query("ALTER TABLE posts ADD COLUMN IF NOT EXISTS content_category text DEFAULT 'other'");
  await client.query("UPDATE posts SET content_category = 'other' WHERE content_category IS NULL OR btrim(content_category) = ''");
  await client.query("ALTER TABLE posts ALTER COLUMN content_category SET DEFAULT 'other'");
  await client.query("ALTER TABLE posts ALTER COLUMN content_category SET NOT NULL");

  for (const table of ["articles", "videos", "stories"]) {
    await client.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS content_category text NOT NULL DEFAULT 'other'`);
    await client.query(`UPDATE ${table} SET content_category = 'other' WHERE content_category IS NULL OR btrim(content_category) = ''`);
  }
}

async function ensureCommentMediaSchema() {
  console.log("[beta migration] Enabling persistent comment attachments...");
  await client.query("ALTER TABLE comments ADD COLUMN IF NOT EXISTS media_url text");
  await client.query("ALTER TABLE comments ADD COLUMN IF NOT EXISTS media_type text");
  await client.query("ALTER TABLE comments ADD COLUMN IF NOT EXISTS media_duration integer");
}

async function ensureProfileInteractionSchema() {
  console.log("[beta migration] Enabling persisted profile comments and showcases...");
  await client.query(`
    CREATE TABLE IF NOT EXISTS profile_comments (
      id uuid PRIMARY KEY,
      profile_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      author_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT NOW(),
      updated_at timestamptz NOT NULL DEFAULT NOW()
    )
  `);
  await client.query("CREATE INDEX IF NOT EXISTS profile_comments_profile_idx ON profile_comments (profile_id, created_at)");
  await client.query("CREATE INDEX IF NOT EXISTS profile_comments_author_idx ON profile_comments (author_id)");
  await client.query(`
    CREATE TABLE IF NOT EXISTS profile_showcases (
      id uuid PRIMARY KEY,
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type text NOT NULL DEFAULT 'custom',
      title text NOT NULL,
      content_id uuid,
      custom_text text,
      custom_image_url text,
      created_at timestamptz NOT NULL DEFAULT NOW(),
      updated_at timestamptz NOT NULL DEFAULT NOW()
    )
  `);
  await client.query("CREATE INDEX IF NOT EXISTS profile_showcases_user_idx ON profile_showcases (user_id, created_at)");
}

async function ensureMarketplacePriceSchema() {
  console.log("[beta migration] Enabling two-decimal marketplace prices...");
  await client.query("ALTER TABLE products ALTER COLUMN price TYPE numeric(12, 2) USING price::numeric(12, 2)");
  await client.query("ALTER TABLE products ADD COLUMN IF NOT EXISTS availability text NOT NULL DEFAULT 'active'");
  await client.query("UPDATE products SET availability = 'active' WHERE availability IS NULL OR btrim(availability) = ''");
}

async function ensureMarketplaceOrderSchema() {
  console.log("[beta migration] Enabling verified marketplace orders...");
  await client.query(`
    CREATE TABLE IF NOT EXISTS marketplace_orders (
      id uuid PRIMARY KEY,
      product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
      buyer_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      seller_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      provider text NOT NULL DEFAULT 'razorpay',
      provider_order_id text NOT NULL UNIQUE,
      provider_payment_id text,
      provider_signature text,
      amount_minor integer NOT NULL,
      currency text NOT NULL DEFAULT 'INR',
      status text NOT NULL DEFAULT 'provider_pending',
      shipping_name text NOT NULL,
      shipping_address text NOT NULL,
      shipping_phone text,
      created_at timestamptz NOT NULL DEFAULT NOW(),
      paid_at timestamptz,
      fulfilled_at timestamptz
    )
  `);
  await client.query("CREATE INDEX IF NOT EXISTS marketplace_order_product_idx ON marketplace_orders (product_id)");
  await client.query("CREATE INDEX IF NOT EXISTS marketplace_order_buyer_idx ON marketplace_orders (buyer_id, created_at)");
  await client.query("CREATE INDEX IF NOT EXISTS marketplace_order_seller_idx ON marketplace_orders (seller_id, created_at)");
  await client.query("ALTER TABLE marketplace_orders ADD COLUMN IF NOT EXISTS reservation_expires_at timestamptz");
}

async function ensureSocialInteractionSchema() {
  console.log("[beta migration] Enabling durable reposts and post polls...");
  await client.query("ALTER TABLE posts ADD COLUMN IF NOT EXISTS repost_count integer NOT NULL DEFAULT 0");
  await client.query(`
    CREATE TABLE IF NOT EXISTS post_reposts (
      id uuid PRIMARY KEY,
      post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      note text,
      created_at timestamptz NOT NULL DEFAULT NOW()
    )
  `);
  await client.query("CREATE UNIQUE INDEX IF NOT EXISTS post_reposts_user_post_idx ON post_reposts (user_id, post_id)");
  await client.query("CREATE INDEX IF NOT EXISTS post_reposts_post_idx ON post_reposts (post_id, created_at)");
  await client.query("CREATE INDEX IF NOT EXISTS post_reposts_user_idx ON post_reposts (user_id, created_at)");

  await client.query(`
    CREATE TABLE IF NOT EXISTS post_polls (
      id uuid PRIMARY KEY,
      post_id uuid NOT NULL UNIQUE REFERENCES posts(id) ON DELETE CASCADE,
      question text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT NOW()
    )
  `);
  await client.query(`
    CREATE TABLE IF NOT EXISTS post_poll_options (
      id uuid PRIMARY KEY,
      poll_id uuid NOT NULL REFERENCES post_polls(id) ON DELETE CASCADE,
      text text NOT NULL,
      position integer NOT NULL,
      vote_count integer NOT NULL DEFAULT 0
    )
  `);
  await client.query("CREATE UNIQUE INDEX IF NOT EXISTS post_poll_options_poll_position_idx ON post_poll_options (poll_id, position)");
  await client.query("CREATE INDEX IF NOT EXISTS post_poll_options_poll_idx ON post_poll_options (poll_id)");
  await client.query(`
    CREATE TABLE IF NOT EXISTS post_poll_votes (
      poll_id uuid NOT NULL REFERENCES post_polls(id) ON DELETE CASCADE,
      option_id uuid NOT NULL REFERENCES post_poll_options(id) ON DELETE CASCADE,
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at timestamptz NOT NULL DEFAULT NOW(),
      PRIMARY KEY (poll_id, user_id)
    )
  `);
  await client.query("CREATE INDEX IF NOT EXISTS post_poll_votes_option_idx ON post_poll_votes (option_id)");
  await client.query("CREATE INDEX IF NOT EXISTS post_poll_votes_user_idx ON post_poll_votes (user_id)");
}

async function ensureFollowRequestSchema() {
  console.log("[beta migration] Enabling private-account follow requests...");
  await client.query(`
    CREATE TABLE IF NOT EXISTS follow_requests (
      id uuid PRIMARY KEY,
      requester_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      target_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status text NOT NULL DEFAULT 'pending',
      created_at timestamptz NOT NULL DEFAULT NOW(),
      updated_at timestamptz NOT NULL DEFAULT NOW()
    )
  `);
  await client.query("CREATE UNIQUE INDEX IF NOT EXISTS follow_requests_requester_target_idx ON follow_requests (requester_id, target_id)");
  await client.query("CREATE INDEX IF NOT EXISTS follow_requests_target_status_idx ON follow_requests (target_id, status, created_at)");
  await client.query("CREATE INDEX IF NOT EXISTS follow_requests_requester_status_idx ON follow_requests (requester_id, status)");
}

async function ensureFavoriteCreatorsSchema() {
  console.log("[beta migration] Enabling creator Favorites feed...");
  await client.query(`
    CREATE TABLE IF NOT EXISTS user_favorite_creators (
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      creator_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at timestamptz NOT NULL DEFAULT NOW(),
      PRIMARY KEY (user_id, creator_id)
    )
  `);
  await client.query("CREATE INDEX IF NOT EXISTS user_favorite_creators_creator_idx ON user_favorite_creators (creator_id)");
  await client.query("CREATE INDEX IF NOT EXISTS user_favorite_creators_user_idx ON user_favorite_creators (user_id, created_at)");
}

async function ensureUserNotesSchema() {
  console.log("[beta migration] Enabling ephemeral profile Notes...");
  await client.query(`
    CREATE TABLE IF NOT EXISTS user_notes (
      id uuid PRIMARY KEY,
      author_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content text NOT NULL,
      audience text NOT NULL DEFAULT 'followers',
      content_category text NOT NULL DEFAULT 'other',
      content_rating text NOT NULL DEFAULT 'regular',
      created_at timestamptz NOT NULL DEFAULT NOW(),
      expires_at timestamptz NOT NULL
    )
  `);
  await client.query("CREATE INDEX IF NOT EXISTS user_notes_author_idx ON user_notes (author_id, created_at)");
  await client.query("CREATE INDEX IF NOT EXISTS user_notes_expiry_idx ON user_notes (expires_at)");
  await client.query(`
    DELETE FROM user_notes older
    USING user_notes newer
    WHERE older.author_id = newer.author_id
      AND (older.created_at < newer.created_at OR (older.created_at = newer.created_at AND older.id < newer.id))
  `);
  await client.query("CREATE UNIQUE INDEX IF NOT EXISTS user_notes_author_unique_idx ON user_notes (author_id)");
  await client.query("DELETE FROM user_notes WHERE expires_at <= NOW()");
}

async function ensureDisappearingMessagesSchema() {
  console.log("[beta migration] Enabling read-triggered disappearing messages...");
  await client.query("ALTER TABLE conversations ADD COLUMN IF NOT EXISTS vanish_mode boolean NOT NULL DEFAULT false");
  await client.query("ALTER TABLE messages ADD COLUMN IF NOT EXISTS expires_at timestamptz");
  await client.query("CREATE INDEX IF NOT EXISTS messages_expiry_idx ON messages (expires_at)");
  await client.query("DELETE FROM messages WHERE expires_at IS NOT NULL AND expires_at <= NOW()");
}

async function ensureStoryInteractionSchema() {
  console.log("[beta migration] Enabling persistent story polls...");
  await client.query(`
    CREATE TABLE IF NOT EXISTS story_polls (
      id uuid PRIMARY KEY,
      story_id uuid NOT NULL UNIQUE REFERENCES stories(id) ON DELETE CASCADE,
      question text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT NOW()
    )
  `);
  await client.query(`
    CREATE TABLE IF NOT EXISTS story_poll_options (
      id uuid PRIMARY KEY,
      poll_id uuid NOT NULL REFERENCES story_polls(id) ON DELETE CASCADE,
      text text NOT NULL,
      position integer NOT NULL,
      vote_count integer NOT NULL DEFAULT 0
    )
  `);
  await client.query("CREATE UNIQUE INDEX IF NOT EXISTS story_poll_options_poll_position_idx ON story_poll_options (poll_id, position)");
  await client.query("CREATE INDEX IF NOT EXISTS story_poll_options_poll_idx ON story_poll_options (poll_id)");
  await client.query(`
    CREATE TABLE IF NOT EXISTS story_poll_votes (
      poll_id uuid NOT NULL REFERENCES story_polls(id) ON DELETE CASCADE,
      option_id uuid NOT NULL REFERENCES story_poll_options(id) ON DELETE CASCADE,
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at timestamptz NOT NULL DEFAULT NOW(),
      PRIMARY KEY (poll_id, user_id)
    )
  `);
  await client.query("CREATE INDEX IF NOT EXISTS story_poll_votes_option_idx ON story_poll_votes (option_id)");
}

async function ensureVideoInteractionSchema() {
  console.log("[beta migration] Enabling persistent Reel comments and bookmarks...");
  await client.query(`
    CREATE TABLE IF NOT EXISTS video_comments (
      id uuid PRIMARY KEY,
      video_id uuid NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
      author_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content text NOT NULL,
      media_url text,
      media_type text,
      media_duration integer,
      created_at timestamptz NOT NULL DEFAULT NOW(),
      updated_at timestamptz NOT NULL DEFAULT NOW(),
      liked_by jsonb NOT NULL DEFAULT '[]'::jsonb
    )
  `);
  await client.query("CREATE INDEX IF NOT EXISTS video_comment_video_idx ON video_comments (video_id, created_at)");
  await client.query("CREATE INDEX IF NOT EXISTS video_comment_author_idx ON video_comments (author_id)");
  await client.query(`
    CREATE TABLE IF NOT EXISTS video_bookmarks (
      video_id uuid NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at timestamptz NOT NULL DEFAULT NOW(),
      PRIMARY KEY (video_id, user_id)
    )
  `);
  await client.query("CREATE INDEX IF NOT EXISTS video_bookmark_user_idx ON video_bookmarks (user_id, created_at)");
  await client.query("CREATE INDEX IF NOT EXISTS video_bookmark_video_idx ON video_bookmarks (video_id)");
}

async function ensurePushSubscriptionSchema() {
  console.log("[beta migration] Enabling device push subscriptions...");
  await client.query(`
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id uuid PRIMARY KEY,
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      endpoint text NOT NULL,
      p256dh text NOT NULL,
      auth text NOT NULL,
      user_agent text,
      created_at timestamptz NOT NULL DEFAULT NOW(),
      last_used_at timestamptz
    )
  `);
  await client.query("CREATE UNIQUE INDEX IF NOT EXISTS push_subscriptions_user_endpoint_idx ON push_subscriptions (user_id, endpoint)");
  await client.query("CREATE INDEX IF NOT EXISTS push_subscriptions_user_idx ON push_subscriptions (user_id)");
}

async function ensureSubscriptionBillingSchema() {
  console.log("[beta migration] Enabling verified creator memberships...");
  await client.query(`
    CREATE TABLE IF NOT EXISTS subscription_orders (
      id uuid PRIMARY KEY,
      subscription_id uuid NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
      subscriber_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      creator_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      provider text NOT NULL DEFAULT 'razorpay',
      provider_order_id text NOT NULL UNIQUE,
      provider_payment_id text,
      provider_signature text,
      amount_minor integer NOT NULL,
      currency text NOT NULL DEFAULT 'INR',
      status text NOT NULL DEFAULT 'created',
      created_at timestamptz NOT NULL DEFAULT NOW(),
      paid_at timestamptz
    )
  `);
  await client.query("CREATE INDEX IF NOT EXISTS subscription_order_subscription_idx ON subscription_orders (subscription_id)");
  await client.query("CREATE INDEX IF NOT EXISTS subscription_order_subscriber_idx ON subscription_orders (subscriber_id)");
  await client.query("CREATE INDEX IF NOT EXISTS subscription_order_creator_idx ON subscription_orders (creator_id)");
}

async function ensureCreatorAnalyticsSchema() {
  console.log("[beta migration] Enabling creator analytics rollups and profile-view deduplication...");
  await client.query(`
    CREATE TABLE IF NOT EXISTS creator_profile_view_events (
      id uuid PRIMARY KEY,
      creator_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      viewer_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      view_date timestamptz NOT NULL,
      created_at timestamptz NOT NULL DEFAULT NOW()
    )
  `);
  await client.query("CREATE INDEX IF NOT EXISTS profile_view_creator_date_idx ON creator_profile_view_events (creator_id, view_date)");
  await client.query("CREATE UNIQUE INDEX IF NOT EXISTS profile_view_creator_viewer_day_idx ON creator_profile_view_events (creator_id, viewer_id, view_date)");
  // Older beta builds created analytics_creator_date_idx as a plain index.
  // Keep it intact and add a uniquely named constraint for safe upserts.
  await client.query("CREATE UNIQUE INDEX IF NOT EXISTS analytics_creator_date_unique_idx ON creator_analytics_daily (creator_id, date)");
}

async function ensureLedgerReferenceSchema() {
  console.log("[beta migration] Enabling idempotent ledger settlement...");
  await client.query(`
    CREATE TABLE IF NOT EXISTS ledger_transactions (
      id uuid PRIMARY KEY,
      credit_account_id uuid REFERENCES users(id),
      debit_account_id uuid REFERENCES users(id),
      amount_minor integer NOT NULL,
      currency text NOT NULL DEFAULT 'INR',
      reference_id text NOT NULL,
      status text NOT NULL DEFAULT 'completed',
      created_at timestamptz NOT NULL DEFAULT NOW()
    )
  `);
  await client.query("CREATE INDEX IF NOT EXISTS ledger_ref_idx ON ledger_transactions (reference_id)");
  const duplicates = await client.query(`
    SELECT reference_id
    FROM ledger_transactions
    GROUP BY reference_id
    HAVING COUNT(*) > 1
    LIMIT 1
  `);
  if (duplicates.rowCount) {
    throw new Error(`[beta migration] Duplicate ledger reference detected (${duplicates.rows[0].reference_id}); reconcile it before enabling unique settlement protection.`);
  }
  await client.query("CREATE UNIQUE INDEX IF NOT EXISTS ledger_ref_unique_idx ON ledger_transactions (reference_id)");
}

export async function migrate() {
  await client.connect();
  let lockHeld = false;

  try {
    await client.query("SET statement_timeout = 0");
    await client.query("SET lock_timeout = '5s'");
    await client.query("SELECT set_config('maintenance_work_mem', $1, false)", [maintenanceWorkMem]);
    await client.query("SELECT pg_advisory_lock(hashtext('yor_beta_search_index'))");
    lockHeld = true;

    await ensureContactShieldSchema();
    await ensureGoogleSignInSchema();
    await ensureGrievanceSchema();
    await ensureCreatorWorkspaceSchema();
    await ensureContentCategorySchema();
    await ensureContentSafetySchema();
    await ensureCommentMediaSchema();
    await ensureProfileInteractionSchema();
    await ensureMarketplacePriceSchema();
    await ensureMarketplaceOrderSchema();
    await ensureSocialInteractionSchema();
    await ensureFollowRequestSchema();
    await ensureFavoriteCreatorsSchema();
    await ensureUserNotesSchema();
    await ensureDisappearingMessagesSchema();
    await ensureStoryInteractionSchema();
    await ensureVideoInteractionSchema();
    await ensurePushSubscriptionSchema();
    await ensureSubscriptionBillingSchema();
    await ensureCreatorAnalyticsSchema();
    await ensureLedgerReferenceSchema();

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

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  migrate().catch((error) => {
    console.error("[beta migration] Failed:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
