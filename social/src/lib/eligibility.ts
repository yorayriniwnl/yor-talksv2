import { api } from '@/lib/api-client';

const capabilities = ['social', 'messages', 'commerce', 'live', 'rtc', 'ai', 'analytics', 'profiling'] as const;
export type EligibilityStatus = {
  active: boolean;
  experience: 'unknown' | 'under_13' | 'teen_13_17' | 'adult_18_plus';
  maximumContentRating: 'child_safe' | 'regular' | 'mature';
  capabilities: Record<typeof capabilities[number], boolean>;
  policyVersion: string | null;
  reason: string;
  verificationAvailable: boolean;
  termsVersion: string;
};
export type EligibilityChallenge = { challengeId: string; verificationUrl: string; expiresAt: string };
export type EligibilityChallengeStatus = { challengeId: string; status: 'pending' | 'consumed' | 'rejected' | 'expired'; expiresAt: string };
export type GuardianAuthorization = { id: string; status: string; purposes: string[]; noticeVersion: string; expiresAt: string; role: 'child' | 'guardian'; childId?: string };

export function parseEligibilityStatus(value: unknown): EligibilityStatus {
  if (!value || typeof value !== 'object') throw new Error('Could not confirm account access. Please retry.');
  const item = value as EligibilityStatus;
  if (typeof item.active !== 'boolean' || !['unknown', 'under_13', 'teen_13_17', 'adult_18_plus'].includes(item.experience) ||
    !['child_safe', 'regular', 'mature'].includes(item.maximumContentRating) ||
    !item.capabilities || capabilities.some((key) => typeof item.capabilities[key] !== 'boolean') ||
    !(item.policyVersion === null || typeof item.policyVersion === 'string') || typeof item.reason !== 'string' ||
    typeof item.verificationAvailable !== 'boolean' || typeof item.termsVersion !== 'string' || !item.termsVersion.trim() ||
    (item.active && (item.reason !== 'verified' || item.experience === 'unknown'))) {
    throw new Error('Could not confirm account access. Please retry.');
  }
  return item;
}

export function hasSocialAccess(status: EligibilityStatus | null): boolean {
  return Boolean(status?.active && status.capabilities.social);
}

export const eligibilityApi = {
  getStatus: async () => parseEligibilityStatus(await api.request<unknown>('/users/me/eligibility')),
  startChallenge: async (country: string, guardianAuthorizationId?: string): Promise<EligibilityChallenge> => {
    const result = await api.request<EligibilityChallenge>('/users/me/eligibility/challenges', {
      method: 'POST', body: JSON.stringify({ country, ...(guardianAuthorizationId ? { guardianAuthorizationId } : {}) }),
    });
    const url = new URL(result.verificationUrl);
    if (url.protocol !== 'https:' || url.username || url.password || !result.challengeId || !Number.isFinite(Date.parse(result.expiresAt))) {
      throw new Error('The verification link is unavailable. Please retry.');
    }
    return result;
  },
  challengeStatus: (id: string) => api.request<EligibilityChallengeStatus>(`/users/me/eligibility/challenges/${encodeURIComponent(id)}`),
  listGuardians: () => api.request<GuardianAuthorization[]>('/users/me/guardian-authorizations'),
  requestGuardian: (guardianId: string) => api.request<GuardianAuthorization>('/users/me/guardian-authorizations', {
    method: 'POST', body: JSON.stringify({ guardianId }),
  }),
  withdrawGuardian: (id: string) => api.request<{ withdrawn: true }>(`/users/me/guardian-authorizations/${encodeURIComponent(id)}/withdraw`, { method: 'POST' }),
};
