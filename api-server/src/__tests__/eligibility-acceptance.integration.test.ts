import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { after, test } from 'node:test';
import { pool } from '@workspace/db';
import { env } from '../config/env.js';
import { evaluateEligibility } from '../eligibility/policy.js';
import { loadApprovedTerritoryPolicies, loadOperatorPolicyIds, validateApprovedTerritoryPolicies } from '../eligibility/territory-policy.js';
import type { EligibilityFacts } from '../eligibility/types.js';
import { AssuranceService } from '../services/assurance-service.js';
import { EligibilityService } from '../services/eligibility-service.js';
import { UserRepository } from '../repositories/user-repository.js';
import { toPublicGrievance } from '../utils/grievance-view.js';
import { FixtureAssuranceAdapter, fixturePolicies } from './assurance-fixtures.js';
import { createTestUser, createVerifiedAdultTestUser } from './test-helpers.js';

const projectRoot = path.resolve(import.meta.dirname, '../../..');
const fixtureUsers: string[] = [];
after(async () => { await pool.query('DELETE FROM users WHERE id=ANY($1::uuid[])', [fixtureUsers]); });
const acceptanceSuites = [
  { requirement: 1, path: 'Public grievance receipt and moderator access', files: ['api-server/src/__tests__/report-authorization.integration.test.ts'] },
  { requirement: 2, path: 'Deleted/expired exports and message previews', files: ['api-server/src/__tests__/account-integrity.test.ts', 'api-server/src/__tests__/message-preview.test.ts'] },
  { requirement: 3, path: 'Restricted login, exact routes, optional auth and sockets', files: ['api-server/src/__tests__/restricted-session.integration.test.ts', 'api-server/src/__tests__/socket-security.test.ts'] },
  { requirement: 4, path: 'Trusted experiences, callback binding/replay and outage', files: ['api-server/src/__tests__/assurance-service.test.ts', 'api-server/src/__tests__/eligibility-enrollment.integration.test.ts'] },
  { requirement: 5, path: 'Purpose-specific guardian authority and withdrawal', files: ['api-server/src/__tests__/contact-eligibility.integration.test.ts', 'api-server/src/__tests__/eligibility-repository.integration.test.ts'] },
  { requirement: 6, path: 'Content and protected-media ceilings', files: ['api-server/src/__tests__/eligibility-content.integration.test.ts', 'api-server/src/__tests__/eligibility-media.integration.test.ts'] },
  { requirement: 7, path: 'Contacts, groups, feature limits and revocation', files: ['api-server/src/__tests__/eligibility-features.integration.test.ts', 'api-server/src/__tests__/group-eligibility.integration.test.ts'] },
  { requirement: 8, path: 'Private evidence and owner-safe status', files: ['api-server/src/__tests__/eligibility-http.integration.test.ts', 'api-server/src/__tests__/user-view.test.ts'] },
  { requirement: 9, path: 'Legacy migration and production configuration', files: ['api-server/src/__tests__/eligibility-repository.integration.test.ts', 'api-server/src/__tests__/eligibility-policy.test.ts', 'api-server/src/__tests__/env-config.test.ts'] },
  { requirement: 10, path: 'Real integration, browser and client checks', files: ['api-server/src/__tests__/eligibility-http.integration.test.ts', 'e2e/core-social.spec.ts', 'tests/client-session.test.mjs'] },
] as const;

