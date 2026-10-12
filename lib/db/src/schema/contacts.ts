import { pgTable, uuid, text, timestamp, jsonb, primaryKey, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { usersTable, conversationsTable } from './index';
import { guardianAuthorizationsTable } from './eligibility';

export const contactAuthoritiesTable = pgTable('contact_authorities', {
  id: uuid('id').primaryKey(), userAId: uuid('user_a_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  userBId: uuid('user_b_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  requestedBy: uuid('requested_by').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  status: text('status').notNull().default('pending'), policyVersions: jsonb('policy_versions').notNull().default({}),
  recipientAcceptedAt: timestamp('recipient_accepted_at', { withTimezone: true, mode: 'string' }),
  acceptedAt: timestamp('accepted_at', { withTimezone: true, mode: 'string' }),
  revokedAt: timestamp('revoked_at', { withTimezone: true, mode: 'string' }),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
}, t => ({ pair: uniqueIndex('contact_authority_pair_idx').on(t.userAId, t.userBId) }));

export const contactGuardianApprovalsTable = pgTable('contact_guardian_approvals', {
  contactId: uuid('contact_id').notNull().references(() => contactAuthoritiesTable.id, { onDelete: 'cascade' }),
  childId: uuid('child_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  guardianId: uuid('guardian_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  authorizationId: uuid('authorization_id').notNull().references(() => guardianAuthorizationsTable.id, { onDelete: 'cascade' }),
  approvedAt: timestamp('approved_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
}, t => ({ pk: primaryKey({ columns: [t.contactId, t.childId] }) }));

export const groupInvitationsTable = pgTable('group_invitations', {
  id: uuid('id').primaryKey(), conversationId: uuid('conversation_id').notNull().references(() => conversationsTable.id, { onDelete: 'cascade' }),
  inviteeId: uuid('invitee_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  invitedBy: uuid('invited_by').references(() => usersTable.id, { onDelete: 'set null' }),
  status: text('status').notNull().default('pending'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  acceptedAt: timestamp('accepted_at', { withTimezone: true, mode: 'string' }),
}, t => ({ invitation: uniqueIndex('group_invitation_pair_idx').on(t.conversationId, t.inviteeId),
  invitee: index('group_invitation_owner_idx').on(t.inviteeId, t.status) }));
