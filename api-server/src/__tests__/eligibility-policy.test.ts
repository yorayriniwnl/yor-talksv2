import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { ApprovedTerritoryPolicy, EligibilityFacts, Experience, GuardianAuthorization, ReleaseFlags, ThresholdAssertion } from '../eligibility/types.js';
import type { EligibilityRepository } from '../repositories/eligibility-repository.js';

const now = new Date('2026-10-07T00:00:00Z');
const before = '2026-10-01T00:00:00Z';
const after = '2026-11-01T00:00:00Z';
const allCapabilities = { social: true, publish: true, messaging: true, payments: true, seller: true,
  memberships: true, live: true, rtc: true, ai: true, analytics: false, profiling: false };
const allReleases: ReleaseFlags = { payments: true, seller: true, memberships: true, live: true, rtc: true, ai: true };
function policy(overrides: Partial<ApprovedTerritoryPolicy> = {}): ApprovedTerritoryPolicy {
  return { id: 'fixture-recipient', scope: 'recipient', territory: 'ZZ', version: 'fixture-1', approved: true,
    synthetic: true, approvalReference: 'synthetic-policy-approval', effectiveFrom: before, reviewExpiresAt: after,
    sources: ['https://legal.example/fixture'], allowedExperiences: ['under_13','teen_13_17','adult_18_plus'],
    minimumAccessThreshold: null, independentConsentThreshold: 13, guardianRequiredBelow: null,
    requiredGuardianPurposes: ['account_activation'], guardianNoticeVersions: { account_activation: 'notice-1' },
    currentTermsVersion: 'terms-1', guardianContactsRequired: true,
    publicBrowsingAllowed: true, maximumContentRating: 'mature', capabilities: { ...allCapabilities }, ...overrides };
}
function policies() { return [policy(), policy({ id: 'fixture-operator', scope: 'operator', territory: 'EE' })]; }
function facts(experience: Experience = 'adult_18_plus', thresholds?: ThresholdAssertion[]): EligibilityFacts {
  return { account: { id: 'fixture-account', status: 'active', termsVersion: 'terms-1', termsAcceptedAt: before, contentPreference: 'mature' },
    revision: '1', currentTermsVersion: 'terms-1', releaseFlags: { ...allReleases },
    territoryContext: { declaredTerritory: 'ZZ', verifiedTerritory: 'ZZ', operatorPolicyIds: ['fixture-operator'] },
    assessment: { id: 'fixture-proof', userId: 'fixture-account', status: 'verified', issuer: 'isolated-fixture', method: 'synthetic',
      experience, thresholds: thresholds ?? [{ age: 13, atLeast: experience !== 'under_13' }, { age: 18, atLeast: experience === 'adult_18_plus' }],
      territory: 'ZZ', policyVersions: { 'fixture-recipient': 'fixture-1', 'fixture-operator': 'fixture-1' },
      verifiedAt: before, expiresAt: after, evidenceReference: 'opaque-private-evidence' }, guardianAuthorizations: [] };
}
function guardian(value: EligibilityFacts, overrides: Partial<GuardianAuthorization> = {}): GuardianAuthorization {
  return { id: 'fixture-guardian-grant', userId: value.account.id, guardianUserId: 'fixture-parent-account',
    guardianReference: 'private-parent-reference', issuer: 'isolated-fixture', responsibilityReference: 'private-responsibility-reference',
    status: 'granted', subjectRevision: '1', purposes: ['account_activation'], noticeVersions: { account_activation: 'notice-1' },
    policyVersions: { 'fixture-recipient': 'fixture-1', 'fixture-operator': 'fixture-1' },
    verifiedAt: before, grantedAt: before, expiresAt: after, withdrawnAt: null, ...overrides } as GuardianAuthorization;
}
async function evaluate(value: EligibilityFacts | undefined, registry = policies(), boundary = now) {
  return (await import('../eligibility/policy.js')).evaluateEligibility(value, registry, boundary);
}

