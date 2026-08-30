import assert from "node:assert/strict";
import { test } from "node:test";
import express from "express";
import { scopedAuthRateLimiter } from "../middlewares/rate-limit.js";

test("feed traffic and approval polling cannot exhaust the sign-in allowance", async (t) => {
  const app = express();
  app.use('/api', scopedAuthRateLimiter);
  app.use((_req, res) => res.json({ success: true }));
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  t.after(() => new Promise<void>((resolve) => { server.closeAllConnections(); server.close(() => resolve()); }));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}/api`;
  for (let i = 0; i < 45; i++) {
    const feed = await fetch(`${base}/feed`);
    assert.equal(feed.status, 200); await feed.text();
    const polling = await fetch(`${base}/auth/2fa/challenges`);
    assert.equal(polling.status, 200); await polling.text();
  }
  for (let i = 0; i < 40; i++) {
    const login = await fetch(`${base}/auth/login`, { method: 'POST' });
    assert.equal(login.status, 200); await login.text();
  }
  const rejected = await fetch(`${base}/auth/login`, { method: 'POST' });
  assert.equal(rejected.status, 429);
  assert.ok(Number(rejected.headers.get('Retry-After')) > 0);
  await rejected.text();
});
