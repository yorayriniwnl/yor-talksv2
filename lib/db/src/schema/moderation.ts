import { boolean, check, index, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { usersTable, reportsTable, grievanceTicketsTable } from './index';

const instant = (name: string) => timestamp(name, { withTimezone: true, mode: 'string' });

export const moderationDecisionsTable = pgTable('moderation_decisions', {
  id: uuid('id').primaryKey(),
  reportId: uuid('report_id').references(() => reportsTable.id, { onDelete: 'set null' }),
  grievanceTicketId: uuid('grievance_ticket_id').references(() => grievanceTicketsTable.id, { onDelete: 'set null' }),
  targetType: text('target_type').notNull(),
  targetId: text('target_id').notNull(),
  action: text('action').notNull(),
  scope: text('scope').notNull().default('global'),
  actorId: uuid('actor_id').references(() => usersTable.id, { onDelete: 'set null' }),
  rationale: text('rationale').notNull(),
  internalNotes: text('internal_notes'),
  expiresAt: instant('expires_at'),
  supersededAt: instant('superseded_at'),
  supersededBy: uuid('superseded_by'),
  createdAt: instant('created_at').notNull().defaultNow(),
}, (table) => ({
  targetIdx: index('moderation_decisions_target_idx').on(table.targetType, table.targetId, table.createdAt),
  reportIdx: index('moderation_decisions_report_idx').on(table.reportId),
  grievanceIdx: index('moderation_decisions_grievance_idx').on(table.grievanceTicketId),
  actorIdx: index('moderation_decisions_actor_idx').on(table.actorId, table.createdAt),
  validConstraint: check(
    'moderation_decisions_valid_check',
    sql`${table.targetType} IN ('post', 'user', 'comment', 'message', 'video')
      AND ${table.action} IN ('no_action', 'restrict', 'remove', 'restore')
      AND ${table.scope} IN ('public', 'direct_only', 'global')
      AND length(${table.rationale}) >= 10`
  ),
}));

export const moderationEnforcementsTable = pgTable('moderation_enforcements', {
  id: uuid('id').primaryKey(),
  targetType: text('target_type').notNull(),
  targetId: text('target_id').notNull(),
  activeDecisionId: uuid('active_decision_id').references(() => moderationDecisionsTable.id, { onDelete: 'cascade' }).notNull(),
  state: text('state').notNull(),
  scope: text('scope').notNull().default('global'),
  reason: text('reason').notNull(),
  appliedAt: instant('applied_at').notNull().defaultNow(),
  expiresAt: instant('expires_at'),
  updatedAt: instant('updated_at').notNull().defaultNow(),
}, (table) => ({
  targetUniqueIdx: uniqueIndex('moderation_enforcements_target_idx').on(table.targetType, table.targetId),
  expiryIdx: index('moderation_enforcements_expiry_idx').on(table.state, table.expiresAt),
  validConstraint: check(
    'moderation_enforcements_valid_check',
    sql`${table.targetType} IN ('post', 'user', 'comment', 'message', 'video')
      AND ${table.state} IN ('restricted', 'removed')
      AND ${table.scope} IN ('public', 'direct_only', 'global')`
  ),
}));

export const moderationDecisionNoticesTable = pgTable('moderation_decision_notices', {
  id: uuid('id').primaryKey(),
  decisionId: uuid('decision_id').references(() => moderationDecisionsTable.id, { onDelete: 'cascade' }).notNull(),
  recipientUserId: uuid('recipient_user_id').references(() => usersTable.id, { onDelete: 'cascade' }).notNull(),
  recipientRole: text('recipient_role').notNull(),
  targetType: text('target_type').notNull(),
  targetId: text('target_id').notNull(),
  safeSummary: text('safe_summary').notNull(),
  action: text('action').notNull(),
  appealEligible: boolean('appeal_eligible').notNull().default(false),
  appealDeadline: instant('appeal_deadline'),
  acknowledgedAt: instant('acknowledged_at'),
  createdAt: instant('created_at').notNull().defaultNow(),
}, (table) => ({
  recipientIdx: index('moderation_decision_notices_recipient_idx').on(table.recipientUserId, table.createdAt),
  decisionRecipientUnique: uniqueIndex('moderation_decision_notices_decision_recipient_idx').on(table.decisionId, table.recipientUserId),
  validConstraint: check(
    'moderation_decision_notices_valid_check',
    sql`${table.recipientRole} IN ('author', 'reporter', 'affected_party')
      AND ${table.targetType} IN ('post', 'user', 'comment', 'message', 'video')`
  ),
}));

export const moderationAppealsTable = pgTable('moderation_appeals', {
  id: uuid('id').primaryKey(),
  decisionId: uuid('decision_id').references(() => moderationDecisionsTable.id, { onDelete: 'cascade' }).notNull(),
  appellantUserId: uuid('appellant_user_id').references(() => usersTable.id, { onDelete: 'cascade' }).notNull(),
  relationship: text('relationship').notNull(),
  statement: text('statement').notNull(),
  status: text('status').notNull().default('pending'),
  reviewerId: uuid('reviewer_id').references(() => usersTable.id, { onDelete: 'set null' }),
  reviewerNotes: text('reviewer_notes'),
  outcomeDecisionId: uuid('outcome_decision_id').references(() => moderationDecisionsTable.id, { onDelete: 'set null' }),
  reviewedAt: instant('reviewed_at'),
  createdAt: instant('created_at').notNull().defaultNow(),
  updatedAt: instant('updated_at').notNull().defaultNow(),
}, (table) => ({
  decisionAppellantIdx: index('moderation_appeals_decision_appellant_idx').on(table.decisionId, table.appellantUserId),
  appellantIdx: index('moderation_appeals_appellant_idx').on(table.appellantUserId, table.createdAt),
  statusIdx: index('moderation_appeals_status_idx').on(table.status, table.createdAt),
  validConstraint: check(
    'moderation_appeals_valid_check',
    sql`${table.status} IN ('pending', 'under_review', 'upheld', 'reversed', 'rejected')
      AND ${table.relationship} IN ('author', 'reporter', 'affected_party')
      AND length(${table.statement}) >= 10`
  ),
}));
