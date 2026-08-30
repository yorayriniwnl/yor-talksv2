import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { setTimeout } from "node:timers/promises";
import { test } from "node:test";
import { RedisRepository } from "../repositories/redis-repository.js";

test("socket budgets are atomic across connections and expire", async (t) => {
  const first = new RedisRepository();
  const second = new RedisRepository();
  const key = `test:socket-budget:${randomUUID()}`;
  t.after(async () => {
    await first.delStrict(key);
    await Promise.all([first.disconnect(), second.disconnect()]);
  });
  const attempts = await Promise.all(Array.from({ length: 12 }, (_, index) =>
    (index % 2 ? first : second).consumeBudgetStrict(key, 5, 1),
  ));
  assert.equal(attempts.filter(Boolean).length, 5);
  assert.equal(await first.consumeBudgetStrict(key, 5, 1), false);
  await setTimeout(1100);
  assert.equal(await second.consumeBudgetStrict(key, 5, 1), true);
});
