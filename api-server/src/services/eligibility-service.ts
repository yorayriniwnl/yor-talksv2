import { createHash } from 'node:crypto';
import { env } from '../config/env.js';
import { EligibilityRepository } from '../repositories/eligibility-repository.js';
import { applicablePolicies, evaluateEligibility } from '../eligibility/policy.js';
import { loadApprovedTerritoryPolicies, loadOperatorPolicyIds } from '../eligibility/territory-policy.js';
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
  private registry() { return (this.options.policies ?? loadApprovedTerritoryPolicies)(); }
  async decisionFor(userId: string): Promise<EligibilityDecision> {
    const facts = await this.repository.readFacts(userId);
    return evaluateEligibility(facts && { ...facts, currentTermsVersion: this.options.currentTermsVersion ?? env.TERMS_VERSION,
      territoryContext: { ...facts.territoryContext, verifiedTerritory: facts.territoryContext?.verifiedTerritory ?? facts.assessment?.territory,
        operatorPolicyIds: this.options.operatorPolicyIds ?? loadOperatorPolicyIds() },
      releaseFlags: this.options.releaseFlags ?? { payments: env.PAYMENTS_ENABLED, seller: env.SELLER_ENABLED, memberships: env.MEMBERSHIPS_ENABLED,
        live: env.LIVE_ROOMS_ENABLED, rtc: env.RTC_CALLS_ENABLED, ai: env.AI_COMPANION_ENABLED } }, this.registry(), (this.options.clock ?? (() => new Date()))());
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
