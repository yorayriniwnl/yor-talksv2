import assert from "node:assert/strict";
import { after, test } from "node:test";
import { SecurityService } from "../services/security-service.js";
import { RedisRepository } from "../repositories/redis-repository.js";

const redisRepository = new RedisRepository();
after(async () => {
  await redisRepository.disconnect();
});

test("audit events track abuse heuristics via Redis", async () => {
  const securityService = new SecurityService(redisRepository);
  for (let index = 0; index < 5; index += 1) {
    securityService.createAuditEvent("spam", `user-1 action ${index}`, "user-1");
  }

  await securityService.flush();

  assert.equal(await securityService.detectAbuse("user-1", "spam"), true);
  assert.equal(await securityService.detectAbuse("user-2", "spam"), false);
  const log = await securityService.getAuditLog();
  assert.ok(log.length >= 5);
});
