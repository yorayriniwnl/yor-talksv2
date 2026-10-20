import crypto from "node:crypto";
import { UserRepository } from "../repositories/user-repository.js";
import type { UserRecord } from "../types/index.js";
import { EligibilityService } from "../services/eligibility-service.js";
import { CAPABILITIES, type EligibilityDecision } from "../eligibility/types.js";

/**
 * Inserts a real, FK-satisfying user row for tests that need one to exist
 * (posts, messages, communities, etc. all reference users.id via a
 * foreign key, so string placeholders like "u1" fail against the real
 * schema — this must be a real UUID for a row that actually exists).
 */
export async function createTestUser(
  userRepository: UserRepository,
  overrides: Partial<UserRecord> = {},
): Promise<UserRecord> {
  const unique = crypto.randomUUID();
  const now = new Date().toISOString();

  return userRepository.create({
    id: crypto.randomUUID(),
    username: `test-${unique.slice(0, 8)}`,
    email: `test-${unique.slice(0, 8)}@example.com`,
    passwordHash: "hash",
    fullName: "Test User",
    bio: "",
    avatarUrl: null,
    role: "user",
    permissions: ["read:profile"],
    createdAt: now,
    updatedAt: now,
    followers: [],
    following: [],
    settings: { theme: "light", notificationsEnabled: true, privateAccount: false },
    ...overrides,
  });
}

/**
 * Explicitly models an activated synthetic adult only in route tests whose
 * subject is billing, provider gating or media ownership. Eligibility-specific
 * suites continue exercising the real, fail-closed eligibility decision.
 */
export function mockActivatedEligibility(t: import('node:test').TestContext): void {
  const capabilities = Object.fromEntries(
    CAPABILITIES.map((capability) => [capability, true]),
  ) as EligibilityDecision['capabilities'];
  const decision: EligibilityDecision = {
    experience: 'adult_18_plus',
    activated: true,
    capabilities,
    maximumContentRating: 'regular',
    policyVersions: ['synthetic-route-fixture'],
    revision: 'synthetic-route-fixture',
    reason: null,
    publicBrowsingAllowed: true,
  };
  t.mock.method(EligibilityService.prototype, 'decisionFor', async () => decision);
}
