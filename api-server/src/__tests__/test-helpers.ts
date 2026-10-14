import crypto from "node:crypto";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { UserRepository } from "../repositories/user-repository.js";
import { EligibilityRepository } from "../repositories/eligibility-repository.js";
import { registerTestPolicyAuthority } from "../eligibility/territory-policy.js";
import { env } from "../config/env.js";
import { fixturePolicies } from "./assurance-fixtures.js";
import type { UserRecord } from "../types/index.js";
import type { ContactAuthorizationService } from "../services/contact-authorization-service.js";

/** Existing message persistence tests isolate repository behavior; contact policy has dedicated integration coverage. */
export const allowTestContacts = {
  async requireContact() {},
  async requirePairwiseContacts() {},
  async lockCurrentPairwiseContacts() {},
  async requirePairwiseGroupContacts() {},
  async lockGroupInvitationPairs() {},
  async groupInvitationPolicy() { return { policyVersions: { test: "allowed" }, guardianRequiredUserIds: [] }; },
  async groupGuardianApprovals() { return []; },
  async authorizeGroupInvitation() { return true; },
} as unknown as ContactAuthorizationService;

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

/** Explicitly grant synthetic adult authority to one test fixture. New test users remain unknown by default. */
export async function authorizeTestAdultAccount(userId: string): Promise<void> {
  if (env.NODE_ENV !== "test") throw new Error("Synthetic adult fixtures are available only in test mode");
  const policies = fixturePolicies().map(policy => ({
    ...policy,
    currentTermsVersion: env.TERMS_VERSION,
    capabilities: { social: true, publish: true, messaging: true, payments: true, seller: true,
      memberships: true, live: true, rtc: true, ai: true, analytics: false, profiling: false },
  }));
  registerTestPolicyAuthority(userId, policies, ["fixture-operator"]);
  const clock = await db.execute(sql`SELECT clock_timestamp() AS now`);
  const now = new Date(clock.rows[0].now as Date);
  const verifiedAt = new Date(now.getTime() - 1_000).toISOString();
  const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1_000).toISOString();
  await db.execute(sql`UPDATE users SET terms_version=${env.TERMS_VERSION},terms_accepted_at=${verifiedAt} WHERE id=${userId}`);
  await db.transaction(tx => new EligibilityRepository().storeAssessment({
    userId, id: crypto.randomUUID(), status: "verified", issuer: "isolated-fixture", method: "synthetic-test-fixture",
    experience: "adult_18_plus", thresholds: [{ age: 13, atLeast: true }, { age: 18, atLeast: true }], territory: "ZZ",
    policyVersions: { "fixture-recipient": "fixture-1", "fixture-operator": "fixture-1" },
    verifiedAt, expiresAt, evidenceReference: "private-synthetic-test-evidence",
  }, tx));
}

/** Create a test account and explicitly bind it to an isolated adult test policy. */
export async function createVerifiedAdultTestUser(
  userRepository: UserRepository,
  overrides: Partial<UserRecord> = {},
): Promise<UserRecord> {
  const user = await createTestUser(userRepository, overrides);
  await authorizeTestAdultAccount(user.id);
  return (await userRepository.findById(user.id)) ?? user;
}
