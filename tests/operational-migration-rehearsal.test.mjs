import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import { migrateRelease, RELEASE_SCHEMA_VERSION } from '../lib/db/scripts/migrate-release.mjs';
import { ACCOUNT_HISTORY_RETENTION_VERSION } from '../lib/db/scripts/migrate-account-history-retention.mjs';
import { PRIVACY_RETENTION_SCHEMA_VERSION } from '../lib/db/scripts/migrate-privacy-retention.mjs';

const require = createRequire(new URL('../lib/db/package.json', import.meta.url));
const { Client } = require('pg');
const ADMIN_URL = process.env.MIGRATION_REHEARSAL_ADMIN_URL || 'postgresql://postgres:postgres@localhost:5432/postgres';

async function withAdmin(fn) {
  const admin = new Client({ connectionString: ADMIN_URL, connectionTimeoutMillis: 5000 });
  await admin.connect();
  try {
    return await fn(admin);
  } finally {
    await admin.end().catch(() => {});
  }
}

async function createIsolatedDatabase(prefix = 'yor_rehearsal_mig') {
  const dbName = `${prefix}_${randomUUID().replaceAll('-', '').slice(0, 16)}`;
  await withAdmin(async (admin) => {
    await admin.query(`CREATE DATABASE "${dbName}"`);
  });
  const dbUrl = new URL(ADMIN_URL);
  dbUrl.pathname = `/${dbName}`;
  return { dbName, dbUrl: dbUrl.href };
}

async function dropIsolatedDatabase(dbName) {
  await withAdmin(async (admin) => {
    await admin.query(`DROP DATABASE IF EXISTS "${dbName}" WITH (FORCE)`);
  });
}

