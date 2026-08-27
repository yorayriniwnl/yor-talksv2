import assert from "node:assert/strict";
import { test } from "node:test";
import { isRedisCompatibleVersion } from "../lib/redis-compat.js";

test("Redis compatibility accepts BullMQ-supported versions", () => {
  assert.equal(isRedisCompatibleVersion("5.0.0"), true);
  assert.equal(isRedisCompatibleVersion("7.2.4"), true);
  assert.equal(isRedisCompatibleVersion("8.0.0"), true);
});

test("Redis compatibility rejects missing, malformed, and legacy versions", () => {
  assert.equal(isRedisCompatibleVersion(undefined), false);
  assert.equal(isRedisCompatibleVersion(""), false);
  assert.equal(isRedisCompatibleVersion("4.0.14"), false);
  assert.equal(isRedisCompatibleVersion("not-a-version"), false);
});
