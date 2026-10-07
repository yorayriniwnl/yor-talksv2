import { bigint, index, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { usersTable } from './index';

const instant = (name: string) => timestamp(name, { withTimezone: true, mode: 'string' });
// Private authority. The release migration installs additional invariant checks
// on both Drizzle-created fresh tables and existing populated databases.
export const eligibilityEnrollmentsTable = pgTable('eligibility_enrollments', {
  id: uuid('id').primaryKey(), credentialHash: text('credential_hash').notNull().unique(),
  requestedExperience: text('requested_experience').notNull(), territory: text('territory').notNull(),
  status: text('status').notNull().default('pending'), revision: bigint('revision', { mode: 'bigint' }).notNull().default(sql`0`),
  registrationNonceHash: text('registration_nonce_hash').unique(), boundUserId: uuid('bound_user_id').references(() => usersTable.id, { onDelete: 'cascade' }),
  policyVersions: jsonb('policy_versions').notNull().default({}), noticeVersions: jsonb('notice_versions').notNull().default({}),
  authorizedAt: instant('authorized_at'), consumedAt: instant('consumed_at'), expiresAt: instant('expires_at').notNull(),
  createdAt: instant('created_at').notNull().defaultNow(),
}, table => [index('eligibility_enrollments_expiry_idx').on(table.status, table.expiresAt)]);

export const eligibilityRevisionsTable = pgTable('eligibility_revisions', {
  userId: uuid('user_id').primaryKey().references(() => usersTable.id, { onDelete: 'cascade' }),
  revision: bigint('revision', { mode: 'bigint' }).notNull().default(sql`0`), updatedAt: instant('updated_at').notNull().defaultNow(),
});

export const eligibilityAssessmentsTable = pgTable('eligibility_assessments', {
  id: uuid('id').primaryKey(), userId: uuid('user_id').references(() => usersTable.id, { onDelete: 'cascade' }),
  enrollmentId: uuid('enrollment_id').references(() => eligibilityEnrollmentsTable.id, { onDelete: 'cascade' }),
  status: text('status').notNull(), issuer: text('issuer').notNull(), method: text('method').notNull(),
  subjectRevision: bigint('subject_revision', { mode: 'bigint' }).notNull().default(sql`0`),
  experience: text('experience').notNull(), thresholdAssertions: jsonb('threshold_assertions').notNull().default([]),
  territory: text('territory').notNull(), policyVersions: jsonb('policy_versions').notNull().default({}),
  verifiedAt: instant('verified_at'), expiresAt: instant('expires_at').notNull(), evidenceReference: text('evidence_reference'),
  createdAt: instant('created_at').notNull().defaultNow(),
}, table => [index('eligibility_assessments_user_idx').on(table.userId, table.createdAt),
  index('eligibility_assessments_enrollment_idx').on(table.enrollmentId, table.createdAt),
  index('eligibility_assessments_expiry_idx').on(table.status, table.expiresAt)]);

export const eligibilityChallengesTable = pgTable('eligibility_challenges', {
  id: uuid('id').primaryKey(), userId: uuid('user_id').references(() => usersTable.id, { onDelete: 'cascade' }),
  enrollmentId: uuid('enrollment_id').references(() => eligibilityEnrollmentsTable.id, { onDelete: 'cascade' }),
  issuer: text('issuer').notNull(), audience: text('audience').notNull(), purpose: text('purpose').notNull(),
  nonceHash: text('nonce_hash').notNull().unique(), subjectRevision: bigint('subject_revision', { mode: 'bigint' }).notNull(),
  policyVersions: jsonb('policy_versions').notNull().default({}), noticeVersions: jsonb('notice_versions').notNull().default({}),
  requestedPurposes: jsonb('requested_purposes').notNull().default([]), status: text('status').notNull().default('pending'),
  consumedEventId: text('consumed_event_id'), consumedAt: instant('consumed_at'), expiresAt: instant('expires_at').notNull(),
  createdAt: instant('created_at').notNull().defaultNow(),
}, table => [uniqueIndex('eligibility_challenges_event_idx').on(table.issuer, table.consumedEventId),
  index('eligibility_challenges_user_idx').on(table.userId, table.status, table.expiresAt),
  index('eligibility_challenges_enrollment_idx').on(table.enrollmentId, table.status, table.expiresAt)]);

export const guardianAuthorizationsTable = pgTable('guardian_authorizations', {
  id: uuid('id').primaryKey(), userId: uuid('user_id').references(() => usersTable.id, { onDelete: 'cascade' }),
  enrollmentId: uuid('enrollment_id').references(() => eligibilityEnrollmentsTable.id, { onDelete: 'cascade' }),
  guardianUserId: uuid('guardian_user_id').references(() => usersTable.id, { onDelete: 'cascade' }),
  guardianReference: text('guardian_reference').notNull(), issuer: text('issuer').notNull(), responsibilityReference: text('responsibility_reference').notNull(),
  status: text('status').notNull().default('granted'), purposes: jsonb('purposes').notNull(),
  noticeVersions: jsonb('notice_versions').notNull(), policyVersions: jsonb('policy_versions').notNull(),
  verifiedAt: instant('verified_at').notNull(), grantedAt: instant('granted_at').notNull(), expiresAt: instant('expires_at').notNull(),
  withdrawnAt: instant('withdrawn_at'), createdAt: instant('created_at').notNull().defaultNow(),
}, table => [index('guardian_authorizations_user_idx').on(table.userId, table.status, table.expiresAt),
  index('guardian_authorizations_enrollment_idx').on(table.enrollmentId, table.status, table.expiresAt),
  index('guardian_authorizations_guardian_idx').on(table.guardianUserId, table.status)]);
