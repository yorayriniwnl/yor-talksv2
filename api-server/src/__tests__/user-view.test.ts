import assert from "node:assert/strict";
import { test } from "node:test";
import type { UserRecord } from "../types/index.js";
import { toOwnUser, toPublicUser, toRestrictedOwnUser } from "../utils/user-view.js";
import type { EligibilityDecision } from "../eligibility/types.js";

test("public profiles allowlist identity fields and exclude consent, email and future secrets", () => {
  const user = {
    id: "creator", username: "creator", fullName: "Creator", bio: "A public bio", avatarUrl: null,
    role: "user", createdAt: "2026-08-31T00:00:00Z", updatedAt: "2026-08-31T00:00:00Z",
    followerCount: 2, followingCount: 3, email: "private@example.test", passwordHash: "hash",
    totpSecret: "secret", googleSubject: "subject", contactIdentityDigest: "digest", authVersion: 7,
    termsVersion: "private-version", termsAcceptedAt: "private-time", ageConfirmedAt: "private-time",
    permissions: [], settings: {}, following: ["private-relationship"], pendingFollowIds: ["pending"], favoriteCreatorIds: ["favorite"], futurePrivateField: "private",
  } as unknown as UserRecord;
  const view = toPublicUser(user);
  assert.deepEqual(Object.keys(view).sort(), ["id", "username", "fullName", "bio", "bioStyleId", "avatarUrl", "role", "createdAt", "updatedAt", "followerCount", "followingCount"].sort());
  assert.equal(view.fullName, "Creator");
  const own = toOwnUser(user);
  assert.equal(own.termsVersion, "private-version");
  assert.equal(own.twoFactorEnabled, true);
  for (const key of ["passwordHash", "totpSecret", "googleSubject", "contactIdentityDigest", "authVersion"]) assert.equal(key in own, false);
});

test("restricted owner view contains only account, security and eligibility summaries", () => {
  const user = {
    id: "restricted", username: "secret-name", fullName: "Private Name", bio: "Private bio", email: "private@example.test",
    passwordHash: "private-hash", totpSecret: "encrypted-secret", createdAt: "2026-01-01T00:00:00.000Z",
    accountStatus: "active", emailVerified: true, passwordResetRequired: true,
  } as unknown as UserRecord;
  const decision: EligibilityDecision = {
    experience: "unknown", activated: false, capabilities: { social: false, publish: false, messaging: false, payments: false,
      seller: false, memberships: false, live: false, rtc: false, ai: false, analytics: false, profiling: false },
    maximumContentRating: "child_safe", policyVersions: [], revision: "private-revision", reason: "verification_required", publicBrowsingAllowed: false,
  };
  const restricted = toRestrictedOwnUser(user, decision);
  assert.deepEqual(Object.keys(restricted).sort(), ["account", "eligibility", "security"]);
  assert.deepEqual(restricted.account, { id: "restricted", status: "active", emailVerified: true, createdAt: "2026-01-01T00:00:00.000Z" });
  assert.deepEqual(restricted.security, { twoFactorEnabled: true, passwordResetRequired: true });
  assert.deepEqual(restricted.eligibility, {
    experience: "unknown", activated: false, maximumContentRating: "child_safe", reason: "verification_required", policyVersions: [],
  });
  assert.equal(JSON.stringify(restricted).includes("private@example.test"), false);
  for (const secret of ["username", "fullName", "bio", "passwordHash", "revision", "capabilities", "totpSecret"]) {
    assert.equal(secret in restricted.account || secret in restricted.security || secret in restricted.eligibility, false);
  }
});
