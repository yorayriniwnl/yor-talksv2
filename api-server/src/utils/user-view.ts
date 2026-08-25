import type { UserRecord } from "../types/index.js";

export type OwnUserView = Omit<UserRecord, "passwordHash" | "totpSecret" | "contactIdentityDigest"> & { twoFactorEnabled: boolean };
export type PublicUserView = Omit<UserRecord, "passwordHash" | "email" | "devices" | "blockedUsers" | "mutedUsers" | "privacy" | "passwordResetRequired" | "totpSecret" | "contactIdentityDigest">;

/** For the account owner viewing/updating their own profile, or auth responses. Strips the password hash and the raw TOTP secret — exposes only whether 2FA is on. */
export function toOwnUser(user: UserRecord): OwnUserView {
  const { passwordHash, totpSecret, contactIdentityDigest, ...rest } = user;
  return { ...rest, twoFactorEnabled: !!totpSecret };
}

/** For any other viewer. Strips the password hash, TOTP secret, plus everything that's nobody else's business. */
export function toPublicUser(user: UserRecord): PublicUserView {
  const { passwordHash, email, devices, blockedUsers, mutedUsers, privacy, passwordResetRequired, totpSecret, contactIdentityDigest, ...rest } = user;
  return rest;
}

export function toPublicUsers(users: UserRecord[]): PublicUserView[] {
  return users.map(toPublicUser);
}