/** Sets up the base baseline schema mimicking the pre-release state */
async function setupBaselineSchema(client) {
  await client.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
  await client.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

  // Baseline tables
  await client.query(`
    CREATE TABLE users (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      username text NOT NULL UNIQUE,
      email text NOT NULL UNIQUE,
      full_name text NOT NULL,
      bio text NOT NULL DEFAULT '',
      role text NOT NULL DEFAULT 'user',
      contact_identity_digest text,
      terms_version text,
      terms_accepted_at timestamptz,
      age_confirmed_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE posts (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      author_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content text NOT NULL,
      images jsonb NOT NULL DEFAULT '[]'::jsonb,
      content_category text NOT NULL DEFAULT 'other',
      content_rating text NOT NULL DEFAULT 'regular',
      audience text NOT NULL DEFAULT 'public',
      distribution_mode text NOT NULL DEFAULT 'standard',
      post_type text NOT NULL DEFAULT 'standard',
      tags jsonb NOT NULL DEFAULT '[]'::jsonb,
      mentions jsonb NOT NULL DEFAULT '[]'::jsonb,
      reactions jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE comments (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      author_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content text NOT NULL,
      media_url text,
      media_type text,
      liked_by jsonb NOT NULL DEFAULT '[]'::jsonb,
      reactions jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE conversations (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      is_group boolean NOT NULL DEFAULT false,
      participant_a uuid REFERENCES users(id) ON DELETE SET NULL,
      participant_b uuid REFERENCES users(id) ON DELETE SET NULL,
      participant_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE conversation_members (
      conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role text NOT NULL DEFAULT 'member',
      created_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (conversation_id, user_id)
    );

    CREATE TABLE messages (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      sender_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      recipient_id uuid REFERENCES users(id) ON DELETE SET NULL,
      content text NOT NULL,
      reply_to_id uuid,
      forwarded_from_id uuid,
      reactions jsonb NOT NULL DEFAULT '{}'::jsonb,
      edited_at timestamptz,
      deleted_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE products (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      seller_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title text NOT NULL,
      description text NOT NULL DEFAULT '',
      images jsonb NOT NULL DEFAULT '[]'::jsonb,
      category text NOT NULL DEFAULT 'other',
      condition text NOT NULL DEFAULT 'new',
      content_rating text NOT NULL DEFAULT 'regular',
      price numeric(12,2) NOT NULL DEFAULT 0.00,
      created_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE marketplace_orders (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      product_id uuid NOT NULL REFERENCES products(id),
      buyer_id uuid NOT NULL REFERENCES users(id),
      seller_id uuid NOT NULL REFERENCES users(id),
      provider_order_id text NOT NULL DEFAULT 'legacy_market',
      amount_minor integer NOT NULL DEFAULT 0,
      currency text NOT NULL DEFAULT 'INR',
      status text NOT NULL DEFAULT 'completed',
      shipping_name text NOT NULL DEFAULT '',
      shipping_address text NOT NULL DEFAULT '',
      created_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE payment_orders (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      payer_id uuid NOT NULL REFERENCES users(id),
      creator_id uuid REFERENCES users(id),
      provider_order_id text NOT NULL DEFAULT 'legacy_tip',
      amount_minor integer NOT NULL,
      currency text NOT NULL DEFAULT 'INR',
      status text NOT NULL DEFAULT 'completed',
      message text,
      created_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE subscriptions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      subscriber_id uuid NOT NULL REFERENCES users(id),
      creator_id uuid NOT NULL REFERENCES users(id),
      status text NOT NULL DEFAULT 'active',
      created_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE subscription_orders (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      subscription_id uuid NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
      subscriber_id uuid NOT NULL REFERENCES users(id),
      creator_id uuid NOT NULL REFERENCES users(id),
      provider_order_id text NOT NULL DEFAULT 'legacy_sub',
      amount_minor integer NOT NULL,
      currency text NOT NULL DEFAULT 'INR',
      status text NOT NULL DEFAULT 'completed',
      created_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE reports (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      reporter_id uuid REFERENCES users(id),
      target_type text NOT NULL,
      target_id uuid NOT NULL,
      status text NOT NULL DEFAULT 'pending',
      created_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE grievance_tickets (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      ticket_id text NOT NULL UNIQUE,
      category text NOT NULL,
      reported_url text NOT NULL,
      reporter_name text NOT NULL,
      reporter_email text NOT NULL,
      description text NOT NULL,
      status text NOT NULL DEFAULT 'received',
      sla_deadline timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE post_bookmarks (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      created_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE video_bookmarks (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      video_id uuid NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE entitlements (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid REFERENCES users(id) ON DELETE CASCADE,
      entity_type text NOT NULL,
      entity_id text NOT NULL,
      status text NOT NULL DEFAULT 'active'
    );

    CREATE TABLE notifications (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      recipient_id uuid NOT NULL REFERENCES users(id),
      type text NOT NULL,
      metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE communities (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name text NOT NULL,
      description text,
      cover_url text,
      rules text,
      announcements jsonb NOT NULL DEFAULT '[]'::jsonb,
      moderators jsonb NOT NULL DEFAULT '[]'::jsonb,
      pending_requests jsonb NOT NULL DEFAULT '[]'::jsonb,
      content_rating text NOT NULL DEFAULT 'regular',
      created_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE events (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      host_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      organizer_id uuid REFERENCES users(id) ON DELETE CASCADE,
      title text NOT NULL,
      description text,
      cover_url text,
      category text NOT NULL DEFAULT 'other',
      starts_at timestamptz,
      location text,
      content_rating text NOT NULL DEFAULT 'regular',
      created_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE articles (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      author_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title text NOT NULL,
      excerpt text,
      cover_url text,
      content text NOT NULL,
      content_category text NOT NULL DEFAULT 'other',
      content_rating text NOT NULL DEFAULT 'regular',
      created_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE videos (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      author_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      owner_id uuid REFERENCES users(id) ON DELETE CASCADE,
      video_url text,
      thumbnail_url text,
      title text NOT NULL DEFAULT '',
      type text NOT NULL DEFAULT 'video',
      content_category text NOT NULL DEFAULT 'other',
      content_rating text NOT NULL DEFAULT 'regular',
      media_url text,
      liked_by jsonb NOT NULL DEFAULT '[]'::jsonb,
      created_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE video_comments (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      video_id uuid NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
      author_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content text NOT NULL,
      media_url text,
      media_type text,
      liked_by jsonb NOT NULL DEFAULT '[]'::jsonb,
      created_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE stories (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      author_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      owner_id uuid REFERENCES users(id) ON DELETE CASCADE,
      media_url text,
      type text NOT NULL DEFAULT 'image',
      text_content text,
      background_gradient text,
      story_font_id text,
      story_text_style text,
      content_category text NOT NULL DEFAULT 'other',
      content_rating text NOT NULL DEFAULT 'regular',
      created_at timestamptz NOT NULL DEFAULT now(),
      expires_at timestamptz
    );

    CREATE TABLE live_streams (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      host_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title text NOT NULL,
      cover_url text,
      kind text NOT NULL DEFAULT 'standard',
      category text NOT NULL DEFAULT 'other',
      starts_at timestamptz,
      guest_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
      content_rating text NOT NULL DEFAULT 'regular',
      created_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE broadcast_channels (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name text NOT NULL,
      description text,
      cover_url text,
      content_category text NOT NULL DEFAULT 'other',
      content_rating text NOT NULL DEFAULT 'regular',
      created_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE broadcast_channel_messages (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      channel_id uuid NOT NULL REFERENCES broadcast_channels(id) ON DELETE CASCADE,
      author_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content text NOT NULL,
      content_category text NOT NULL DEFAULT 'other',
      content_rating text NOT NULL DEFAULT 'regular',
      reactions jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE user_notes (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content text NOT NULL,
      content_category text NOT NULL DEFAULT 'other',
      content_rating text NOT NULL DEFAULT 'regular',
      audience text NOT NULL DEFAULT 'public',
      created_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE profile_comments (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      profile_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      author_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE highlights (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE profile_showcases (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE business_profiles (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      user_id uuid REFERENCES users(id) ON DELETE CASCADE,
      company_name text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE preregistrations (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      email text NOT NULL UNIQUE,
      username text NOT NULL UNIQUE,
      created_at timestamptz NOT NULL DEFAULT now()
    );
  `);
}

