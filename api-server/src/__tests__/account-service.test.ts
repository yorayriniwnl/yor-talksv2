import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import { after, test } from "node:test";
import { randomUUID } from "node:crypto";
import { pool } from "@workspace/db";
import { AccountService, InvalidAccountPasswordError } from "../services/account-service.js";
import { RedisRepository } from "../repositories/redis-repository.js";
import { UserRepository } from "../repositories/user-repository.js";

const redisRepository = new RedisRepository();
const userRepository = new UserRepository();

after(async () => {
  await redisRepository.disconnect();
  await pool.end();
});

test("account export excludes authentication secrets and deletion removes the account", async () => {
  const id = randomUUID();
  const email = `${String(Date.now()).slice(-7)}@kiit.ac.in`;
  await userRepository.create({
    id,
    username: `account-${id.slice(0, 8)}`,
    email,
    passwordHash: await bcrypt.hash("Supersecret1!", 4),
    fullName: "Account Lifecycle Test",
    bio: "",
    avatarUrl: null,
    role: "user",
    permissions: ["read:profile"],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    settings: { theme: "light", notificationsEnabled: true, privateAccount: false },
    emailVerified: true,
  });

  const accountService = new AccountService(userRepository, redisRepository);
  const exported = await accountService.exportAccount(id);
  const account = exported?.account as Record<string, unknown>;
  assert.equal(account.email, email);
  assert.equal("passwordHash" in account, false);
  assert.equal("totpSecret" in account, false);
  assert.equal("contactIdentityDigest" in account, false);

  await assert.rejects(() => accountService.deleteAccount(id, "wrong-password"), InvalidAccountPasswordError);
  assert.equal(await accountService.deleteAccount(id, "Supersecret1!"), true);
  assert.equal(await userRepository.findById(id), undefined);
});