function verifiedAdultFacts(): EligibilityFacts {
  return {
    account: { id: '00000000-0000-4000-8000-000000000001', status: 'active', termsVersion: 'terms-1',
      termsAcceptedAt: '2026-01-01T00:00:00.000Z', contentPreference: 'mature' },
    revision: '1', currentTermsVersion: 'terms-1',
    territoryContext: { declaredTerritory: 'ZZ', verifiedTerritory: 'ZZ', operatorPolicyIds: ['fixture-operator'] },
    releaseFlags: { payments: true, seller: true, memberships: true, live: true, rtc: true, ai: true },
    assessment: { userId: '00000000-0000-4000-8000-000000000001', id: 'fixture-proof', status: 'verified',
      issuer: 'isolated-fixture', method: 'synthetic', experience: 'adult_18_plus',
      thresholds: [{ age: 13, atLeast: true }, { age: 18, atLeast: true }], territory: 'ZZ',
      policyVersions: { 'fixture-recipient': 'fixture-1', 'fixture-operator': 'fixture-1' },
      verifiedAt: '2026-01-01T00:00:00.000Z', expiresAt: '2027-01-01T00:00:00.000Z', evidenceReference: 'private-fixture-evidence' },
    guardianAuthorizations: [],
  };
}

test('the ten design acceptance requirements remain linked to executable authoritative suites', () => {
  assert.deepEqual(acceptanceSuites.map(item => item.requirement), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  for (const item of acceptanceSuites) {
    for (const file of item.files) {
      const source = readFileSync(path.resolve(projectRoot, file), 'utf8');
      assert.match(source, /\btest\s*\(/, `Acceptance requirement ${item.requirement} must point to a test suite: ${file}`);
    }
  }
});

test('public grievance projection allows only the approved receipt fields', () => {
  const privateTicket = {
    ticketId: 'YT-GRV-849201ABCD', status: 'received', createdAt: '2026-10-14T00:00:00.000Z',
    slaDeadline: '2026-10-29T00:00:00.000Z', reporterName: 'Private Parent', reporterEmail: 'private@example.test',
    reportedUrl: 'https://example.test/private', description: 'private complaint details', officerNote: 'internal moderation note',
  } as Parameters<typeof toPublicGrievance>[0];
  const receipt = toPublicGrievance(privateTicket);
  assert.deepEqual(Object.keys(receipt).sort(), ['createdAt', 'slaDeadline', 'status', 'ticketId']);
  assert.doesNotMatch(JSON.stringify(receipt), /Private Parent|private@example|private complaint|internal moderation/);
});

test('empty production policy and operator registries keep even a valid-looking proof inactive', () => {
  assert.deepEqual(loadApprovedTerritoryPolicies(), []);
  assert.deepEqual(loadOperatorPolicyIds(), []);
  const decision = evaluateEligibility(verifiedAdultFacts(), loadApprovedTerritoryPolicies(), new Date('2026-10-14T00:00:00.000Z'));
  assert.equal(decision.activated, false);
  assert.equal(decision.experience, 'unknown');
  assert.equal(decision.maximumContentRating, 'child_safe');
  assert.ok(Object.values(decision.capabilities).every(enabled => !enabled));
});

test('synthetic authority is accepted only when an isolated test explicitly injects it', () => {
  const synthetic = fixturePolicies();
  assert.throws(() => validateApprovedTerritoryPolicies(synthetic), /synthetic/i);
  assert.equal(validateApprovedTerritoryPolicies(synthetic, { allowSynthetic: true }).length, 2);

  const originalEnvironment = env.NODE_ENV;
  try {
    env.NODE_ENV = 'production';
    assert.throws(() => new AssuranceService(undefined, new FixtureAssuranceAdapter()), /unavailable/i);
  } finally {
    env.NODE_ENV = originalEnvironment;
  }
});

test('new test users stay unknown unless the test explicitly grants synthetic adult authority', async () => {
  const users = new UserRepository();
  const unknown = await createTestUser(users);
  fixtureUsers.push(unknown.id);
  assert.equal((await new EligibilityService().decisionFor(unknown.id)).activated, false);

  const verified = await createVerifiedAdultTestUser(users);
  fixtureUsers.push(verified.id);
  const decision = await new EligibilityService().decisionFor(verified.id);
  assert.equal(decision.experience, 'adult_18_plus');
  assert.equal(decision.activated, true);
  assert.equal(decision.capabilities.social, true);
  assert.equal(decision.capabilities.profiling, false);
});
