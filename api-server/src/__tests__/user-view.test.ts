import assert from "node:assert/strict";
import { test } from "node:test";
import type { UserRecord } from "../types/index.js";
import { toOwnUser, toPublicUser, toRestrictedUser } from "../utils/user-view.js";

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

test("restricted user view exposes only minimal identity and eligibility status without social metrics", () => {
  const user = {
    id: "restricted-user", username: "restricted_user", fullName: "Restricted User", bio: "Bio", avatarUrl: null,
    role: "user", createdAt: "2026-08-31T00:00:00Z", updatedAt: "2026-08-31T00:00:00Z",
    followerCount: 10, followingCount: 5, email: "restricted@example.test", passwordHash: "hash",
    totpSecret: "secret", accountStatus: "active", termsVersion: "v1", termsAcceptedAt: "2026-08-31T00:00:00Z",
    permissions: [], settings: {}, following: [], pendingFollowIds: [], favoriteCreatorIds: [],
  } as unknown as UserRecord;

  const restricted = toRestrictedUser(user, "verification_required");
  assert.deepEqual(Object.keys(restricted).sort(), [
    "accountStatus", "createdAt", "eligibility", "email", "id", "restricted", "role", "termsAcceptedAt", "termsVersion", "twoFactorEnabled", "updatedAt", "username"
  ].sort());
  assert.equal(restricted.restricted, true);
  assert.equal(restricted.twoFactorEnabled, true);
  assert.deepEqual(restricted.eligibility, { activated: false, reason: "verification_required" });
  for (const excluded of ["followerCount", "followingCount", "bio", "avatarUrl", "fullName", "passwordHash", "totpSecret"]) {
    assert.equal(excluded in restricted, false);
  }
});
