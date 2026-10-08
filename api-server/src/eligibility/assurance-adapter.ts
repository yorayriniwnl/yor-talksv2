import type { PrivateAssuranceChallenge, EligibilitySubject, PolicyVersions, ThresholdAssertion, Experience, AuthorizationPurpose } from './types.js';

export class AssuranceUnavailableError extends Error {
  readonly code = 'verification_provider_unavailable';
  constructor() { super('Verification provider unavailable'); }
}
/** Ephemeral nonce goes only to the selected adapter; storage keeps its digest. */
export type ProviderChallenge = PrivateAssuranceChallenge & { nonce: string };
type EventBase = EligibilitySubject & { issuer: string; audience: string; eventId: string; challengeId: string; nonce: string;
  policyVersions: PolicyVersions; verifiedAt: string; expiresAt: string };
export type VerifiedAssuranceEvent = EventBase & (
  { purpose: 'age_assessment'; assessment: { method: string; experience: Exclude<Experience,'unknown'>;
    thresholds: ThresholdAssertion[]; territory: string; evidenceReference: string } }
  | { purpose: 'guardian_authorization'; guardian: { guardianUserId: string | null; guardianReference: string;
    responsibilityReference: string; purposes: AuthorizationPurpose[]; noticeVersions: Record<string,string>; grantedAt: string } }
);
export interface AssuranceAdapter {
  readonly kind: 'unavailable' | 'approved_provider' | 'test_fixture';
  readonly issuer: string; readonly audience: string; readonly redirectOrigins: readonly string[];
  start(challenge: ProviderChallenge): Promise<{ redirectUrl: string }>;
  /** A future approved adapter owns its actual provider-specific authenticity protocol. */
  verifyCallback(rawBody: Buffer, headers: Record<string,unknown>): Promise<VerifiedAssuranceEvent>;
}
export class UnavailableAssuranceAdapter implements AssuranceAdapter {
  readonly kind = 'unavailable' as const;
  readonly issuer = 'unavailable'; readonly audience = 'unavailable'; readonly redirectOrigins: string[] = [];
  async start(_challenge: ProviderChallenge): Promise<{ redirectUrl: string }> { throw new AssuranceUnavailableError(); }
  async verifyCallback(_body: Buffer,_headers: Record<string,unknown>): Promise<VerifiedAssuranceEvent> { throw new AssuranceUnavailableError(); }
}