test('verified bands receive their ceiling; child activation needs verified specific guardian authority', async () => {
  const adult = await evaluate(facts());
  assert.equal(adult.activated, true); assert.equal(adult.maximumContentRating, 'mature'); assert.equal(adult.capabilities.payments, true);
  const teen = await evaluate(facts('teen_13_17'));
  assert.equal(teen.activated, true); assert.equal(teen.maximumContentRating, 'regular');
  for (const feature of ['payments','seller','memberships','live','rtc','ai','analytics','profiling'] as const) assert.equal(teen.capabilities[feature], false);
  const child = facts('under_13');
  assert.equal((await evaluate(child)).reason, 'guardian_required');
  child.guardianAuthorizations = [guardian(child)];
  const enabled = await evaluate(child);
  assert.equal(enabled.activated, true); assert.equal(enabled.maximumContentRating, 'child_safe');
  assert.equal(enabled.capabilities.payments, false);
});

test('unknown, missing, expired, future, revoked or rejected proof cannot activate from old checkboxes', async () => {
  assert.equal((await evaluate(undefined)).activated, false);
  for (const status of ['pending','expired','revoked','rejected'] as const) {
    const value = facts(); value.assessment!.status = status;
    assert.equal((await evaluate(value)).activated, false);
  }
  for (const patch of [{ experience: 'unknown' as const }, { expiresAt: now.toISOString() }, { verifiedAt: after },
    { expiresAt: 'invalid' }, { evidenceReference: null }, { issuer: '' }]) {
    const value = facts(); Object.assign(value.assessment!, patch);
    const denied = await evaluate(value); assert.equal(denied.activated, false); assert.equal(denied.maximumContentRating, 'child_safe');
  }
  const missing = facts(); delete missing.assessment;
  assert.equal((await evaluate(missing)).reason, 'verification_required');
});

test('contradictory, duplicate, unrecognised, malformed or incomplete thresholds fail closed', async () => {
  const invalid = [
    [{ age: 13, atLeast: false }, { age: 18, atLeast: true }],
    [{ age: 13, atLeast: true }, { age: 18, atLeast: false }],
    [{ age: 18, atLeast: true }, { age: 18, atLeast: true }],
    [{ age: 12, atLeast: true }, { age: 18, atLeast: true }],
    [{ age: 18, atLeast: 'true' }], [],
  ];
  for (const assertions of invalid) assert.equal((await evaluate(facts('adult_18_plus', assertions as ThresholdAssertion[]))).activated, false);
  assert.equal((await evaluate(facts('teen_13_17', [{ age: 13, atLeast: true }, { age: 18, atLeast: true }]))).activated, false);
  assert.equal((await evaluate(facts('under_13', [{ age: 13, atLeast: true }, { age: 18, atLeast: false }]))).activated, false);
  const monotonic = facts('teen_13_17'); monotonic.assessment!.thresholds.push({ age: 15, atLeast: false }, { age: 16, atLeast: true });
  assert.equal((await evaluate(monotonic)).activated, false);
});

test('a teen band cannot bypass a separate 16-plus prohibition, including with guardian approval', async () => {
  const registry = policies(); registry[0].minimumAccessThreshold = 16;
  const teen = facts('teen_13_17'); teen.guardianAuthorizations = [guardian(teen)];
  assert.equal((await evaluate(teen, registry)).activated, false);
  teen.assessment!.thresholds.push({ age: 16, atLeast: false });
  assert.equal((await evaluate(teen, registry)).activated, false);
  teen.assessment!.thresholds = teen.assessment!.thresholds.filter(assertion => assertion.age !== 16);
  teen.assessment!.thresholds.push({ age: 16, atLeast: true });
  assert.equal((await evaluate(teen, registry)).activated, true);
  const prohibited = facts('under_13'); prohibited.guardianAuthorizations = [guardian(prohibited)];
  assert.equal((await evaluate(prohibited, registry)).activated, false);
});

