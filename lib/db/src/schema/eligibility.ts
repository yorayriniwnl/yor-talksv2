import { pgTable, uuid, text, timestamp, jsonb, boolean, index } from 'drizzle-orm/pg-core';
import { usersTable } from './index';

export const eligibilityAssessmentsTable = pgTable('eligibility_assessments', {
  id: uuid('id').primaryKey(), userId: uuid('user_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  status: text('status').notNull().default('pending'), issuer: text('issuer').notNull(), country: text('country').notNull(),
  policyVersion: text('policy_version').notNull(), thresholds: jsonb('thresholds').notNull().default({}),
  current: boolean('is_current').notNull().default(false),
  evidenceReference: text('evidence_reference'), verifiedAt: timestamp('verified_at', { withTimezone: true, mode: 'string' }),
  expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'string' }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
}, t => ({ userIndex: index('eligibility_assessments_user_idx').on(t.userId, t.status, t.expiresAt) }));

export const eligibilityChallengesTable = pgTable('eligibility_challenges', {
  id: uuid('id').primaryKey(), userId: uuid('user_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  kind: text('kind').notNull(), country: text('country').notNull(), policyVersion: text('policy_version').notNull(),
  guardianAuthorizationId: uuid('guardian_authorization_id'), status: text('status').notNull().default('pending'),
  nonceHash: text('nonce_hash').notNull(), issuer: text('issuer').notNull(),
  resultHash: text('result_hash'),
  expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'string' }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
});

export const guardianAuthorizationsTable = pgTable('guardian_authorizations', {
  id: uuid('id').primaryKey(), childId: uuid('child_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  guardianId: uuid('guardian_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  status: text('status').notNull().default('pending'), parentalResponsibilityVerified: boolean('parental_responsibility_verified').notNull().default(false),
  issuer: text('issuer').notNull(), evidenceReference: text('evidence_reference'), purposes: jsonb('purposes').notNull().default([]),
  noticeVersion: text('notice_version').notNull(), policyVersion: text('policy_version').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'string' }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  withdrawnAt: timestamp('withdrawn_at', { withTimezone: true, mode: 'string' }),
}, t => ({ childIndex: index('guardian_authorizations_child_idx').on(t.childId, t.status) }));