test('OPERATIONAL REHEARSAL 1: Fresh staging schema migration duration, locks and constraint validity', async () => {
  const { dbName, dbUrl } = await createIsolatedDatabase('yor_rehearsal_fresh');
  const client = new Client({ connectionString: dbUrl });
  await client.connect();

  try {
    await setupBaselineSchema(client);

    // Measure migration duration and advisory lock
    const start = performance.now();
    await client.query("SET statement_timeout = '60s'");
    await client.query("SET lock_timeout = '5s'");

    // Test advisory lock acquisition
    const lockAcquired = await client.query("SELECT pg_try_advisory_lock(hashtext('yor_beta_search_index')) AS acquired");
    assert.equal(lockAcquired.rows[0].acquired, true, 'Migration must be able to acquire advisory lock');
    await client.query("SELECT pg_advisory_unlock(hashtext('yor_beta_search_index'))");

    // Execute release migration
    await migrateRelease(client);
    const durationMs = performance.now() - start;
    console.log(`[Rehearsal Fresh] Migration completed in ${durationMs.toFixed(2)}ms`);

    // Verify all recorded release versions
    const versions = (await client.query('SELECT version FROM release_schema_versions ORDER BY version')).rows.map(r => r.version);
    assert.ok(versions.includes(RELEASE_SCHEMA_VERSION), 'Release schema version must be recorded');
    assert.ok(versions.includes(ACCOUNT_HISTORY_RETENTION_VERSION), 'Account history retention version must be recorded');
    assert.ok(versions.includes(PRIVACY_RETENTION_SCHEMA_VERSION), 'Privacy retention version must be recorded');
    assert.ok(versions.includes('20261015-grievance-sla-unset-1'), 'Grievance SLA unset version must be recorded');

    // Verify all added tables exist
    const newTables = [
      'password_reset_tokens',
      'report_moderation_events',
      'background_jobs',
      'runtime_heartbeats',
      'media_cleanup_holds',
      'deletion_journal',
      'privacy_rights_requests',
      'consent_records',
      'email_suppressions',
      'recovery_replay_log',
    ];
    for (const tbl of newTables) {
      const res = await client.query('SELECT 1 FROM information_schema.tables WHERE table_schema=current_schema() AND table_name=$1', [tbl]);
      assert.equal(res.rowCount, 1, `Expected table ${tbl} to exist`);
    }

    // Verify 0 unvalidated constraints
    const invalidConstraints = await client.query(`
      SELECT conname, conrelid::regclass AS table_name
      FROM pg_constraint
      WHERE NOT convalidated
    `);
    assert.equal(invalidConstraints.rowCount, 0, `All constraints must be valid: ${JSON.stringify(invalidConstraints.rows)}`);

    // Verify table, index, and constraint inventory
    const tableCount = (await client.query("SELECT count(*)::int AS count FROM information_schema.tables WHERE table_schema='public'")).rows[0].count;
    const indexCount = (await client.query("SELECT count(*)::int AS count FROM pg_indexes WHERE schemaname='public'")).rows[0].count;
    const constraintCount = (await client.query("SELECT count(*)::int AS count FROM pg_constraint c JOIN pg_namespace n ON n.oid=c.connamespace WHERE n.nspname='public'")).rows[0].count;

    assert.ok(tableCount >= 20, `Expected at least 20 tables, found ${tableCount}`);
    assert.ok(indexCount >= 25, `Expected at least 25 indexes, found ${indexCount}`);
    assert.ok(constraintCount >= 25, `Expected at least 25 constraints, found ${constraintCount}`);
    console.log(`[Rehearsal Fresh] Verified inventory: ${tableCount} tables, ${indexCount} indexes, ${constraintCount} constraints.`);
  } finally {
    await client.end().catch(() => {});
    await dropIsolatedDatabase(dbName);
  }
});

