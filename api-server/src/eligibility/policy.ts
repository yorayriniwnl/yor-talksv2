import { createHash } from 'node:crypto';
import { CAPABILITIES, type ApprovedTerritoryPolicy, type EligibilityDecision, type EligibilityFacts, type EligibilityReason,
  type Experience, type GuardianAuthorization, type PolicyVersions, type TerritoryContext, type Threshold, type ThresholdAssertion } from './types.js';
import { validateApprovedTerritoryPolicies } from './territory-policy.js';

const validInstant = (value: string | null | undefined) => value != null && Number.isFinite(Date.parse(value));
const currentInterval = (from: string | null, until: string, now: Date) => validInstant(from) && validInstant(until)
  && Date.parse(from!) <= now.getTime() && Date.parse(until) > now.getTime() && Date.parse(until) > Date.parse(from!);
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).sort(([a],[b]) => a.localeCompare(b)).map(([key,item]) => [key,canonical(item)]));
  return value;
}
function revisionFor(facts: EligibilityFacts | undefined, policies: ApprovedTerritoryPolicy[]): string {
  // Include policy withdrawal/config changes; an account counter alone cannot
  // revoke a cached grant when the registry becomes stricter.
  return createHash('sha256').update(JSON.stringify(canonical({ revision: facts?.revision ?? '0', policies,
    context: facts?.territoryContext, terms: facts?.currentTermsVersion, releases: facts?.releaseFlags,
    account: facts?.account, proof: facts?.assessment && { status: facts.assessment.status, experience: facts.assessment.experience,
      thresholds: facts.assessment.thresholds, expiresAt: facts.assessment.expiresAt, policyVersions: facts.assessment.policyVersions },
    guardians: facts?.guardianAuthorizations.map(value => ({ revision: value.subjectRevision, status: value.status,
      purposes: value.purposes, expiresAt: value.expiresAt, withdrawnAt: value.withdrawnAt, notices: value.noticeVersions, policies: value.policyVersions })) }))).digest('hex');
}
export const policyFingerprint = (policies: ApprovedTerritoryPolicy[],operatorPolicyIds: string[] = []) =>
  createHash('sha256').update(JSON.stringify([revisionFor(undefined,policies),[...operatorPolicyIds].sort()])).digest('hex');
const versionsMatch = (versions: PolicyVersions, policies: ApprovedTerritoryPolicy[]) => policies.every(policy => versions[policy.id] === policy.version);

export function applicablePolicies(context: TerritoryContext | undefined, policies: ApprovedTerritoryPolicy[], now: Date): ApprovedTerritoryPolicy[] | undefined {
  if (!Number.isFinite(now.getTime()) || !context || context.conflicts || !context.operatorPolicyIds.length) return undefined;
  const territory = context.verifiedTerritory ?? context.declaredTerritory;
  if (!territory || !/^[A-Z]{2}$/.test(territory) || context.verifiedTerritory && context.declaredTerritory && context.verifiedTerritory !== context.declaredTerritory) return undefined;
  let validated: ApprovedTerritoryPolicy[];
  try { validated = validateApprovedTerritoryPolicies(policies, { allowSynthetic: true }); } catch { return undefined; }
  const recipients = validated.filter(policy => policy.scope === 'recipient' && policy.territory === territory);
  const operators = context.operatorPolicyIds.map(id => validated.find(policy => policy.scope === 'operator' && policy.id === id));
  if (!recipients.length || operators.some(policy => !policy)) return undefined;
  const relevant = [...recipients,...operators as ApprovedTerritoryPolicy[]];
  if (relevant.some(policy => !policy.approved || !currentInterval(policy.effectiveFrom, policy.reviewExpiresAt, now))) return undefined;
  return relevant;
}

function thresholdFacts(experience: Experience, assertions: ThresholdAssertion[]): Map<Threshold, boolean> | undefined {
  if (!Array.isArray(assertions) || assertions.length > 6) return undefined;
  const result = new Map<Threshold, boolean>();
  for (const item of assertions) {
    if (!item || typeof item !== 'object' || Object.keys(item).length !== 2 || ![13,14,15,16,17,18].includes(item.age)
      || typeof item.atLeast !== 'boolean' || result.has(item.age)) return undefined;
    result.set(item.age,item.atLeast);
  }
  if (experience === 'unknown' || result.get(13) !== (experience !== 'under_13') || result.get(18) !== (experience === 'adult_18_plus')) return undefined;
  for (const [age,answer] of result) for (const [other,otherAnswer] of result) if (age < other && !answer && otherAnswer) return undefined;
  return result;
}
export const consistentThresholdAssertions = (experience: Experience, assertions: ThresholdAssertion[]) => Boolean(thresholdFacts(experience,assertions));
function atLeast(assertions: Map<Threshold, boolean>, threshold: Threshold): boolean | undefined {
  if (assertions.has(threshold)) return assertions.get(threshold);
  for (const [age,answer] of assertions) if (answer && age >= threshold) return true;
  for (const [age,answer] of assertions) if (!answer && age <= threshold) return false;
  return undefined;
}
function guardianCovers(authorization: GuardianAuthorization, facts: EligibilityFacts, policies: ApprovedTerritoryPolicy[], purpose: GuardianAuthorization['purposes'][number], now: Date): boolean {
  if (authorization.userId !== facts.account.id || authorization.status !== 'granted' || authorization.withdrawnAt != null
    || !authorization.issuer || !authorization.guardianReference || !authorization.responsibilityReference
    || !currentInterval(authorization.verifiedAt,authorization.expiresAt,now)
    || !validInstant(authorization.grantedAt) || Date.parse(authorization.grantedAt) < Date.parse(authorization.verifiedAt)
    || Date.parse(authorization.grantedAt) > now.getTime() || !versionsMatch(authorization.policyVersions,policies)) return false;
  return authorization.purposes.includes(purpose) && policies.every(policy => !policy.requiredGuardianPurposes.includes(purpose)
    || authorization.noticeVersions[purpose] === policy.guardianNoticeVersions[purpose]);
}
function guardianPurposesCovered(facts: EligibilityFacts, policies: ApprovedTerritoryPolicy[], now: Date): boolean {
  const purposes = new Set(policies.flatMap(policy => policy.requiredGuardianPurposes));
  return [...purposes].every(purpose => {
    const candidates = facts.guardianAuthorizations.filter(value => value.userId === facts.account.id && value.purposes.includes(purpose));
    if (!candidates.length || candidates.some(value => !/^[1-9]\d*$/.test(value.subjectRevision ?? ''))) return false;
    const ordered = candidates.sort((a,b) => BigInt(a.subjectRevision!) > BigInt(b.subjectRevision!) ? -1 : BigInt(a.subjectRevision!) < BigInt(b.subjectRevision!) ? 1 : 0);
    // Equal authority revisions with distinct records are inconsistent, rather
    // than a reason to choose the more permissive record.
    if (ordered[1]?.subjectRevision === ordered[0].subjectRevision) return false;
    return guardianCovers(ordered[0],facts,policies,purpose,now);
  });
}