test('guardian requirements support purpose, notice, responsibility, age-17 thresholds and withdrawal', async () => {
  const registry = policies(); registry[0].independentConsentThreshold = 16; registry[0].guardianRequiredBelow = 17;
  const teen = facts('teen_13_17'); teen.assessment!.thresholds.push({ age: 16, atLeast: true });
  assert.equal((await evaluate(teen, registry)).reason, 'guardian_required');
  teen.guardianAuthorizations = [guardian(teen)]; assert.equal((await evaluate(teen, registry)).activated, true);
  for (const patch of [{ status: 'withdrawn', withdrawnAt: before }, { expiresAt: now.toISOString() }, { responsibilityReference: '' },
    { purposes: ['social_contact'] }, { noticeVersions: { account_activation: 'old' } },
    { policyVersions: { 'fixture-recipient': 'old' } }, { userId: 'different-child' }]) {
    teen.guardianAuthorizations = [guardian(teen, patch as Partial<GuardianAuthorization>)];
    assert.equal((await evaluate(teen, registry)).activated, false);
  }
  teen.guardianAuthorizations = []; teen.assessment!.thresholds.push({ age: 17, atLeast: true });
  assert.equal((await evaluate(teen, registry)).activated, true);
});

test('specific purposes can be granted separately and latest withdrawal beats an older permissive grant', async () => {
  const child = facts('under_13'); const registry = policies();
  registry[0].requiredGuardianPurposes.push('account_collection'); registry[0].guardianNoticeVersions.account_collection = 'collection-1';
  child.guardianAuthorizations = [guardian(child), guardian(child, { id: 'collection-grant', subjectRevision: '2',
    purposes: ['account_collection'], noticeVersions: { account_collection: 'collection-1' } })];
  assert.equal((await evaluate(child,registry)).activated, true);
  child.guardianAuthorizations.push(guardian(child, { id: 'latest-withdrawal', subjectRevision: '3', status: 'withdrawn', withdrawnAt: before }));
  assert.equal((await evaluate(child,registry)).activated, false);
  child.guardianAuthorizations.push(guardian(child, { id: 'fresh-verified-approval', subjectRevision: '4' }));
  assert.equal((await evaluate(child,registry)).activated, true);
});

test('latest guardian withdrawal cannot fall back to a retained older approval', async () => {
  const child = facts('under_13');
  child.guardianAuthorizations = [guardian(child), guardian(child, {
    id: 'newer-withdrawal', subjectRevision: '2', status: 'withdrawn', withdrawnAt: before,
  })];
  assert.equal((await evaluate(child)).activated, false);
});

test('all resolved operator and recipient policies apply; stale or conflicting territory evidence denies', async () => {
  assert.equal((await evaluate(facts(), [])).activated, false);
  assert.equal((await evaluate(facts(), [policies()[0]])).activated, false);
  for (const patch of [{ approved: false }, { reviewExpiresAt: now.toISOString() }, { effectiveFrom: after },
    { allowedExperiences: ['teen_13_17'] }, { version: 'changed' }, { territory: 'AA' }]) {
    const registry = policies(); Object.assign(registry[0], patch);
    assert.equal((await evaluate(facts(), registry)).activated, false);
  }
  const registry = policies(); registry[1].capabilities.payments = false;
  const decision = await evaluate(facts(), registry); assert.equal(decision.activated, true); assert.equal(decision.capabilities.payments, false);
  for (const context of [{ declaredTerritory: 'AA' }, { verifiedTerritory: 'AA' }, { conflicts: true }, { operatorPolicyIds: [] }]) {
    const value = facts(); Object.assign(value.territoryContext!, context); assert.equal((await evaluate(value)).activated, false);
  }
  const missing = facts(); delete missing.territoryContext;
  assert.equal((await evaluate(missing)).activated, false);
});

test('current terms and account restrictions stay independent of verified age; transition requires new proof', async () => {
  for (const patch of [{ status: 'suspended' }, { status: 'deactivated' }, { status: 'deleted' }, { termsVersion: 'old' }, { termsAcceptedAt: null }]) {
    const value = facts(); Object.assign(value.account, patch); assert.equal((await evaluate(value)).activated, false);
  }
  const changed = facts(); changed.currentTermsVersion = 'terms-2'; assert.equal((await evaluate(changed)).activated, false);
  const oldTeen = facts('teen_13_17'); oldTeen.assessment!.expiresAt = now.toISOString();
  assert.equal((await evaluate(oldTeen)).experience, 'unknown');
  oldTeen.assessment = facts().assessment; assert.equal((await evaluate(oldTeen)).experience, 'adult_18_plus');
});

