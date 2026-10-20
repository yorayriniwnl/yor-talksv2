/** Additive moderation decision, enforcement, notice, and appeal migration. */
export const MODERATION_SCHEMA_VERSION = '20261019-moderation-decisions-1';

export async function migrateModeration(client) {
  // 1. moderation_decisions table
  await client.query(`CREATE TABLE IF NOT EXISTS moderation_decisions (
    id uuid PRIMARY KEY,
    report_id uuid REFERENCES reports(id) ON DELETE SET NULL,
    grievance_ticket_id uuid REFERENCES grievance_tickets(id) ON DELETE SET NULL,
    target_type text NOT NULL,
    target_id text NOT NULL,
    action text NOT NULL,
    scope text NOT NULL DEFAULT 'global',
    actor_id uuid REFERENCES users(id) ON DELETE SET NULL,
    rationale text NOT NULL,
    internal_notes text,
    expires_at timestamptz,
    superseded_at timestamptz,
    superseded_by uuid,
    created_at timestamptz NOT NULL DEFAULT now()
  )`);
  await client.query(`CREATE INDEX IF NOT EXISTS moderation_decisions_target_idx
    ON moderation_decisions(target_type, target_id, created_at)`);
  await client.query(`CREATE INDEX IF NOT EXISTS moderation_decisions_report_idx
    ON moderation_decisions(report_id)`);
  await client.query(`CREATE INDEX IF NOT EXISTS moderation_decisions_grievance_idx
    ON moderation_decisions(grievance_ticket_id)`);
  await client.query(`CREATE INDEX IF NOT EXISTS moderation_decisions_actor_idx
    ON moderation_decisions(actor_id, created_at)`);

  await client.query(`DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'moderation_decisions_valid_check'
      ) THEN
        ALTER TABLE moderation_decisions ADD CONSTRAINT moderation_decisions_valid_check
          CHECK (
            target_type IN ('post', 'user', 'comment', 'message', 'video')
            AND action IN ('no_action', 'restrict', 'remove', 'restore')
            AND scope IN ('public', 'direct_only', 'global')
            AND length(rationale) >= 10
          );
      END IF;
    END $$;`);

  // 2. moderation_enforcements table
  await client.query(`CREATE TABLE IF NOT EXISTS moderation_enforcements (
    id uuid PRIMARY KEY,
    target_type text NOT NULL,
    target_id text NOT NULL,
    active_decision_id uuid NOT NULL REFERENCES moderation_decisions(id) ON DELETE CASCADE,
    state text NOT NULL,
    scope text NOT NULL DEFAULT 'global',
    reason text NOT NULL,
    applied_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz,
    updated_at timestamptz NOT NULL DEFAULT now()
  )`);
  await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS moderation_enforcements_target_idx
    ON moderation_enforcements(target_type, target_id)`);
  await client.query(`CREATE INDEX IF NOT EXISTS moderation_enforcements_expiry_idx
    ON moderation_enforcements(state, expires_at)`);

  await client.query(`DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'moderation_enforcements_valid_check'
      ) THEN
        ALTER TABLE moderation_enforcements ADD CONSTRAINT moderation_enforcements_valid_check
          CHECK (
            target_type IN ('post', 'user', 'comment', 'message', 'video')
            AND state IN ('restricted', 'removed')
            AND scope IN ('public', 'direct_only', 'global')
          );
      END IF;
    END $$;`);

  // 3. moderation_decision_notices table
  await client.query(`CREATE TABLE IF NOT EXISTS moderation_decision_notices (
    id uuid PRIMARY KEY,
    decision_id uuid NOT NULL REFERENCES moderation_decisions(id) ON DELETE CASCADE,
    recipient_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_role text NOT NULL,
    target_type text NOT NULL,
    target_id text NOT NULL,
    safe_summary text NOT NULL,
    action text NOT NULL,
    appeal_eligible boolean NOT NULL DEFAULT false,
    appeal_deadline timestamptz,
    acknowledged_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
  )`);
  await client.query(`CREATE INDEX IF NOT EXISTS moderation_decision_notices_recipient_idx
    ON moderation_decision_notices(recipient_user_id, created_at)`);
  await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS moderation_decision_notices_decision_recipient_idx
    ON moderation_decision_notices(decision_id, recipient_user_id)`);

  await client.query(`DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'moderation_decision_notices_valid_check'
      ) THEN
        ALTER TABLE moderation_decision_notices ADD CONSTRAINT moderation_decision_notices_valid_check
          CHECK (
            recipient_role IN ('author', 'reporter', 'affected_party')
            AND target_type IN ('post', 'user', 'comment', 'message', 'video')
          );
      END IF;
    END $$;`);

  // 4. moderation_appeals table
  await client.query(`CREATE TABLE IF NOT EXISTS moderation_appeals (
    id uuid PRIMARY KEY,
    decision_id uuid NOT NULL REFERENCES moderation_decisions(id) ON DELETE CASCADE,
    appellant_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    relationship text NOT NULL,
    statement text NOT NULL,
    status text NOT NULL DEFAULT 'pending',
    reviewer_id uuid REFERENCES users(id) ON DELETE SET NULL,
    reviewer_notes text,
    outcome_decision_id uuid REFERENCES moderation_decisions(id) ON DELETE SET NULL,
    reviewed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  )`);
  await client.query(`CREATE INDEX IF NOT EXISTS moderation_appeals_decision_appellant_idx
    ON moderation_appeals(decision_id, appellant_user_id)`);
  await client.query(`CREATE INDEX IF NOT EXISTS moderation_appeals_appellant_idx
    ON moderation_appeals(appellant_user_id, created_at)`);
  await client.query(`CREATE INDEX IF NOT EXISTS moderation_appeals_status_idx
    ON moderation_appeals(status, created_at)`);

  await client.query(`DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'moderation_appeals_valid_check'
      ) THEN
        ALTER TABLE moderation_appeals ADD CONSTRAINT moderation_appeals_valid_check
          CHECK (
            status IN ('pending', 'under_review', 'upheld', 'reversed', 'rejected')
            AND relationship IN ('author', 'reporter', 'affected_party')
            AND length(statement) >= 10
          );
      END IF;
    END $$;`);
}
