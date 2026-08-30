import type { UserRecord } from "../types/index.js";

export type OwnUserView = Omit<UserRecord, "passwordHash" | "googleSubject" | "totpSecret" | "contactIdentityDigest"> & { twoFactorEnabled: boolean };
export type PublicUserView = Pick<UserRecord, "id" | "username" | "fullName" | "bio" | "avatarUrl" | "role" | "createdAt" | "updatedAt" | "followerCount" | "followingCount">;

/** For the account owner viewing/updating their own profile, or auth responses. Strips the password hash and the raw TOTP secret — exposes only whether 2FA is on. */
export function toOwnUser(user: UserRecord): OwnUserView {
  const { passwordHash, googleSubject, totpSecret, contactIdentityDigest, ...rest } = user;
  return { ...rest, twoFactorEnabled: !!totpSecret };
}

/** Public profiles are allowlisted: new private database fields stay private. */
export function toPublicUser(user: UserRecord): PublicUserView {
  const { id, username, fullName, bio, avatarUrl, role, createdAt, updatedAt, followerCount, followingCount } = user;
  return { id, username, fullName, bio, avatarUrl, role, createdAt, updatedAt, followerCount, followingCount };
}

export function toPublicUsers(users: UserRecord[]): PublicUserView[] {
  return users.map(toPublicUser);
}
