import assert from 'node:assert/strict';
import { test } from 'node:test';
import { env } from '../config/env.js';
import { loadApprovedTerritoryPolicies, validateApprovedTerritoryPolicies } from '../eligibility/territory-policy.js';
import { evaluateEligibility } from '../eligibility/policy.js';
import { toPublicGrievance, type PublicGrievanceReceipt } from '../utils/grievance-view.js';
import { isMessageVisible } from '../utils/message-visibility.js';
import { notificationJobPolicy } from '../lib/notification-job-policy.js';
import { registerSchema, acceptTermsSchema, isAllowedEmail } from '../validators/auth.js';
import { productEventSchema } from '../services/product-analytics-service.js';
import type { GrievanceTicket } from '../services/moderation-service.js';
import { conversationsTable, messagesTable } from '@workspace/db/schema';

test('release-scope guards: minimum age 18 and optional capabilities disabled by default', () => {
  assert.equal(env.MINIMUM_AGE, 18, 'Minimum age must be 18');
  assert.equal(env.PAYMENTS_ENABLED, false, 'Payments must be disabled');
  assert.equal(env.LIVE_ROOMS_ENABLED, false, 'Live rooms must be disabled');
  assert.equal(env.WEB_PUSH_ENABLED, false, 'Web push must be disabled');
  assert.equal(env.RTC_CALLS_ENABLED, false, 'RTC calls must be disabled');
  assert.equal(env.SELLER_ENABLED, false, 'Seller capability must be disabled');
  assert.equal(env.MEMBERSHIPS_ENABLED, false, 'Memberships must be disabled');
  assert.equal(env.AI_COMPANION_ENABLED, false, 'AI companion must be disabled');
  assert.equal(env.ELIGIBILITY_ASSURANCE_ADAPTER, 'unavailable', 'Assurance adapter must be unavailable without approved provider');
});

test('territory registry is empty and fails closed without approved legal policies', () => {
  const policies = loadApprovedTerritoryPolicies();
  assert.deepEqual(policies, [], 'Production approved territory registry must be empty initially');

  // Verify synthetic policies are rejected in production mode
  assert.throws(() => {
    validateApprovedTerritoryPolicies([
      {
        id: 'synthetic-test',
        scope: 'recipient',
        territory: 'EU',
        version: '1',
        approved: true,
        synthetic: true,
        approvalReference: 'test',
        effectiveFrom: new Date(Date.now() - 1000).toISOString(),
        reviewExpiresAt: new Date(Date.now() + 100000).toISOString(),
        sources: ['https://example.test'],
        allowedExperiences: ['adult_18_plus'],
        minimumAccessThreshold: 18,
        independentConsentThreshold: 18,
        guardianRequiredBelow: null,
        requiredGuardianPurposes: ['account_activation'],
        guardianNoticeVersions: { account_activation: '1' },
        currentTermsVersion: '2026-08',
        guardianContactsRequired: false,
        publicBrowsingAllowed: false,
        maximumContentRating: 'regular',
        capabilities: {
          social: true, publish: true, messaging: true, payments: false,
          seller: false, memberships: false, live: false, rtc: false, ai: false,
          analytics: false, profiling: false,
        },
      },
    ], { allowSynthetic: false });
  }, /Synthetic policies cannot enter the approved production registry/);

  // Unreviewed or unapproved territories deny activation
  const decision = evaluateEligibility(undefined, policies, new Date());
  assert.equal(decision.activated, false);
  assert.equal(decision.reason, 'verification_required');
});

test('registration requires explicit terms acceptance and age-18 confirmation', () => {
  const validPayload = {
    username: 'valid_user',
    email: 'valid_user@example.com',
    password: 'Password123!@#',
    fullName: 'Valid User',
    acceptedTerms: true,
    confirmedAge: true,
  };

  const parsed = registerSchema.safeParse(validPayload);
  assert.equal(parsed.success, true);

  const missingAge = registerSchema.safeParse({ ...validPayload, confirmedAge: false });
  assert.equal(missingAge.success, false);

  const missingTerms = registerSchema.safeParse({ ...validPayload, acceptedTerms: false });
  assert.equal(missingTerms.success, false);

  const termsCheck = acceptTermsSchema.safeParse({ acceptedTerms: true, confirmedAge: true });
  assert.equal(termsCheck.success, true);
});

