import crypto from "node:crypto";
import { UserRepository } from "../repositories/user-repository.js";
import type { UserRecord } from "../types/index.js";

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