export function evaluateEligibility(facts: EligibilityFacts | undefined, policies: ApprovedTerritoryPolicy[], now: Date): EligibilityDecision {
  const decision: EligibilityDecision = { experience: 'unknown', activated: false,
    capabilities: Object.fromEntries(CAPABILITIES.map(capability => [capability,false])) as EligibilityDecision['capabilities'],
    maximumContentRating: 'child_safe', policyVersions: [], revision: revisionFor(facts,policies), reason: 'verification_required', publicBrowsingAllowed: false };
  const deny = (reason: EligibilityReason) => ({ ...decision, reason });
  if (!facts) return decision;
  if (facts.account.status !== 'active') return deny('account_restricted');
  const proof = facts.assessment;
  if (!proof || proof.status !== 'verified') return deny(proof?.status === 'expired' || proof?.status === 'revoked' ? 'reassessment_required' : 'verification_required');
  if (proof.userId !== facts.account.id || !proof.issuer || !proof.method || !proof.evidenceReference
    || !currentInterval(proof.verifiedAt,proof.expiresAt,now)) return deny('reassessment_required');
  const assertions = thresholdFacts(proof.experience,proof.thresholds);
  if (!assertions) return deny('reassessment_required');
  if (!facts.territoryContext || facts.territoryContext.verifiedTerritory !== proof.territory) return deny('territory_unavailable');
  const relevant = applicablePolicies(facts.territoryContext,policies,now);
  if (!relevant) return deny('territory_unavailable');
  decision.policyVersions = relevant.map(policy => `${policy.id}:${policy.version}`).sort();
  decision.publicBrowsingAllowed = relevant.every(policy => policy.publicBrowsingAllowed);
  if (!versionsMatch(proof.policyVersions,relevant)) return deny('reassessment_required');
  if (relevant.some(policy => !policy.allowedExperiences.includes(proof.experience as Exclude<Experience,'unknown'>)
    || policy.minimumAccessThreshold != null && atLeast(assertions,policy.minimumAccessThreshold) !== true)) return deny('territory_unavailable');
  if (!facts.currentTermsVersion || !validInstant(facts.account.termsAcceptedAt) || Date.parse(facts.account.termsAcceptedAt!) > now.getTime()
    || facts.account.termsVersion !== facts.currentTermsVersion || relevant.some(policy => policy.currentTermsVersion !== facts.currentTermsVersion)) return deny('reassessment_required');
  const needsGuardian = proof.experience === 'under_13' || relevant.some(policy => atLeast(assertions,policy.independentConsentThreshold) !== true
    || policy.guardianRequiredBelow != null && atLeast(assertions,policy.guardianRequiredBelow) !== true);
  if (needsGuardian && !guardianPurposesCovered(facts,relevant,now)) return deny('guardian_required');
  decision.experience = proof.experience; decision.activated = true; decision.reason = null;
  for (const capability of ['social','publish','messaging'] as const) decision.capabilities[capability] = relevant.every(policy => policy.capabilities[capability]);
  if (proof.experience === 'adult_18_plus') {
    for (const capability of ['payments','seller','memberships','live','rtc','ai'] as const)
      decision.capabilities[capability] = facts.releaseFlags?.[capability] === true && relevant.every(policy => policy.capabilities[capability]);
  }
  const ranks = ['child_safe','regular','mature'] as const;
  const ceiling = proof.experience === 'adult_18_plus' ? 2 : proof.experience === 'teen_13_17' ? 1 : 0;
  const preference = ranks.indexOf(facts.account.contentPreference);
  const policyCeiling = Math.min(...relevant.map(policy => ranks.indexOf(policy.maximumContentRating)));
  decision.maximumContentRating = ranks[Math.max(0,Math.min(ceiling,preference,policyCeiling))];
  return decision;
}
