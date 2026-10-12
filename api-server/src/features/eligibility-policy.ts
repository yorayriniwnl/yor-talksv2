import type { ContentRating } from '../utils/content-safety.js';

export type Experience = 'unknown' | 'under_13' | 'teen_13_17' | 'adult_18_plus';
export type EligibilityCapability = 'social' | 'messages' | 'commerce' | 'live' | 'rtc' | 'ai' | 'analytics' | 'profiling';
export interface TerritoryPolicy {
  country: string;
  version: string;
  minimumAccessAge: number;
  independentConsentAge: number;
  expiresAt: string;
  approvedAt: string;
  approvalReference: string;
  allowedExperiences: Exclude<Experience, 'unknown'>[];
  capabilities: EligibilityCapability[];
  guardianRequiredForTeenAdultContact: boolean;
  sources: string[];
}
export interface EligibilityAssessment {
  id: string;
  userId: string;
  status: 'pending' | 'verified' | 'expired' | 'revoked' | 'rejected';
  issuer: string;
  policyVersion: string;
  country: string;
  thresholds: Record<string, boolean>;
  verifiedAt: string | null;
  expiresAt: string;
  evidenceReference: string | null;
}
export interface GuardianAuthorization {
  id: string;
  childId: string;
  guardianId: string;
  status: 'pending' | 'verified' | 'withdrawn' | 'revoked' | 'rejected';
  parentalResponsibilityVerified: boolean;
  purposes: string[];
  policyVersion: string;
  noticeVersion: string;
  expiresAt: string;
}
export interface EligibilityDecision {
  active: boolean;
  experience: Experience;
  maximumContentRating: ContentRating;
  capabilities: Record<EligibilityCapability, boolean>;
  policyVersion: string | null;
  reason: 'verified' | 'account_restricted' | 'terms_required' | 'verification_required' | 'verification_expired' | 'territory_unavailable' | 'policy_changed' | 'age_unavailable' | 'guardian_required';
}
const capabilityNames: EligibilityCapability[] = ['social', 'messages', 'commerce', 'live', 'rtc', 'ai', 'analytics', 'profiling'];
export function deniedEligibility(reason: EligibilityDecision['reason']): EligibilityDecision {
  return { active: false, experience: 'unknown', maximumContentRating: 'child_safe',
    capabilities: Object.fromEntries(capabilityNames.map(name => [name, false])) as EligibilityDecision['capabilities'],
    policyVersion: null, reason };
}
export function validThresholds(thresholds: Record<string, boolean>): boolean {
  const ordered = Object.entries(thresholds).sort(([a], [b]) => Number(a) - Number(b));
  if (!ordered.length || ordered.some(([age, value]) => !/^\d{1,2}$/.test(age) || Number(age) < 1 || typeof value !== 'boolean')) return false;
  let belowThreshold = false;
  for (const [, reached] of ordered) {
    if (belowThreshold && reached) return false;
    if (!reached) belowThreshold = true;
  }
  return Object.hasOwn(thresholds, '13') && Object.hasOwn(thresholds, '18');
}

/** Only private, server-verified assessments and approved territory policy grant capability. */
export function decideEligibility(input: {
  userId: string; accountStatus?: string | null; currentTerms: boolean;
  assessment?: EligibilityAssessment; policy?: TerritoryPolicy;
  authorizations: GuardianAuthorization[]; termsVersion: string; now?: number;
}): EligibilityDecision {
  const now = input.now ?? Date.now();
  if (!['active', null, undefined].includes(input.accountStatus)) return deniedEligibility('account_restricted');
  if (!input.currentTerms) return deniedEligibility('terms_required');
  const a = input.assessment, p = input.policy;
  if (!a || a.userId !== input.userId || a.status !== 'verified' || !a.verifiedAt || !validThresholds(a.thresholds)) return deniedEligibility('verification_required');
  if (!Number.isFinite(Date.parse(a.expiresAt)) || Date.parse(a.expiresAt) <= now || Date.parse(a.verifiedAt) > now) return deniedEligibility('verification_expired');
  if (!p || p.country !== a.country || !p.approvalReference || !Number.isFinite(Date.parse(p.approvedAt)) || Date.parse(p.approvedAt) > now || !Number.isFinite(Date.parse(p.expiresAt)) || Date.parse(p.expiresAt) <= now) return deniedEligibility('territory_unavailable');
  if (p.version !== a.policyVersion) return deniedEligibility('policy_changed');
  const experience = a.thresholds['18'] ? 'adult_18_plus' : a.thresholds['13'] ? 'teen_13_17' : 'under_13';
  if (!p.allowedExperiences.includes(experience) || (p.minimumAccessAge > 0 && a.thresholds[String(p.minimumAccessAge)] !== true)) return deniedEligibility('age_unavailable');
  if (a.thresholds[String(p.independentConsentAge)] !== true && !input.authorizations.some(g =>
    g.childId === input.userId && g.status === 'verified' && g.parentalResponsibilityVerified &&
    g.purposes.includes('social_activation') && g.policyVersion === p.version &&
    g.noticeVersion === input.termsVersion && Date.parse(g.expiresAt) > now)) return deniedEligibility('guardian_required');
  const adult = experience === 'adult_18_plus';
  const capabilities = Object.fromEntries(capabilityNames.map(name => [name,
    p.capabilities.includes(name) && (['social', 'messages'].includes(name) || adult) && !['analytics', 'profiling'].includes(name),
  ])) as EligibilityDecision['capabilities'];
  // Purpose consent is a separate authority; age alone never activates optional collection.
  return { active: capabilities.social, experience, maximumContentRating: adult ? 'mature' : experience === 'teen_13_17' ? 'regular' : 'child_safe',
    capabilities, policyVersion: p.version, reason: 'verified' };
}

/** Exact method/path allowlist for identity-only sessions; prefixes never grant authority. */
export function restrictedSessionAllowed(method: string, originalUrl: string): boolean {
  let path: string;
  try { path = decodeURIComponent(originalUrl.split('?')[0]); } catch { return false; }
  if (path.includes('\\') || path.includes('//') || /\/(?:\.|\.\.)\//.test(path)) return false;
  path = path.replace(/^\/api(?:\/v1)?(?=\/|$)/, '') || '/';
  const exact: Record<string, string[]> = {
    '/users/me': ['GET', 'DELETE'], '/users/me/consent': ['POST'], '/users/me/export': ['GET'],
    '/users/me/eligibility': ['GET'], '/users/me/eligibility/challenges': ['POST'],
    '/users/me/guardian-authorizations': ['GET', 'POST'], '/auth/verify-email/resend': ['POST'],
    '/auth/2fa/setup': ['POST'], '/auth/2fa/confirm': ['POST'], '/auth/2fa/disable': ['POST'],
    '/auth/2fa/challenges': ['GET'], '/auth/logout': ['POST'], '/auth/logout-all': ['POST'],
  };
  if (Object.hasOwn(exact, path) && exact[path].includes(method)) return true;
  const id = '[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}';
  return (method === 'GET' && new RegExp(`^/users/me/eligibility/challenges/${id}$`, 'i').test(path)) ||
    (method === 'POST' && new RegExp(`^/users/me/guardian-authorizations/${id}/withdraw$`, 'i').test(path)) ||
    (method === 'POST' && new RegExp(`^/auth/2fa/challenges/${id}/(?:approve|deny)$`, 'i').test(path));
}