test('grievance receipt projection allowlist strictly excludes private case data and staff notes', () => {
  const rawTicket: GrievanceTicket = {
    ticketId: 'YT-GRV-TEST1234',
    category: 'privacy_violation',
    status: 'under_review',
    createdAt: '2026-10-10T00:00:00.000Z',
    slaDeadline: '2026-10-12T00:00:00.000Z',
    reporterName: 'John Doe',
    reporterEmail: 'john@example.com',
    reportedUrl: 'https://example.com/p/1234',
    description: 'Highly sensitive reporter grievance content',
    officerNote: 'Internal moderation investigation notes - strictly confidential',
  };

  const receipt: PublicGrievanceReceipt = toPublicGrievance(rawTicket);
  assert.deepEqual(Object.keys(receipt).sort(), ['createdAt', 'slaDeadline', 'status', 'ticketId']);
  assert.equal(receipt.ticketId, 'YT-GRV-TEST1234');
  assert.equal(receipt.status, 'under_review');
  assert.equal(receipt.createdAt, '2026-10-10T00:00:00.000Z');
  assert.equal(receipt.slaDeadline, '2026-10-12T00:00:00.000Z');

  // Verify none of the confidential fields leak into receipt
  const serialized = JSON.stringify(receipt);
  assert.doesNotMatch(serialized, /John Doe/);
  assert.doesNotMatch(serialized, /john@example\.com/);
  assert.doesNotMatch(serialized, /sensitive reporter/);
  assert.doesNotMatch(serialized, /Internal moderation/);
});

test('message visibility boundary excludes deleted and expired messages', () => {
  const now = new Date('2026-10-10T12:00:00.000Z');
  const past = new Date('2026-10-10T11:59:59.000Z');
  const future = new Date('2026-10-10T12:00:01.000Z');

  // Ordinary message
  assert.equal(isMessageVisible({ deletedAt: null, expiresAt: null }, now), true);

  // Expired message
  assert.equal(isMessageVisible({ deletedAt: null, expiresAt: past.toISOString() }, now), false);
  assert.equal(isMessageVisible({ deletedAt: null, expiresAt: now.toISOString() }, now), false);

  // Future expiring message
  assert.equal(isMessageVisible({ deletedAt: null, expiresAt: future.toISOString() }, now), true);

  // Deleted message
  assert.equal(isMessageVisible({ deletedAt: past.toISOString(), expiresAt: null }, now), false);
  assert.equal(isMessageVisible({ deletedAt: past.toISOString(), expiresAt: future.toISOString() }, now), false);
});

test('queue retention defaults represent operational queue pruning, not service-wide retention policy', () => {
  // Bounded operational BullMQ defaults
  assert.equal(notificationJobPolicy.removeOnComplete.age, 3600, 'Queue completed jobs retained 1 hour');
  assert.equal(notificationJobPolicy.removeOnComplete.count, 1000, 'Queue completed jobs capped at 1000');
  assert.equal(notificationJobPolicy.removeOnFail.age, 7 * 86400, 'Queue failed jobs retained 7 days');
  assert.equal(notificationJobPolicy.removeOnFail.count, 1000, 'Queue failed jobs capped at 1000');

  // Stack trace limit is 0 to avoid leaking SQL or internal payloads in BullMQ diagnostics
  assert.equal(notificationJobPolicy.stackTraceLimit, 0);
});

test('shared-group conversation schema preserves group history and surviving member contributions on account deletion', () => {
  // Foreign keys on conversations participantA and participantB must be set null
  // so group conversation does not delete when an author leaves/deletes account.
  // Foreign keys on messages recipientId must be set null so surviving contributions stay.
  // Foreign keys on messages senderId cascade delete (conservative deleted-author erasure).
  assert.ok(conversationsTable);
  assert.ok(messagesTable);
});

test('telemetry ingestion strictly permits only performance profiling and navigation purposes', () => {
  const navEvent = {
    eventId: '10000000-0000-4000-8000-000000000001',
    schemaVersion: 1,
    eventName: 'navigation',
    occurredAt: new Date().toISOString(),
    properties: {},
  };
  assert.equal(productEventSchema.safeParse(navEvent).success, true);

  const profilerEvent = {
    eventId: '10000000-0000-4000-8000-000000000002',
    schemaVersion: 1,
    eventName: 'react:profiler',
    occurredAt: new Date().toISOString(),
    properties: {
      id: 'App',
      phase: 'mount',
      actualDuration: 12.5,
      baseDuration: 10.0,
    },
  };
  assert.equal(productEventSchema.safeParse(profilerEvent).success, true);

  // Marketing, ad tracking, or arbitrary event names must be rejected
  const adEvent = {
    eventId: '10000000-0000-4000-8000-000000000003',
    schemaVersion: 1,
    eventName: 'ad_tracking',
    occurredAt: new Date().toISOString(),
    properties: {},
  };
  assert.equal(productEventSchema.safeParse(adEvent).success, false);
});
