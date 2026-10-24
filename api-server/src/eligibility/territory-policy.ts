import { z } from 'zod';
import type { ApprovedTerritoryPolicy } from './types.js';

const threshold = z.union([z.literal(13),z.literal(14),z.literal(15),z.literal(16),z.literal(17),z.literal(18)]);
const purpose = z.enum(['account_collection','account_activation','social_contact']);
const versionMap = z.record(z.string(), z.string().min(1).max(128));
const instant = z.string().datetime({ offset: true });
const policySchema = z.object({
  id: z.string().min(1).max(128), scope: z.enum(['operator','recipient']), territory: z.string().regex(/^[A-Z]{2}$/),
  version: z.string().min(1).max(128), approved: z.boolean(), synthetic: z.boolean(),
  approvalReference: z.string().min(1).max(256), effectiveFrom: instant, reviewExpiresAt: instant,
  sources: z.array(z.string().url().refine(value => new URL(value).protocol === 'https:')).min(1).max(32),
  allowedExperiences: z.array(z.enum(['under_13','teen_13_17','adult_18_plus'])).min(1).max(3),
  minimumAccessThreshold: threshold.nullable(), independentConsentThreshold: threshold, guardianRequiredBelow: threshold.nullable(),
  requiredGuardianPurposes: z.array(purpose).min(1).max(3), guardianNoticeVersions: versionMap,
  currentTermsVersion: z.string().min(1).max(128), guardianContactsRequired: z.boolean(), publicBrowsingAllowed: z.boolean(),
  maximumContentRating: z.enum(['child_safe','regular','mature']),
  capabilities: z.object({ social: z.boolean(), publish: z.boolean(), messaging: z.boolean(), payments: z.boolean(),
    seller: z.boolean(), memberships: z.boolean(), live: z.boolean(), rtc: z.boolean(), ai: z.boolean(),
    analytics: z.literal(false), profiling: z.literal(false) }).strict(),
}).strict().superRefine((value, context) => {
  if (Date.parse(value.reviewExpiresAt) <= Date.parse(value.effectiveFrom)) context.addIssue({ code: 'custom', message: 'Policy review must follow effective date' });
  if (new Set(value.allowedExperiences).size !== value.allowedExperiences.length || new Set(value.requiredGuardianPurposes).size !== value.requiredGuardianPurposes.length)
    context.addIssue({ code: 'custom', message: 'Duplicate policy assertion' });
  if (value.requiredGuardianPurposes.some(item => !value.guardianNoticeVersions[item])) context.addIssue({ code: 'custom', message: 'Guardian purposes need direct notice versions' });
});

/** Schema validation establishes format, never legal approval by itself. */
export function validateApprovedTerritoryPolicies(input: unknown, options: { allowSynthetic?: boolean } = {}): ApprovedTerritoryPolicy[] {
  const values = z.array(policySchema).max(512).parse(input);
  if (!options.allowSynthetic && values.some(value => value.synthetic)) throw new Error('Synthetic policies cannot enter the approved production registry');
  if (new Set(values.map(value => value.id)).size !== values.length) throw new Error('Duplicate territory policy identity');
  return values;
}

// Add reviewed records only alongside actual operator/territory/provider approval.
// Environment flags, a checkbox or CI fixtures cannot populate this registry.
const approvedRegistry: ApprovedTerritoryPolicy[] = [];
const isolatedTestAuthorities = new Map<string, { policies: ApprovedTerritoryPolicy[]; operatorPolicyIds: string[] }>();
export function loadApprovedTerritoryPolicies(): ApprovedTerritoryPolicy[] {
  return validateApprovedTerritoryPolicies(approvedRegistry);
}

/** Operator applicability is unresolved until the actual establishment is approved. */
export function loadOperatorPolicyIds(): string[] { return []; }

/** Synthetic authority can be bound to an exact fixture user in test workers only. */
export function registerTestPolicyAuthority(userId: string, policies: unknown, operatorPolicyIds: string[]): void {
  if (process.env.NODE_ENV !== 'test') throw new Error('Test policy authority is unavailable outside test mode');
  if (!/^[0-9a-f-]{36}$/i.test(userId) || !Array.isArray(operatorPolicyIds) || operatorPolicyIds.length === 0) {
    throw new Error('Test policy authority needs one user and explicit operator policy IDs');
  }
  const validated = validateApprovedTerritoryPolicies(policies, { allowSynthetic: true });
  if (validated.length === 0 || validated.some(policy => !policy.synthetic)) throw new Error('Test authority must use isolated synthetic policies');
  isolatedTestAuthorities.set(userId, { policies: structuredClone(validated), operatorPolicyIds: [...operatorPolicyIds] });
}

export function testPolicyAuthorityForUser(userId: string): { policies: ApprovedTerritoryPolicy[]; operatorPolicyIds: string[] } | undefined {
  if (process.env.NODE_ENV !== 'test') return undefined;
  const authority = isolatedTestAuthorities.get(userId);
  return authority ? structuredClone(authority) : undefined;
}
