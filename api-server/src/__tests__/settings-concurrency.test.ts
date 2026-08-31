import assert from "node:assert/strict";
import { after, test, type TestContext } from "node:test";
import { pool } from "@workspace/db";
import { UserRepository } from "../repositories/user-repository.js";
import { RedisRepository } from "../repositories/redis-repository.js";
import { AuthService } from "../services/auth-service.js";
import { UserService } from "../services/user-service.js";
import { createTestUser } from "./test-helpers.js";
import type { PrivacySettings, UserSettings } from "../types/index.js";

const redis = new RedisRepository();
after(async () => {
  await redis.disconnect();
  await pool.end();
});

// Force the legacy read/merge/write implementation to read the same snapshot.
// Atomic patch implementations need no preliminary reads and skip this barrier.
function alignLegacyReads(t: TestContext, users: UserRepository, count: number) {
  const find = users.findById.bind(users);
  let reads = 0;
  let release!: () => void;
  const ready = new Promise<void>((resolve) => { release = resolve; });
  t.mock.method(users, "findById", async (id: string) => {
    const snapshot = await find(id);
    if (++reads === count) release();
    await ready;
    return snapshot;
  });
  return find;
}

test("concurrent privacy patches cannot undo another privacy restriction", async (t) => {
  const users = new UserRepository();
  const user = await createTestUser(users, {
    privacy: { profileVisibility: "public", messageRequests: true, allowDmFromStrangers: true },
  });
  t.after(() => users.deleteById(user.id));
  const find = alignLegacyReads(t, users, 3);
  const auth = new AuthService(users, redis);
  const patches: Partial<PrivacySettings>[] = [
    { profileVisibility: "private" }, { messageRequests: false }, { allowDmFromStrangers: false },
  ];
  await Promise.all(patches.map((patch) => auth.updatePrivacy(user.id, patch)));
  assert.deepEqual((await find(user.id))?.privacy, {
    profileVisibility: "private", messageRequests: false, allowDmFromStrangers: false,
  });
});

test("concurrent settings patches preserve independent preferences and existing metadata", async (t) => {
  const users = new UserRepository();
  const user = await createTestUser(users, {
    settings: { theme: "light", notificationsEnabled: true, privateAccount: false, onboardingCompleted: true, contentFilter: "regular" },
  });
  t.after(() => users.deleteById(user.id));
  const find = alignLegacyReads(t, users, 3);
  const profiles = new UserService(users);
  const patches: Partial<UserSettings>[] = [
    { theme: "dark" }, { notificationsEnabled: false }, { privateAccount: true },
  ];
  await Promise.all(patches.map((patch) => profiles.updateSettings(user.id, patch)));
  assert.deepEqual((await find(user.id))?.settings, {
    theme: "dark", notificationsEnabled: false, privateAccount: true, onboardingCompleted: true, contentFilter: "regular",
  });
});

test("partial privacy updates fill legacy defaults and keep explicit opt-outs", async (t) => {
  const users = new UserRepository();
  const user = await createTestUser(users);
  t.after(() => users.deleteById(user.id));
  const auth = new AuthService(users, redis);
  await auth.updatePrivacy(user.id, { messageRequests: false });
  const updated = await auth.updatePrivacy(user.id, { profileVisibility: "followers" });
  assert.deepEqual(updated?.privacy, {
    profileVisibility: "followers", messageRequests: false, allowDmFromStrangers: true,
  });
  assert.equal(await auth.updatePrivacy("00000000-0000-4000-8000-000000000000", { messageRequests: false }), undefined);
});

test("updating messaging privacy never opens a legacy private account", async (t) => {
  const users = new UserRepository();
  const user = await createTestUser(users, {
    settings: { theme: "light", notificationsEnabled: true, privateAccount: true },
  });
  t.after(() => users.deleteById(user.id));
  const auth = new AuthService(users, redis);
  assert.equal((await auth.updatePrivacy(user.id, { messageRequests: false }))?.privacy?.profileVisibility, "private");
});
