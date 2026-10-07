import type { ContentRating } from '../utils/content-safety.js';

export type Experience = 'unknown' | 'under_13' | 'teen_13_17' | 'adult_18_plus';
export type AssessmentStatus = 'pending' | 'verified' | 'expired' | 'revoked' | 'rejected';
export type AuthorizationPurpose = 'account_collection' | 'account_activation' | 'social_contact';
export type AssurancePurpose = 'age_assessment' | 'guardian_authorization';
export type EligibilitySubject = { userId: string; enrollmentId?: never } | { enrollmentId: string; userId?: never };
export type PolicyVersions = Record<string, string>;
export interface ThresholdAssertion { age: 13 | 14 | 15 | 16 | 17 | 18; atLeast: boolean }

/** Server-private assurance record. Never add these fields to UserRecord. */
export type EligibilityAssessment = EligibilitySubject & {
  id: string; status: AssessmentStatus; issuer: string; method: string; experience: Experience;
  thresholds: ThresholdAssertion[]; territory: string; policyVersions: PolicyVersions;
  verifiedAt: string | null; expiresAt: string; evidenceReference: string | null;
};
export type GuardianAuthorization = EligibilitySubject & {
  id: string; guardianUserId: string | null; guardianReference: string; issuer: string;
  responsibilityReference: string; status: 'granted' | 'withdrawn' | 'revoked';
  purposes: AuthorizationPurpose[]; noticeVersions: Record<string, string>; policyVersions: PolicyVersions;
  verifiedAt: string; grantedAt: string; expiresAt: string; withdrawnAt: string | null;
};
export type PrivateAssuranceChallenge = EligibilitySubject & {
  id: string; issuer: string; audience: string; purpose: AssurancePurpose; nonceHash: string;
  subjectRevision: string; policyVersions: PolicyVersions; noticeVersions: Record<string, string>;
  requestedPurposes: AuthorizationPurpose[]; expiresAt: string;
};
export type ChallengeConsumption = EligibilitySubject & {
  challengeId: string; issuer: string; audience: string; purpose: AssurancePurpose;
  nonceHash: string; eventId: string; subjectRevision: string;
};
export interface EligibilityFacts {
  account: { id: string; status: string; termsVersion: string | null; termsAcceptedAt: string | null; contentPreference: ContentRating };
  revision: string;
  assessment?: EligibilityAssessment;
  guardianAuthorizations: GuardianAuthorization[];
}
