import { readFileSync } from 'node:fs';
import { z } from 'zod';
import { env } from './env.js';
import type { TerritoryPolicy } from '../features/eligibility-policy.js';

const https = z.string().url().refine(value => {
  const u = new URL(value); return u.protocol === 'https:' && !u.username && !u.password;
});
const territory = z.object({
  country: z.string().regex(/^[A-Z]{2}$/), version: z.string().min(1).max(100),
  minimumAccessAge: z.number().int().min(0).max(99), independentConsentAge: z.number().int().min(13).max(18),
  approvedAt: z.string().datetime(), expiresAt: z.string().datetime(), approvalReference: z.string().min(1).max(200),
  allowedExperiences: z.array(z.enum(['under_13', 'teen_13_17', 'adult_18_plus'])).min(1),
  capabilities: z.array(z.enum(['social', 'messages', 'commerce', 'live', 'rtc', 'ai', 'analytics', 'profiling'])),
  guardianRequiredForTeenAdultContact: z.boolean(), sources: z.array(https).min(1),
}).strict();
const registry = z.object({
  operatorCountry: z.string().regex(/^[A-Z]{2}$/), operatorLegalEntity: z.string().min(2).max(200),
  synthetic: z.boolean().default(false), policies: z.array(territory).max(250),
}).strict().refine(value => new Set(value.policies.map(p => p.country)).size === value.policies.length, 'Duplicate territory policies');

export function eligibilityEnforced(): boolean {
  return env.NODE_ENV === 'production' || env.ELIGIBILITY_ENABLED;
}
export function readTerritoryPolicies(): TerritoryPolicy[] {
  const file = env.ELIGIBILITY_POLICY_FILE;
  if (!file) return [];
  // Unreadable or malformed policy fails closed; no permissive cached fallback.
  try {
    const bytes = readFileSync(file); if (bytes.length > 262144) return [];
    const parsed = registry.parse(JSON.parse(bytes.toString('utf8')));
    if (env.NODE_ENV === 'production' && (parsed.synthetic || !env.LEGAL_OPERATOR_NAME || parsed.operatorLegalEntity !== env.LEGAL_OPERATOR_NAME)) return [];
    return parsed.policies;
  } catch { return []; }
}
export function assuranceConfiguration() {
  const parsed = z.object({ issuer: https, challengeUrl: https, audience: z.string().min(1).max(200),
    secretFile: z.string().min(1) }).safeParse({ issuer: env.AGE_ASSURANCE_ISSUER,
    challengeUrl: env.AGE_ASSURANCE_CHALLENGE_URL, audience: env.AGE_ASSURANCE_AUDIENCE,
    secretFile: env.AGE_ASSURANCE_SECRET_FILE });
  if (!parsed.success) return undefined;
  try {
    const secret = readFileSync(parsed.data.secretFile, 'utf8').trim();
    if (secret.length < 32 || secret.length > 512 || secret === env.JWT_SECRET || secret === env.JWT_REFRESH_SECRET || secret === env.CONTACT_SHIELD_SECRET || secret === env.TOTP_ENCRYPTION_KEY) return undefined;
    return { ...parsed.data, secret };
  } catch { return undefined; }
}
