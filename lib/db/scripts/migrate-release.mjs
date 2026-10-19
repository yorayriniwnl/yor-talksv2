/** Additive release migrations, called under the production runner's advisory lock. */
export const RELEASE_SCHEMA_VERSION = '20261019-preregistration-1';

export async function migrateRelease(client) {
  await client.query('BEGIN');
  try {
    await client.query(`CREATE TABLE IF NOT EXISTS release_schema_versions (
      version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now()
    )`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_version integer NOT NULL DEFAULT 0`);
    await client.query(`CREATE TABLE IF NOT EXISTS password_reset_tokens (
      token_hash text PRIMARY KEY,
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      auth_version integer NOT NULL,
      expires_at timestamptz NOT NULL,
      consumed_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now()
    )`);
    await client.query('CREATE INDEX IF NOT EXISTS password_reset_expiry_idx ON password_reset_tokens(expires_at)');
    await client.query('CREATE INDEX IF NOT EXISTS reports_queue_idx ON reports(created_at, id)');
    await client.query('CREATE INDEX IF NOT EXISTS reports_status_queue_idx ON reports(status, created_at, id)');
    await client.query('CREATE INDEX IF NOT EXISTS post_bookmark_page_idx ON post_bookmarks(user_id, created_at, post_id)');
    await client.query('CREATE INDEX IF NOT EXISTS video_bookmark_page_idx ON video_bookmarks(user_id, created_at, video_id)');
    await client.query('ALTER TABLE reports ADD COLUMN IF NOT EXISTS decision_reason text');
    await client.query(`CREATE TABLE IF NOT EXISTS report_moderation_events (
      id uuid PRIMARY KEY,
      report_id uuid NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
      moderator_id uuid REFERENCES users(id) ON DELETE SET NULL,
      from_status text CHECK (from_status IS NULL OR from_status IN ('pending','reviewed','resolved','dismissed')),
      to_status text NOT NULL CHECK (to_status IN ('pending','reviewed','resolved','dismissed')),
      decision_reason text,
      created_at timestamptz NOT NULL DEFAULT now()
    )`);
    await client.query('CREATE INDEX IF NOT EXISTS report_moderation_events_history_idx ON report_moderation_events(report_id, created_at, id)');
    await client.query('CREATE INDEX IF NOT EXISTS report_moderation_events_moderator_idx ON report_moderation_events(moderator_id, created_at)');
    await client.query('CREATE INDEX IF NOT EXISTS grievance_queue_idx ON grievance_tickets(created_at, id)');
    await client.query('CREATE INDEX IF NOT EXISTS grievance_status_queue_idx ON grievance_tickets(status, created_at, id)');
    await client.query(`CREATE TABLE IF NOT EXISTS background_jobs (
      id uuid PRIMARY KEY, kind text NOT NULL, dedup_key text NOT NULL UNIQUE,
      payload jsonb NOT NULL, status text NOT NULL DEFAULT 'pending', attempts integer NOT NULL DEFAULT 0,
      available_at timestamptz NOT NULL DEFAULT now(), lease_token uuid, lease_until timestamptz,
      last_error text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
    )`);
    await client.query(`CREATE INDEX IF NOT EXISTS background_jobs_due_idx ON background_jobs(status, available_at, lease_until)`);
    await client.query(`CREATE INDEX IF NOT EXISTS background_jobs_cleanup_health_idx
      ON background_jobs(kind,status,available_at,lease_until)
      WHERE kind IN ('account_cleanup','media_cleanup') AND status IN ('pending','running','dead')`);
    await client.query(`CREATE TABLE IF NOT EXISTS runtime_heartbeats (
      worker_id text PRIMARY KEY, kind text NOT NULL, heartbeat_at timestamptz NOT NULL DEFAULT now(), details jsonb NOT NULL DEFAULT '{}'
    )`);
    await client.query(`CREATE TABLE IF NOT EXISTS media_cleanup_holds (
      id bigserial PRIMARY KEY, deletion_id uuid NOT NULL, source_type text NOT NULL,
      source_id uuid, references_json jsonb NOT NULL, status text NOT NULL DEFAULT 'needs_ownership_review',
      created_at timestamptz NOT NULL DEFAULT now()
    )`);
    // A statutory response period cannot be inferred until the operating
    // territory and applicable grievance rules have been approved. Clear the
    // previously invented defaults once, without erasing future approved dates
    // on every deployment.
    const grievanceDeadlineVersion = '20261015-grievance-sla-unset-1';
    if (!(await client.query('SELECT 1 FROM release_schema_versions WHERE version=$1', [grievanceDeadlineVersion])).rowCount) {
      await client.query('ALTER TABLE grievance_tickets ALTER COLUMN sla_deadline DROP NOT NULL');
      await client.query('UPDATE grievance_tickets SET sla_deadline=NULL WHERE sla_deadline IS NOT NULL');
    }
    // Preserve financial identity and provider references when an account or
    // product disappears. Existing data is unchanged; only future deletion semantics change.
    const financialReferences = {
      payment_orders: ['payer_id', 'creator_id'], subscriptions: ['subscriber_id', 'creator_id'],
      subscription_orders: ['subscriber_id', 'creator_id'], marketplace_orders: ['buyer_id', 'seller_id', 'product_id'],
    };
    await client.query(`ALTER TABLE marketplace_orders ADD COLUMN IF NOT EXISTS product_snapshot jsonb NOT NULL DEFAULT '{}'`);
    await client.query(`UPDATE marketplace_orders o SET product_snapshot = jsonb_build_object('id', p.id, 'title', p.title)
      FROM products p WHERE p.id=o.product_id AND o.product_snapshot='{}'::jsonb`);
    for (const [table, columns] of Object.entries(financialReferences)) {
      for (const column of columns) {
        await client.query(`ALTER TABLE "${table}" ALTER COLUMN "${column}" DROP NOT NULL`);
        const constraints = await client.query(`SELECT c.conname FROM pg_constraint c
          JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=ANY(c.conkey)
          WHERE c.conrelid=$1::regclass AND c.contype='f' AND a.attname=$2 AND c.confdeltype <> 'n'`, [table, column]);
        for (const row of constraints.rows) await client.query(`ALTER TABLE "${table}" DROP CONSTRAINT "${row.conname.replaceAll('"', '""')}"`);
        const name = `${table}_${column}_retained_fk`;
        if (!(await client.query('SELECT 1 FROM pg_constraint WHERE conname=$1 AND conrelid=$2::regclass', [name, table])).rowCount) {
          await client.query(`ALTER TABLE "${table}" ADD CONSTRAINT "${name}" FOREIGN KEY("${column}")
            REFERENCES ${column === 'product_id' ? 'products' : 'users'}(id) ON DELETE SET NULL`);
        }
      }
    }
    const { migratePremium } = await import('./migrate-premium.mjs');
    await migratePremium(client);
    const { migrateCheckouts } = await import('./migrate-checkouts.mjs');
    await migrateCheckouts(client);
    const { migrateDisputes } = await import('./migrate-disputes.mjs');
    await migrateDisputes(client);
    const { migrateAccountHistoryRetention, ACCOUNT_HISTORY_RETENTION_VERSION } = await import('./migrate-account-history-retention.mjs');
    await migrateAccountHistoryRetention(client);
    const { migrateMedia } = await import('./migrate-media.mjs');
    await migrateMedia(client);
    const { migrateEligibility } = await import('./migrate-eligibility.mjs');
    await migrateEligibility(client);
    const { migrateAccountExport } = await import('./migrate-account-export.mjs');
    await migrateAccountExport(client);
    const { migrateTermsHistory } = await import('./migrate-terms-history.mjs');
    await migrateTermsHistory(client);
    const { migratePreregister } = await import('./migrate-preregister.mjs');
    await migratePreregister(client);
    await client.query('INSERT INTO release_schema_versions(version) VALUES ($1) ON CONFLICT DO NOTHING', ['20261015-grievance-sla-unset-1']);
    await client.query('INSERT INTO release_schema_versions(version) VALUES ($1) ON CONFLICT DO NOTHING', [RELEASE_SCHEMA_VERSION]);
    await client.query('INSERT INTO release_schema_versions(version) VALUES ($1) ON CONFLICT DO NOTHING', [ACCOUNT_HISTORY_RETENTION_VERSION]);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}
