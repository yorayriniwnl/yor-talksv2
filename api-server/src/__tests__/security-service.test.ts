import assert from "node:assert/strict";
import { test } from "node:test";
import { SecurityService } from "../services/security-service.js";

test("audit events track abuse heuristics", () => {
  const securityService = new SecurityService();
  for (let index = 0; index < 5; index += 1) {
    securityService.createAuditEvent("spam", `user-1 action ${index}`);
  }

  assert.equal(securityService.detectAbuse("user-1", "spam"), true);
  assert.equal(securityService.getAuditLog().length, 5);
});