test('adult preference and separate releases restrict access; optional analytics/profiling always stay off', async () => {
  for (const preference of ['child_safe','regular','mature'] as const) {
    const value = facts(); value.account.contentPreference = preference;
    assert.equal((await evaluate(value)).maximumContentRating, preference);
  }
  const value = facts(); delete value.releaseFlags;
  const decision = await evaluate(value);
  for (const feature of ['payments','seller','memberships','live','rtc','ai','analytics','profiling'] as const) assert.equal(decision.capabilities[feature], false);
  const denied = await evaluate(facts('unknown'));
  assert.ok(Object.values(denied.capabilities).every(enabled => !enabled)); assert.equal(denied.maximumContentRating, 'child_safe');
});

test('an approved territory can impose a stricter content ceiling on verified adults', async () => {
  const registry = policies(); Object.assign(registry[0], { maximumContentRating: 'child_safe' });
  const decision = await evaluate(facts(), registry);
  assert.equal(decision.activated,true); assert.equal(decision.maximumContentRating,'child_safe');
});

test('safe decisions expose no evidence/parent reference and registry withdrawal changes their revision', async () => {
  const value = facts('under_13'); value.guardianAuthorizations = [guardian(value)];
  const registry = policies(); const initial = await evaluate(value, registry);
  assert.doesNotMatch(JSON.stringify(initial), /opaque-private-evidence|private-parent|private-responsibility|isolated-fixture|fixture-parent-account/);
  assert.match(initial.revision, /^[a-f0-9]{64}$/);
  registry[0].approved = false; const withdrawn = await evaluate(value, registry);
  assert.equal(withdrawn.activated, false); assert.notEqual(withdrawn.revision, initial.revision);
});

test('production registry is empty and cannot accept synthetic or wildcard approvals', async () => {
  const { loadApprovedTerritoryPolicies, validateApprovedTerritoryPolicies } = await import('../eligibility/territory-policy.js');
  assert.deepEqual(loadApprovedTerritoryPolicies(), []);
  assert.throws(() => validateApprovedTerritoryPolicies(policies()), /synthetic/i);
  assert.equal(validateApprovedTerritoryPolicies(policies(), { allowSynthetic: true }).length, 2);
  assert.throws(() => validateApprovedTerritoryPolicies([policy({ territory: '*' })], { allowSynthetic: true }));
  assert.throws(() => validateApprovedTerritoryPolicies([policy({ approvalReference: '' })], { allowSynthetic: true }));
});

test('service reloads current database and registry state rather than caching authority or accepting beta bypass', async () => {
  const { EligibilityService } = await import('../services/eligibility-service.js');
  let current = facts(); let reads = 0; const registry = policies();
  const repo = { readFacts: async () => { reads++; return current; } } as unknown as EligibilityRepository;
  const service = new EligibilityService(repo, { policies: () => registry, operatorPolicyIds: ['fixture-operator'],
    currentTermsVersion: 'terms-1', releaseFlags: allReleases, clock: () => now });
  assert.equal((await service.decisionFor(current.account.id)).activated, true);
  current = { ...current, assessment: { ...current.assessment!, status: 'revoked' } };
  assert.equal((await service.decisionFor(current.account.id)).activated, false); assert.equal(reads, 2);
  await assert.rejects(() => service.requireCapability(current.account.id, 'messaging'), /capability unavailable/i);
  const publicDecision = await service.publicDecision({ declaredTerritory: 'ZZ', operatorPolicyIds: ['fixture-operator'] });
  assert.equal(publicDecision.maximumContentRating, 'child_safe'); assert.equal(publicDecision.capabilities.social, false);
  assert.equal(publicDecision.publicBrowsingAllowed, true);
  registry[0].publicBrowsingAllowed = false;
  assert.equal((await service.publicDecision({ declaredTerritory: 'ZZ', operatorPolicyIds: ['fixture-operator'] })).publicBrowsingAllowed, false);
});

test('service preserves conflicting trusted territory evidence rather than overriding it', async () => {
  const { EligibilityService } = await import('../services/eligibility-service.js');
  const value = facts(); value.territoryContext!.verifiedTerritory = 'AA';
  const repo = { readFacts: async () => value } as unknown as EligibilityRepository;
  const service = new EligibilityService(repo, { policies, operatorPolicyIds: ['fixture-operator'], currentTermsVersion: 'terms-1', clock: () => now });
  assert.equal((await service.decisionFor(value.account.id)).activated, false);
});
