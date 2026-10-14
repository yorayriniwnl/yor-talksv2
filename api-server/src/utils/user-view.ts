import type { UserRecord } from "../types/index.js";
import type { EligibilityDecision } from "../eligibility/types.js";

export type OwnUserView = Omit<UserRecord, "passwordHash" | "authVersion" | "googleSubject" | "totpSecret" | "contactIdentityDigest"> & { twoFactorEnabled: boolean };
export type PublicUserView = Pick<UserRecord, "id" | "username" | "fullName" | "bio" | "bioStyleId" | "avatarUrl" | "role" | "createdAt" | "updatedAt" | "followerCount" | "followingCount">;
export type RestrictedOwnUserView = {
  account: { id: string; status: string; emailVerified: boolean; createdAt: string };
  security: { twoFactorEnabled: boolean; passwordResetRequired: boolean };
  eligibility: Pick<EligibilityDecision, "experience" | "activated" | "maximumContentRating" | "reason" | "policyVersions">;
};

/** For the account owner viewing/updating their own profile, or auth responses. Strips the password hash and the raw TOTP secret — exposes only whether 2FA is on. */
export function toOwnUser(user: UserRecord): OwnUserView {
  const { passwordHash, authVersion, googleSubject, totpSecret, contactIdentityDigest, ...rest } = user;
  return { ...rest, twoFactorEnabled: !!totpSecret };
}

/** Restricted sessions receive an account/security summary, never a profile view. */
export function toRestrictedOwnUser(user: UserRecord, decision: EligibilityDecision): RestrictedOwnUserView {
  return {
    account: {
      id: user.id,
      status: user.accountStatus ?? "active",
      emailVerified: user.emailVerified === true,
      createdAt: user.createdAt,
    },
    security: {
      twoFactorEnabled: Boolean(user.totpSecret),
      passwordResetRequired: user.passwordResetRequired === true,
    },
    eligibility: {
      experience: decision.experience,
      activated: decision.activated,
      maximumContentRating: decision.maximumContentRating,
      reason: decision.reason,
      policyVersions: [...decision.policyVersions],
    },
  };
}

/** Public profiles are allowlisted: new private database fields stay private. */
export function toPublicUser(user: UserRecord): PublicUserView {
  const { id, username, fullName, bio, bioStyleId, avatarUrl, role, createdAt, updatedAt, followerCount, followingCount } = user;
  return { id, username, fullName, bio, bioStyleId, avatarUrl, role, createdAt, updatedAt, followerCount, followingCount };
}

export function toPublicUsers(users: UserRecord[]): PublicUserView[] {
  return users.map(toPublicUser);
}
