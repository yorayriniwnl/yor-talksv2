import assert from "node:assert/strict";
import crypto from "node:crypto";
import { after, test } from "node:test";
import { SecurityService } from "../services/security-service.js";
import { RedisRepository } from "../repositories/redis-repository.js";

const redisRepository = new RedisRepository();
after(async () => {
  await redisRepository.disconnect();
});

test("audit events track abuse heuristics via Redis", async () => {
  const securityService = new SecurityService(redisRepository);
  const subject = `user-${crypto.randomUUID()}`;
  for (let index = 0; index < 5; index += 1) {
    securityService.createAuditEvent("spam", `test action ${index}`, subject);
  }

  await securityService.flush();

  assert.equal(await securityService.detectAbuse(subject, "spam"), true);
  assert.equal(await securityService.detectAbuse("user-2", "spam"), false);
  const log = await securityService.getAuditLog();
  const matchingEvents = log.filter((event) => event.message.startsWith("test action"));
  assert.equal(matchingEvents.length, 5);
  assert.ok(matchingEvents.every((event) => event.subject !== subject));
});