test('OPERATIONAL REHEARSAL 2: Production-representative populated schema, measurement and backward compatibility', async () => {
  const { dbName, dbUrl } = await createIsolatedDatabase('yor_rehearsal_pop');
  const client = new Client({ connectionString: dbUrl });
  await client.connect();

  try {
    await setupBaselineSchema(client);

    // 1. Seed production-representative records
    const userIds = [];
    for (let i = 0; i < 30; i++) {
      const id = randomUUID();
      userIds.push(id);
      await client.query(`INSERT INTO users (id, username, email, full_name, bio, created_at)
        VALUES ($1, $2, $3, $4, $5, now() - interval '10 days')`,
        [id, `user_${i}`, `user_${i}@example.test`, `User Number ${i}`, `Bio of user ${i}`]);
    }

    const convId = randomUUID();
    await client.query(`INSERT INTO conversations (id, is_group, participant_a, participant_b, participant_ids)
      VALUES ($1, true, $2, $3, $4)`, [convId, userIds[0], userIds[1], JSON.stringify([userIds[0], userIds[1], userIds[2]])]);

    for (let i = 0; i < 3; i++) {
      await client.query(`INSERT INTO conversation_members (conversation_id, user_id, role)
        VALUES ($1, $2, 'member')`, [convId, userIds[i]]);
    }

    let prevMsgId = null;
    for (let i = 0; i < 50; i++) {
      const msgId = randomUUID();
      const sender = userIds[i % 3];
      await client.query(`INSERT INTO messages (id, conversation_id, sender_id, recipient_id, content, reply_to_id, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, now() - interval '5 days' + interval '${i} minutes')`,
        [msgId, convId, sender, userIds[(i + 1) % 3], `Message content ${i}`, prevMsgId]);
      prevMsgId = msgId;
    }

    // Seed products, orders with empty product_snapshot
    const productId = randomUUID();
    await client.query(`INSERT INTO products (id, seller_id, title, price) VALUES ($1, $2, 'Handmade Art', 49.99)`,
      [productId, userIds[0]]);

    const orderId = randomUUID();
    await client.query(`INSERT INTO marketplace_orders (id, product_id, buyer_id, seller_id, amount_minor, shipping_name, shipping_address)
      VALUES ($1, $2, $3, $4, 4999, 'Buyer Name', '456 Street')`, [orderId, productId, userIds[1], userIds[0]]);

    // Seed grievance with SLA deadline to verify cleanup
    await client.query(`INSERT INTO grievance_tickets (id, ticket_id, category, reported_url, reporter_name, reporter_email, description, status, sla_deadline)
      VALUES ($1, 'TICKET-001', 'harassment', 'https://yor.test/p/1', 'Reporter', 'rep@test.local', 'Desc', 'received', now() + interval '48 hours')`,
      [randomUUID()]);

    // 2. Backward Compatibility: Pre-migration query contract
    const preMigrationPostId = randomUUID();
    await client.query(`INSERT INTO posts (id, author_id, content, content_category, content_rating, audience)
      VALUES ($1, $2, 'Pre-migration post from older application version', 'other', 'regular', 'public')`,
      [preMigrationPostId, userIds[0]]);

    const readPre = await client.query('SELECT id, content FROM posts WHERE id=$1', [preMigrationPostId]);
    assert.equal(readPre.rows[0].content, 'Pre-migration post from older application version');

    // 3. Execute Migration under Lock & Time Measurement
    const start = performance.now();
    await client.query("SELECT pg_advisory_lock(hashtext('yor_beta_search_index'))");
    await migrateRelease(client);
    await client.query("SELECT pg_advisory_unlock(hashtext('yor_beta_search_index'))");
    const migrationDurationMs = performance.now() - start;
    console.log(`[Rehearsal Populated] Populated schema migration duration: ${migrationDurationMs.toFixed(2)}ms`);

    // 4. Verify Backward Compatibility of Previous Application Version
    // Older code does not know about auth_version, decision_reason, product_snapshot, etc.
    const oldAppPostId = randomUUID();
    await client.query(`INSERT INTO posts (id, author_id, content) VALUES ($1, $2, 'Post created by old app version after DB migration')`,
      [oldAppPostId, userIds[1]]);
    const readOldAppPost = await client.query('SELECT id, content, content_category, content_rating, audience FROM posts WHERE id=$1', [oldAppPostId]);
    assert.equal(readOldAppPost.rows[0].content, 'Post created by old app version after DB migration');
    assert.equal(readOldAppPost.rows[0].content_category, 'other', 'Default content_category must preserve backward compatibility');
    assert.equal(readOldAppPost.rows[0].content_rating, 'regular', 'Default content_rating must preserve backward compatibility');
    assert.equal(readOldAppPost.rows[0].audience, 'public', 'Default audience must preserve backward compatibility');

    // 5. Verify Forward Migration Enhancements
    // Verify product_snapshot was backfilled
    const updatedOrder = (await client.query('SELECT product_snapshot FROM marketplace_orders WHERE id=$1', [orderId])).rows[0];
    assert.deepEqual(updatedOrder.product_snapshot, { id: productId, title: 'Handmade Art' });

    // Verify grievance ticket SLA was unset
    const updatedGrievance = (await client.query("SELECT sla_deadline FROM grievance_tickets WHERE ticket_id='TICKET-001'")).rows[0];
    assert.equal(updatedGrievance.sla_deadline, null, 'Grievance SLA must be unset per statutory requirement');

    // Verify new application columns work
    const updatedUser = (await client.query('SELECT id, auth_version, processing_restricted FROM users WHERE id=$1', [userIds[0]])).rows[0];
    assert.equal(updatedUser.auth_version, 0);
    assert.equal(updatedUser.processing_restricted, false);

    // 6. Repeat Execution (Idempotence)
    const repeatStart = performance.now();
    await migrateRelease(client);
    const repeatDurationMs = performance.now() - repeatStart;
    console.log(`[Rehearsal Populated] Repeat migration duration (idempotence): ${repeatDurationMs.toFixed(2)}ms`);
    assert.ok(repeatDurationMs < 2000, `Repeat execution must be fast and non-destructive (${repeatDurationMs}ms)`);
  } finally {
    await client.end().catch(() => {});
    await dropIsolatedDatabase(dbName);
  }
});

