import assert from "node:assert/strict";
import { after, test } from "node:test";
import { AuthService } from "../services/auth-service.js";
import { RedisRepository } from "../repositories/redis-repository.js";
import { UserRepository } from "../repositories/user-repository.js";

const redisRepository = new RedisRepository();
after(() => redisRepository.disconnect());

test("register and login issue tokens and persist session", async () => {
  const authService = new AuthService(new UserRepository(), redisRepository);
  const unique = Date.now();
  const email = `alice-${unique}@example.com`;

  const registered = await authService.register({
    username: `alice-${unique}`,
    email,
    password: "supersecret",
    fullName: "Alice Example",
  });

  assert.ok(registered.tokens.accessToken);
  assert.ok(registered.tokens.refreshToken);

  const loggedIn = await authService.login({ identifier: email, password: "supersecret" });
  assert.equal(loggedIn.user.id, registered.user.id);
  assert.ok(loggedIn.tokens.accessToken);
});
