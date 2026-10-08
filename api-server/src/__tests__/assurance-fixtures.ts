import { randomUUID } from 'node:crypto';
import type { AssuranceAdapter, ProviderChallenge, VerifiedAssuranceEvent } from '../eligibility/assurance-adapter.js';
import type { ApprovedTerritoryPolicy } from '../eligibility/types.js';

/** Explicit test injection only. Tokens map to trusted fixture events, not JSON claims. */
export class FixtureAssuranceAdapter implements AssuranceAdapter {
  readonly kind = 'test_fixture' as const;
  readonly issuer = 'isolated-fixture';
  readonly audience = 'fixture-app';
  readonly redirectOrigins = ['https://assurance.example.test'];
  readonly starts: ProviderChallenge[] = [];
  readonly events = new Map<string, VerifiedAssuranceEvent>();
  async start(challenge: ProviderChallenge) {
    this.starts.push(challenge);
    return { redirectUrl: `https://assurance.example.test/start/${challenge.id}` };
  }
  async verifyCallback(body: Buffer) {
    const event = this.events.get(body.toString());
    if (!event) throw new Error('private-untrusted-callback-material');
    return event;
  }
  event(challenge = this.starts.at(-1)!): VerifiedAssuranceEvent {
    const subject = challenge.userId ? { userId: challenge.userId } : { enrollmentId: challenge.enrollmentId! };
    const common = { ...subject, issuer: this.issuer, audience: this.audience, eventId: randomUUID(), challengeId: challenge.id,
      nonce: challenge.nonce, purpose: challenge.purpose, policyVersions: challenge.policyVersions,
      verifiedAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 86_400_000).toISOString() };
    return challenge.purpose === 'age_assessment'
      ? { ...common, purpose: 'age_assessment', assessment: { method: 'synthetic', experience: 'adult_18_plus',
        thresholds: [{ age: 13, atLeast: true }, { age: 18, atLeast: true }], territory: challenge.territory!, evidenceReference: 'private-evidence-reference' } }
      : { ...common, purpose: 'guardian_authorization', guardian: { guardianUserId: null, guardianReference: 'private-parent-reference',
        responsibilityReference: 'private-responsibility-reference', purposes: challenge.requestedPurposes,
        noticeVersions: challenge.noticeVersions, grantedAt: new Date().toISOString() } };
  }
  callback(event = this.event()) {
    const token = randomUUID(); this.events.set(token, event); return Buffer.from(token);
  }
}
export function fixturePolicies(): ApprovedTerritoryPolicy[] {
  const policy: ApprovedTerritoryPolicy = { id: 'fixture-recipient', scope: 'recipient', territory: 'ZZ', version: 'fixture-1', approved: true,
    synthetic: true, approvalReference: 'synthetic-policy-approval', effectiveFrom: '2026-01-01T00:00:00Z', reviewExpiresAt: '2027-01-01T00:00:00Z',
    sources: ['https://legal.example/fixture'], allowedExperiences: ['under_13','teen_13_17','adult_18_plus'], minimumAccessThreshold: null,
    independentConsentThreshold: 13, guardianRequiredBelow: null, requiredGuardianPurposes: ['account_activation'],
    guardianNoticeVersions: { account_activation: 'notice-1' }, currentTermsVersion: 'terms-1', guardianContactsRequired: true,
    publicBrowsingAllowed: true, maximumContentRating: 'mature', capabilities: { social: true, publish: true, messaging: true,
      payments: false, seller: false, memberships: false, live: false, rtc: false, ai: false, analytics: false, profiling: false } };
  return [policy, { ...policy, id: 'fixture-operator', scope: 'operator', territory: 'EE' }];
}
