import type { TestContext } from 'node:test';
import { EligibilityService } from '../services/eligibility-service.js';
import { CAPABILITIES, type EligibilityDecision } from '../eligibility/types.js';

/**
 * Only for test cases exercising unrelated HTTP/ownership contracts.
 * The production policy remains fail-closed, and restricted-session security
 * tests deliberately use the real EligibilityService instead of this fixture.
 */
export function mockVerifiedAdultEligibility(t: TestContext): void {
  t.mock.method(EligibilityService.prototype, 'decisionFor', async (_userId: string): Promise<EligibilityDecision> => ({
    experience: 'adult_18_plus',
    activated: true,
    capabilities: Object.fromEntries(CAPABILITIES.map(capability => [capability, true])) as EligibilityDecision['capabilities'],
    maximumContentRating: 'mature',
    policyVersions: ['synthetic-fixture:v1'],
    revision: 'synthetic-verified-adult-fixture',
    reason: null,
    publicBrowsingAllowed: true,
  }));
}
