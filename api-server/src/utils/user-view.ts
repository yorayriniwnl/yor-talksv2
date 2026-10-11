import type { UserRecord } from "../types/index.js";

export type OwnUserView = Omit<UserRecord, "passwordHash" | "authVersion" | "googleSubject" | "totpSecret" | "contactIdentityDigest"> & { twoFactorEnabled: boolean };
export type PublicUserView = Pick<UserRecord, "id" | "username" | "fullName" | "bio" | "bioStyleId" | "avatarUrl" | "role" | "createdAt" | "updatedAt" | "followerCount" | "followingCount">;

/** For the account owner viewing/updating their own profile, or auth responses. Strips the password hash and the raw TOTP secret — exposes only whether 2FA is on. */
export function toOwnUser(user: UserRecord): OwnUserView {
  const { passwordHash, authVersion, googleSubject, totpSecret, contactIdentityDigest, ...rest } = user;
  return { ...rest, twoFactorEnabled: !!totpSecret };
}

/** Public profiles are allowlisted: new private database fields stay private. */
export function toPublicUser(user: UserRecord): PublicUserView {
  const { id, username, fullName, bio, bioStyleId, avatarUrl, role, createdAt, updatedAt, followerCount, followingCount } = user;
  return { id, username, fullName, bio, bioStyleId, avatarUrl, role, createdAt, updatedAt, followerCount, followingCount };
}

export type RestrictedUserView = Pick<UserRecord, "id" | "username" | "email" | "role" | "createdAt" | "updatedAt"> & {
  twoFactorEnabled: boolean;
  accountStatus: string;
  termsVersion: string | null;
  termsAcceptedAt: string | null;
  restricted: true;
  eligibility: {
    activated: false;
    reason: string | null;
  };
};

/** For restricted account sessions viewing their own account on GET /users/me: returns only account ID, username, email, role, security & eligibility status. Excludes social metrics, following/followers, and profile discovery fields. */
export function toRestrictedUser(user: UserRecord, reason: string | null = "verification_required"): RestrictedUserView {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    twoFactorEnabled: !!user.totpSecret,
    accountStatus: user.accountStatus ?? "active",
    termsVersion: user.termsVersion ?? null,
    termsAcceptedAt: user.termsAcceptedAt ?? null,
    restricted: true,
    eligibility: {
      activated: false,
      reason,
    },
  };
}

export function toPublicUsers(users: UserRecord[]): PublicUserView[] {
  return users.map(toPublicUser);
}
