import { db } from '@workspace/db';
import { sql, type SQL } from 'drizzle-orm';

export const REQUIRED_MODERATION_SCHEMA_VERSION = '20261021-moderation-decisions-2';
type SchemaQuery = (statement: SQL) => Promise<{ rows: Record<string, unknown>[] }>;

/** Reject a deployment that cannot persist or read the decision/review contract. */
export async function assertModerationSchema(query: SchemaQuery = statement => db.execute(statement)): Promise<void> {
  await query(sql`SELECT d.id,d.target_type,d.target_id,d.action,d.scope,d.actor_id,d.rationale,d.internal_notes,
    d.report_id,d.grievance_ticket_id,d.expires_at,d.superseded_at,d.superseded_by,d.created_at,
    e.id,e.target_type,e.target_id,e.active_decision_id,e.state,e.scope,e.reason,e.applied_at,e.expires_at,e.updated_at,
    n.id,n.decision_id,n.recipient_user_id,n.recipient_role,n.target_type,n.target_id,n.safe_summary,n.action,
    n.appeal_eligible,n.appeal_deadline,n.acknowledged_at,n.created_at,
    a.id,a.decision_id,a.appellant_user_id,a.relationship,a.statement,a.status,a.reviewer_id,a.reviewer_notes,
    a.public_rationale,a.outcome_decision_id,a.reviewed_at,a.created_at,a.updated_at
    FROM moderation_decisions d,moderation_enforcements e,moderation_decision_notices n,moderation_appeals a WHERE false`);
  const result = await query(sql`SELECT
    EXISTS (SELECT 1 FROM release_schema_versions WHERE version=${REQUIRED_MODERATION_SCHEMA_VERSION})
    AND NOT EXISTS (
      SELECT 1 FROM (VALUES
        ('moderation_enforcements','moderation_enforcements_target_idx'),
        ('moderation_decision_notices','moderation_decision_notices_decision_recipient_idx'),
        ('moderation_appeals','moderation_appeals_decision_appellant_unique_idx')
      ) AS required(relation_name,index_name)
      WHERE NOT EXISTS (SELECT 1 FROM pg_index i WHERE i.indrelid=to_regclass(required.relation_name)
        AND i.indexrelid=to_regclass(required.index_name) AND i.indisvalid AND i.indisready AND i.indisunique)
    ) AS ready`);
  if (result.rows[0]?.ready !== true) throw new Error('Moderation schema migration is incomplete');
}
