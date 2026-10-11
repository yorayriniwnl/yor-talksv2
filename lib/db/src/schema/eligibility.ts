import { bigint, check, index, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
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
  territory: text('territory'), policyFingerprint: text('policy_fingerprint'),
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
  subjectRevision: bigint('subject_revision', { mode: 'bigint' }).notNull().default(sql`0`),
  noticeVersions: jsonb('notice_versions').notNull(), policyVersions: jsonb('policy_versions').notNull(),
  verifiedAt: instant('verified_at').notNull(), grantedAt: instant('granted_at').notNull(), expiresAt: instant('expires_at').notNull(),
  withdrawnAt: instant('withdrawn_at'), createdAt: instant('created_at').notNull().defaultNow(),
}, table => [index('guardian_authorizations_user_idx').on(table.userId, table.status, table.expiresAt),
  index('guardian_authorizations_enrollment_idx').on(table.enrollmentId, table.status, table.expiresAt),
  index('guardian_authorizations_guardian_idx').on(table.guardianUserId, table.status)]);

/** Exact, private evidence that a content revision received an approved age rating. */
export const contentSafetyClassificationsTable = pgTable('content_safety_classifications', {
  id: uuid('id').primaryKey(), entityType: text('entity_type').notNull(), entityId: uuid('entity_id').notNull(),
  contentRevision: text('content_revision').notNull(), contentHash: text('content_hash').notNull(),
  classification: text('classification').notNull(), issuer: text('issuer').notNull(),
  status: text('status').notNull().default('pending'), policyVersion: text('policy_version').notNull(),
  approvedAt: instant('approved_at'), createdAt: instant('created_at').notNull().defaultNow(),
}, table => [
  uniqueIndex('content_safety_classifications_revision_idx').on(table.entityType, table.entityId, table.contentRevision, table.policyVersion),
  index('content_safety_classifications_lookup_idx').on(table.entityType, table.entityId, table.status, table.policyVersion),
  check('content_safety_classifications_valid', sql`entity_type IN ('posts','stories','user_notes','videos','articles','communities','community_discussions','products','events','live_streams','broadcast_channels','broadcast_channel_messages','comments','video_comments','profile_comments')
    AND content_revision ~ '^.{1,256}$' AND content_hash ~ '^[a-f0-9]{64}$'
    AND classification IN ('child_safe','regular','mature') AND status IN ('pending','approved','rejected','revoked','superseded')
    AND length(issuer) BETWEEN 1 AND 128 AND length(policy_version) BETWEEN 1 AND 128
    AND ((status='approved' AND approved_at IS NOT NULL) OR (status IN ('revoked','superseded') AND approved_at IS NOT NULL)
      OR (status IN ('pending','rejected') AND approved_at IS NULL))`),
]);
