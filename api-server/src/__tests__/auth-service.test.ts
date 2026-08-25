import assert from "node:assert/strict";
import { after, test } from "node:test";
import { AuthService } from "../services/auth-service.js";
import { EmailVerificationRequiredError } from "../services/auth-service.js";
import { RedisRepository } from "../repositories/redis-repository.js";
import { UserRepository } from "../repositories/user-repository.js";
import { pool } from "@workspace/db";

const redisRepository = new RedisRepository();
after(async () => {
  await redisRepository.disconnect();
  await pool.end();
});

test("registration requires email verification before password login", async () => {
  const authService = new AuthService(new UserRepository(), redisRepository);
  const unique = Date.now();
  const email = `${String(unique).slice(-7)}@kiit.ac.in`;

  const registered = await authService.register({
    username: `alice-${unique}`,
    email,
    password: "supersecret",
    fullName: "Alice Example",
  });

  assert.equal(registered.user.emailVerified, false);
  assert.ok(registered.verificationToken);

  await assert.rejects(
    () => authService.login({ identifier: email, password: "supersecret" }),
    EmailVerificationRequiredError,
  );

  const verified = await authService.confirmEmailVerification(registered.verificationToken!);
  assert.equal(verified?.emailVerified, true);

  const loggedIn = await authService.login({ identifier: email, password: "supersecret" });
  assert.equal(loggedIn.user.id, registered.user.id);
  assert.ok(loggedIn.tokens.accessToken);
  assert.ok(loggedIn.tokens.refreshToken);
});