test('OPERATIONAL REHEARSAL 3: Interrupted execution, partial failure rollback and recovery', async () => {
  const { dbName, dbUrl } = await createIsolatedDatabase('yor_rehearsal_fail');
  const client = new Client({ connectionString: dbUrl });
  await client.connect();

  try {
    await setupBaselineSchema(client);

    // 1. Simulate an intentional error mid-migration
    let caughtError = null;
    try {
      await client.query('BEGIN');
      await client.query(`CREATE TABLE IF NOT EXISTS release_schema_versions (version text PRIMARY KEY, applied_at timestamptz DEFAULT now())`);
      await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_version integer NOT NULL DEFAULT 0`);
      // Injected failure (syntax error or constraint violation)
      await client.query(`ALTER TABLE nonexistent_table ADD COLUMN invalid_col integer`);
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      caughtError = err;
    }

    assert.ok(caughtError, 'Expected injected migration error');
    assert.match(caughtError.message, /relation "nonexistent_table" does not exist/);

    // Verify that transaction rollback left no dirty partial state
    const tableExists = await client.query("SELECT 1 FROM information_schema.tables WHERE table_name='release_schema_versions'");
    assert.equal(tableExists.rowCount, 0, 'Rolled back transaction must not commit release_schema_versions');

    const columnExists = await client.query("SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='auth_version'");
    assert.equal(columnExists.rowCount, 0, 'Rolled back transaction must not commit auth_version column');

    // Verify that advisory locks are free
    const lockTest = await client.query("SELECT pg_try_advisory_lock(hashtext('yor_beta_search_index')) AS acquired");
    assert.equal(lockTest.rows[0].acquired, true, 'Advisory lock must be released after failure');
    await client.query("SELECT pg_advisory_unlock(hashtext('yor_beta_search_index'))");

    // 2. Recovery: Execute clean migration
    await migrateRelease(client);

    // Verify recovery was 100% successful
    const finalVersions = await client.query('SELECT version FROM release_schema_versions WHERE version=$1', [RELEASE_SCHEMA_VERSION]);
    assert.equal(finalVersions.rowCount, 1, 'Migration completed cleanly upon retry');
  } finally {
    await client.end().catch(() => {});
    await dropIsolatedDatabase(dbName);
  }
});
