import assert from "node:assert/strict";
import { test } from "node:test";
import type { UserRecord } from "../types/index.js";
import { toOwnUser, toPublicUser } from "../utils/user-view.js";

test("public profiles allowlist identity fields and exclude consent, email and future secrets", () => {
  const user = {
    id: "creator", username: "creator", fullName: "Creator", bio: "A public bio", avatarUrl: null,
    role: "user", createdAt: "2026-08-31T00:00:00Z", updatedAt: "2026-08-31T00:00:00Z",
    followerCount: 2, followingCount: 3, email: "private@example.test", passwordHash: "hash",
    totpSecret: "secret", googleSubject: "subject", contactIdentityDigest: "digest",
    termsVersion: "private-version", termsAcceptedAt: "private-time", ageConfirmedAt: "private-time",
    permissions: [], settings: {}, following: ["private-relationship"], pendingFollowIds: ["pending"], favoriteCreatorIds: ["favorite"], futurePrivateField: "private",
  } as unknown as UserRecord;
  const view = toPublicUser(user);
  assert.deepEqual(Object.keys(view).sort(), ["id", "username", "fullName", "bio", "avatarUrl", "role", "createdAt", "updatedAt", "followerCount", "followingCount"].sort());
  assert.equal(view.fullName, "Creator");
  const own = toOwnUser(user);
  assert.equal(own.termsVersion, "private-version");
  assert.equal(own.twoFactorEnabled, true);
  for (const key of ["passwordHash", "totpSecret", "googleSubject", "contactIdentityDigest"]) assert.equal(key in own, false);
});
