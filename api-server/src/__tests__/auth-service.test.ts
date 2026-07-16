import assert from "node:assert/strict";
import { test } from "node:test";
import { AuthService } from "../services/auth-service.js";
import { RedisRepository } from "../repositories/redis-repository.js";
import { UserRepository } from "../repositories/user-repository.js";

test("register and login issue tokens and persist session", async () => {
  const authService = new AuthService(new UserRepository(), new RedisRepository());

  const registered = await authService.register({
    username: "alice",
    email: "alice@example.com",
    password: "supersecret",
    fullName: "Alice Example",
  });

  assert.ok(registered.tokens.accessToken);
  assert.ok(registered.tokens.refreshToken);

  const loggedIn = await authService.login({ identifier: "alice@example.com", password: "supersecret" });
  assert.equal(loggedIn.user.id, registered.user.id);
  assert.ok(loggedIn.tokens.accessToken);
});
