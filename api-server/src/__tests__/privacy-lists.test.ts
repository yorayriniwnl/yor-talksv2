import assert from "node:assert/strict";
import { after, test, type TestContext } from "node:test";
import { pool } from "@workspace/db";
import { UserRepository } from "../repositories/user-repository.js";
import { UserService } from "../services/user-service.js";
import { createTestUser } from "./test-helpers.js";

after(() => pool.end());

function alignOwnerReads(t: TestContext, users: UserRepository, ownerId: string) {
  const find = users.findById.bind(users);
  let reads = 0;
  let release!: () => void;
  const ready = new Promise<void>((resolve) => { release = resolve; });
  t.mock.method(users, "findById", async (id: string) => {
    const snapshot = await find(id);
    if (id === ownerId) {
      if (++reads === 2) release();
      await ready;
    }
    return snapshot;
  });
  return find;
}

for (const kind of ["block", "mute"] as const) {
  const field = kind === "block" ? "blockedUsers" : "mutedUsers";
  test(`concurrent ${kind} requests preserve every target without duplicates`, { timeout: 10_000 }, async (t) => {
    const users = new UserRepository();
    const owner = await createTestUser(users);
    const targets = await Promise.all([createTestUser(users), createTestUser(users)]);
    t.after(() => Promise.all([owner, ...targets].map((user) => users.deleteById(user.id))));
    const find = alignOwnerReads(t, users, owner.id);
    const profiles = new UserService(users);
    const add = kind === "block" ? profiles.blockUser.bind(profiles) : profiles.muteUser.bind(profiles);
    await Promise.all(targets.map((target) => add(owner.id, target.id)));
    assert.deepEqual(new Set((await find(owner.id))?.[field]), new Set(targets.map((target) => target.id)));
    t.mock.restoreAll();
    await Promise.all([add(owner.id, targets[0].id), add(owner.id, targets[0].id)]);
    assert.equal((await find(owner.id))?.[field]?.length, 2);
  });

  test(`concurrent un${kind} requests remove only their intended targets`, { timeout: 10_000 }, async (t) => {
    const users = new UserRepository();
    const targets = await Promise.all([createTestUser(users), createTestUser(users), createTestUser(users)]);
    const owner = await createTestUser(users, { [field]: targets.map((target) => target.id) });
    t.after(() => Promise.all([owner, ...targets].map((user) => users.deleteById(user.id))));
    const find = alignOwnerReads(t, users, owner.id);
    const profiles = new UserService(users);
    const remove = kind === "block" ? profiles.unblockUser.bind(profiles) : profiles.unmuteUser.bind(profiles);
    await Promise.all(targets.slice(0, 2).map((target) => remove(owner.id, target.id)));
    assert.deepEqual((await find(owner.id))?.[field], [targets[2].id]);
  });
}
