import assert from "node:assert/strict";
import { test } from "node:test";
import express from "express";
import preregisterRoutes from "../routes/preregister.js";
import { authRateLimiter } from "../middlewares/rate-limit.js";

test("public signup is rate limited across API aliases without consuming the login allowance", async t => {
  const app = express();
  app.use(express.json());
  app.use("/api", preregisterRoutes);
  app.use("/api/v1", preregisterRoutes);
  app.post("/login", authRateLimiter, (_req, res) => res.json({ success: true }));
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>(resolve => server.once("listening", resolve));
  t.after(() => new Promise<void>(resolve => { server.closeAllConnections(); server.close(() => resolve()); }));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const base = `http://127.0.0.1:${address.port}`;
  for (let index = 0; index < 40; index++) {
    const mount = index % 2 ? "/api" : "/api/v1";
    // Malformed input exercises the real public route without writing a DB row.
    const reply = await fetch(`${base}${mount}/preregister`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: "{}",
    });
    assert.equal(reply.status, 400);
    assert.equal((await reply.json() as { success: boolean }).success, false);
  }
  for (const mount of ["/api", "/api/v1"]) {
    const reply = await fetch(`${base}${mount}/preregister`, { method: "POST" });
    assert.equal(reply.status, 429);
    assert.ok(Number(reply.headers.get("Retry-After")) > 0);
    assert.deepEqual((await reply.json() as { errors: string[] }).errors, ["rate_limit_exceeded"]);
  }
  const login = await fetch(`${base}/login`, { method: "POST" });
  assert.equal(login.status, 200);
  await login.text();
});
