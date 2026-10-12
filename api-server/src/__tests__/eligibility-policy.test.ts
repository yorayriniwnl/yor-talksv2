import assert from 'node:assert/strict';
import { test } from 'node:test';
import { decideEligibility, restrictedSessionAllowed, validThresholds, type EligibilityAssessment,
  type GuardianAuthorization, type TerritoryPolicy } from '../features/eligibility-policy.js';

const now = Date.parse('2026-10-07T12:00:00Z');
const policy: TerritoryPolicy = { country: 'XX', version: 'synthetic-policy-1', minimumAccessAge: 0,
  independentConsentAge: 16, approvedAt: '2026-10-01T00:00:00Z', expiresAt: '2027-01-01T00:00:00Z',
  approvalReference: 'isolated-test-only', allowedExperiences: ['under_13', 'teen_13_17', 'adult_18_plus'],
  capabilities: ['social', 'messages', 'commerce', 'live', 'rtc', 'ai', 'analytics', 'profiling'],
  guardianRequiredForTeenAdultContact: true, sources: ['https://example.invalid/synthetic-policy'] };
const assessment: EligibilityAssessment = { id: 'assessment', userId: 'owner', status: 'verified',
  issuer: 'https://example.invalid/assurance', policyVersion: policy.version, country: policy.country,
  thresholds: { '13': true, '16': true, '18': true }, verifiedAt: '2026-10-06T12:00:00Z',
  expiresAt: '2026-11-01T00:00:00Z', evidenceReference: 'minimized-reference' };
const guardian: GuardianAuthorization = { id: 'authorization', childId: 'owner', guardianId: 'guardian', status: 'verified',
  parentalResponsibilityVerified: true, purposes: ['social_activation'], policyVersion: policy.version,
  noticeVersion: 'terms-1', expiresAt: '2026-11-01T00:00:00Z' };
const decide = (changes: Partial<Parameters<typeof decideEligibility>[0]> = {}) => decideEligibility({
  userId: 'owner', accountStatus: 'active', currentTerms: true, assessment, policy,
  authorizations: [], termsVersion: 'terms-1', now, ...changes,
});

test('verified adults receive eligible capabilities without granting optional analytics consent', () => {
  const result = decide(); assert.equal(result.active, true); assert.equal(result.experience, 'adult_18_plus');
  assert.equal(result.maximumContentRating, 'mature'); assert.equal(result.capabilities.commerce, true);
  assert.equal(result.capabilities.analytics, false); assert.equal(result.capabilities.profiling, false);
});
test('minors require current purpose-specific verified parental responsibility where policy requires it', () => {
  const child = { ...assessment, thresholds: { '13': false, '16': false, '18': false } };
  assert.equal(decide({ assessment: child }).reason, 'guardian_required');
  const result = decide({ assessment: child, authorizations: [guardian] });
  assert.equal(result.experience, 'under_13'); assert.equal(result.maximumContentRating, 'child_safe');
  for (const name of ['commerce', 'live', 'rtc', 'ai', 'analytics', 'profiling'] as const) assert.equal(result.capabilities[name], false);
  for (const bad of [{ status: 'withdrawn' as const }, { parentalResponsibilityVerified: false },
    { purposes: ['marketing'] }, { childId: 'other-child' }, { policyVersion: 'old' },
    { noticeVersion: 'old' }, { expiresAt: new Date(now).toISOString() }]) {
    assert.equal(decide({ assessment: child, authorizations: [{ ...guardian, ...bad }] }).reason, 'guardian_required');
  }
  const teen = { ...assessment, thresholds: { '13': true, '16': true, '18': false } };
  assert.equal(decide({ assessment: teen }).experience, 'teen_13_17');
  assert.equal(decide({ assessment: teen }).maximumContentRating, 'regular');
});
test('guardian approval cannot bypass prohibited territory ages or missing threshold evidence', () => {
  const teen = { ...assessment, thresholds: { '13': true, '16': false, '18': false } };
  assert.equal(decide({ assessment: teen, policy: { ...policy, minimumAccessAge: 16 }, authorizations: [guardian] }).reason, 'age_unavailable');
  assert.equal(decide({ assessment: teen, policy: { ...policy, minimumAccessAge: 15 }, authorizations: [guardian] }).reason, 'age_unavailable');
  assert.equal(decide({ policy: { ...policy, allowedExperiences: ['teen_13_17'] } }).reason, 'age_unavailable');
});
test('missing, revoked, expired, foreign and contradictory assessments remain restricted', () => {
  for (const a of [undefined, { ...assessment, userId: 'another' }, { ...assessment, status: 'revoked' as const },
    { ...assessment, thresholds: { '13': false, '18': true } }, { ...assessment, expiresAt: new Date(now).toISOString() },
    { ...assessment, verifiedAt: new Date(now + 1000).toISOString() }]) {
    const decision = decide({ assessment: a }); assert.equal(decision.active, false); assert.equal(decision.maximumContentRating, 'child_safe');
  }
  assert.equal(validThresholds({ '13': true, '16': false, '18': true }), false);
  assert.equal(validThresholds({ '13': true, '18': true, '-1': true }), false);
  assert.equal(decide({ accountStatus: 'suspended' }).reason, 'account_restricted');
  assert.equal(decide({ currentTerms: false }).reason, 'terms_required');
});
test('unapproved, expired or changed policies cannot activate existing proof', () => {
  for (const p of [undefined, { ...policy, approvalReference: '' }, { ...policy, approvedAt: 'not-a-date' },
    { ...policy, country: 'YY' }, { ...policy, expiresAt: new Date(now).toISOString() }, { ...policy, version: 'changed' }]) {
    assert.equal(decide({ policy: p }).active, false);
  }
});
test('restricted identity sessions use exact method/path rules across both API mounts', () => {
  for (const prefix of ['/api', '/api/v1']) {
    for (const [method, path] of [['GET', '/users/me'], ['GET', '/users/me/export'], ['DELETE', '/users/me'],
      ['POST', '/users/me/eligibility/challenges'], ['POST', '/auth/logout-all']]) assert.equal(restrictedSessionAllowed(method, prefix + path), true);
    for (const [method, path] of [['PUT', '/users/me'], ['GET', '/users/me/messages'], ['POST', '/users/me/export'],
      ['POST', '/users/me/eligibility/challenges/arbitrary'], ['POST', '/auth/logout-all/extra'],
      ['GET', '/users/me%2f..%2fmessages'], ['GET', '/users//me'], ['POST', '/auth/2fa/setup/evil']]) {
      assert.equal(restrictedSessionAllowed(method, prefix + path), false, `${method} ${prefix}${path}`);
    }
  }
});
