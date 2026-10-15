import { createHash } from 'node:crypto';
import { env } from '../config/env.js';
import { EligibilityRepository } from '../repositories/eligibility-repository.js';
import { applicablePolicies, evaluateEligibility } from '../eligibility/policy.js';
import { loadApprovedTerritoryPolicies, loadOperatorPolicyIds, testPolicyAuthorityForUser } from '../eligibility/territory-policy.js';
import type { ApprovedTerritoryPolicy, Capability, EligibilityDecision, ReleaseFlags, TerritoryContext } from '../eligibility/types.js';

export class EligibilityCapabilityError extends Error {
  readonly code = 'capability_unavailable';
  constructor(readonly decision: EligibilityDecision) { super('Capability unavailable'); }
}
interface EligibilityServiceOptions {
  policies?: () => ApprovedTerritoryPolicy[]; operatorPolicyIds?: string[]; currentTermsVersion?: string;
  releaseFlags?: ReleaseFlags; clock?: () => Date;
}
export class EligibilityService {
  constructor(private readonly repository: EligibilityRepository = new EligibilityRepository(), private readonly options: EligibilityServiceOptions = {}) {}
  private registry(userId?: string) {
    if (this.options.policies) return this.options.policies();
    if (userId) {
      const authority = testPolicyAuthorityForUser(userId);
      if (authority) return authority.policies;
    }
    return loadApprovedTerritoryPolicies();
  }
  private operatorPolicyIds(userId?: string) {
    if (this.options.operatorPolicyIds) return this.options.operatorPolicyIds;
    if (userId) {
      const authority = testPolicyAuthorityForUser(userId);
      if (authority) return authority.operatorPolicyIds;
    }
    return loadOperatorPolicyIds();
  }
  private withServerContext(facts: Awaited<ReturnType<EligibilityRepository['readFacts']>>, userId?: string) {
    return facts && { ...facts, currentTermsVersion: this.options.currentTermsVersion ?? env.TERMS_VERSION,
      territoryContext: { ...facts.territoryContext, verifiedTerritory: facts.territoryContext?.verifiedTerritory ?? facts.assessment?.territory,
        operatorPolicyIds: this.operatorPolicyIds(userId) },
      releaseFlags: this.options.releaseFlags ?? { payments: env.PAYMENTS_ENABLED, seller: env.SELLER_ENABLED, memberships: env.MEMBERSHIPS_ENABLED,
        live: env.LIVE_ROOMS_ENABLED, rtc: env.RTC_CALLS_ENABLED, ai: env.AI_COMPANION_ENABLED } };
  }
  async decisionFor(userId: string): Promise<EligibilityDecision> {
    const facts = await this.repository.readFacts(userId);
    return evaluateEligibility(this.withServerContext(facts,userId), this.registry(userId), (this.options.clock ?? (() => new Date()))());
  }
  /** Contact rules come only from the same active, approved territory intersection as activation. */
  async contactRulesFor(userId: string): Promise<{
    decision: EligibilityDecision;
    guardianContactsRequired: boolean;
    guardianPolicyVersions: Record<string, string>;
    guardianNoticeVersions: Record<string, string>;
  }> {
    const policies = this.registry(userId), now = (this.options.clock ?? (() => new Date()))();
    const facts = await this.repository.readFacts(userId);
    const serverFacts = this.withServerContext(facts,userId);
    const decision = evaluateEligibility(serverFacts, policies, now);
    const resolved = serverFacts?.territoryContext;
    const relevant = applicablePolicies(resolved, policies, now);
    return {
      decision,
      guardianContactsRequired: relevant ? relevant.some(policy => policy.guardianContactsRequired) : true,
      guardianPolicyVersions: Object.fromEntries((relevant ?? []).map(policy => [policy.id, policy.version])),
      guardianNoticeVersions: Object.fromEntries((relevant ?? [])
        .filter(policy => policy.requiredGuardianPurposes.includes('social_contact'))
        .map(policy => [policy.id, policy.guardianNoticeVersions.social_contact ?? ''])),
    };
  }
  async publicDecision(context: TerritoryContext): Promise<EligibilityDecision> {
    const registry = this.registry(); const now = (this.options.clock ?? (() => new Date()))();
    // Operator applicability comes from this server, never the caller's context.
    const resolved = { ...context, operatorPolicyIds: this.options.operatorPolicyIds ?? loadOperatorPolicyIds() };
    const relevant = applicablePolicies(resolved,registry,now);
    const decision = evaluateEligibility(undefined,registry,now);
    decision.publicBrowsingAllowed = Boolean(relevant?.every(policy => policy.publicBrowsingAllowed));
    decision.reason = relevant ? 'verification_required' : 'territory_unavailable';
    decision.policyVersions = relevant?.map(policy => `${policy.id}:${policy.version}`).sort() ?? [];
    decision.revision = createHash('sha256').update(`${decision.revision}:${JSON.stringify(resolved)}`).digest('hex');
    return decision;
  }
  async requireCapability(userId: string, capability: Capability): Promise<EligibilityDecision> {
    const decision = await this.decisionFor(userId);
    if (!decision.activated || !decision.capabilities[capability]) throw new EligibilityCapabilityError(decision);
    return decision;
  }
}
