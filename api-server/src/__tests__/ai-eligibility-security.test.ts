import assert from "node:assert/strict";
import { after, test, type TestContext } from "node:test";
import express from "express";
import jwt from "jsonwebtoken";
import { db, pool } from "@workspace/db";
import { env } from "../config/env.js";
import { aiRoutes } from "../routes/ai.js";
import { ai } from "../services/ai/AIGateway.js";
import { EligibilityService } from "../services/eligibility-service.js";
import { RedisRepository } from "../repositories/redis-repository.js";
import { UserRepository } from "../repositories/user-repository.js";
import { PostRepository } from "../repositories/post-repository.js";
import { ContentSafetyService } from "../services/content-safety-service.js";
import { ContactShieldService } from "../services/contact-shield-service.js";
import { closeAuthenticationDependencies } from "../middlewares/auth.js";
import { closeRateLimitRedis } from "../middlewares/rate-limit.js";

after(async () => { await closeAuthenticationDependencies(); await closeRateLimitRedis(); await pool.end(); });

async function fixture(t: TestContext) {
  const id = "10000000-0000-4000-8000-000000000001";
  const state = { allowed: true, checks: 0, providerCalls: 0, revokeDuringContext: false, revokeDuringProvider: false,
    revokeDuringSearch: false, failAfterProvider: false };
  t.mock.method(RedisRepository.prototype, "getStrict", async () => "synthetic-session");
  t.mock.method(UserRepository.prototype, "findById", async () => ({ id, role: "user", permissions: [], accountStatus: "active", authVersion: 0 }));
  t.mock.method(EligibilityService.prototype, "decisionFor", async () => {
    state.checks++;
    if (state.providerCalls && state.failAfterProvider) throw new Error("synthetic authority outage");
    return { activated: state.allowed, capabilities: { ai: state.allowed }, reason: state.allowed ? null : "verification_required" } as never;
  });
  t.mock.method(db, "select", () => ({
    from: () => ({ innerJoin: () => ({ where: async () => {
      if (state.revokeDuringContext) state.allowed = false;
      return [{ name: "synthetic-topic" }];
    } }) }),
  }) as never);
  const provider = async () => {
    state.providerCalls++;
    if (state.revokeDuringProvider) state.allowed = false;
  };
  t.mock.method(ai, "chat", async () => { await provider(); return "private-generated-result"; });
  t.mock.method(ai, "moderateContent", async () => { await provider(); return { isToxic: false, score: 0, flags: [] }; });
  t.mock.method(ContactShieldService.prototype, "getShieldedUserIds", async () => new Set<string>());
  t.mock.method(ContentSafetyService.prototype, "getViewerFilter", async () => ({}) as never);
  t.mock.method(PostRepository.prototype, "search", async () => []);
  t.mock.method(ContentSafetyService.prototype, "filterVisibleByAuthor", async () => {
    if (state.revokeDuringSearch) state.allowed = false;
    return [{ id: "private-search-result", authorId: id, content: "synthetic-private-content" }] as never;
  });
  const app = express(); app.use(express.json());
  app.use("/api/ai", aiRoutes); app.use("/api/v1/ai", aiRoutes);
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>(resolve => server.once("listening", resolve));
  t.after(() => new Promise<void>(resolve => { server.closeAllConnections(); server.close(() => resolve()); }));
  const address = server.address(); assert.ok(address && typeof address !== "string");
  const token = jwt.sign({ sub: id, deviceId: "synthetic-device", authVersion: 0 }, env.JWT_SECRET, { expiresIn: "5m" });
  const request = (prefix: string, path: string) => fetch(`http://127.0.0.1:${address.port}${prefix}/ai${path}`, {
    method: path.startsWith("/search") ? "GET" : "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    ...(path.startsWith("/search") ? {} : { body: JSON.stringify({ message: "synthetic message", text: "synthetic text" }) }),
  });
  return { state, request };
}

test("unknown or revoked accounts cannot call AI providers through either API prefix", async t => {
  const f = await fixture(t); f.state.allowed = false;
  for (const prefix of ["/api", "/api/v1"]) for (const path of ["/chat", "/moderate", "/search?q=test"]) {
    assert.equal((await f.request(prefix, path)).status, 403);
  }
  assert.equal(f.state.providerCalls, 0);
});

test("AI chat rechecks capability after context loading before contacting the provider", async t => {
  const f = await fixture(t); f.state.revokeDuringContext = true;
  for (const prefix of ["/api", "/api/v1"]) {
    f.state.allowed = true;
    const response = await f.request(prefix, "/chat");
    assert.equal(response.status, 403); assert.equal(f.state.providerCalls, 0);
  }
});

test("AI chat and moderation cannot deliver a result after provider-time revocation", async t => {
  const f = await fixture(t); f.state.revokeDuringProvider = true;
  for (const prefix of ["/api", "/api/v1"]) for (const path of ["/chat", "/moderate"]) {
    f.state.allowed = true;
    const response = await f.request(prefix, path);
    assert.equal(response.status, 403);
    assert.doesNotMatch(await response.text(), /private-generated-result|analysis/);
  }
  assert.equal(f.state.providerCalls, 4);
});

test("AI search cannot return content if capability is revoked during result hydration", async t => {
  const f = await fixture(t); f.state.revokeDuringSearch = true;
  for (const prefix of ["/api", "/api/v1"]) {
    f.state.allowed = true;
    const response = await f.request(prefix, "/search?q=test");
    assert.equal(response.status, 403);
    assert.doesNotMatch(await response.text(), /private-search-result|synthetic-private-content/);
  }
});

test("AI delivery fails closed on an authority outage and succeeds with current authority", async t => {
  const f = await fixture(t);
  const success = await f.request("/api", "/chat");
  assert.equal(success.status, 200); assert.match(await success.text(), /private-generated-result/);
  f.state.failAfterProvider = true;
  for (const path of ["/chat", "/moderate"]) {
    // Start with a clean admission; the injected failure occurs after this provider call.
    f.state.providerCalls = 0;
    const response = await f.request("/api/v1", path);
    assert.equal(response.status, 500);
    assert.doesNotMatch(await response.text(), /private-generated-result|synthetic authority outage|analysis/);
  }
});
