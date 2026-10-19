import assert from "node:assert/strict";
import { once } from "node:events";
import { test } from "node:test";
import express from "express";
import { errorHandler } from "../middlewares/error-handler.js";
import { capturePaymentWebhookBody } from "../middlewares/payment-webhook-body.js";

test("only payment webhook paths retain exact signed bytes; account requests do not duplicate secrets", async () => {
  const app = express();
  app.use(express.json({ verify: capturePaymentWebhookBody }));
  app.use((req, res) => {
    const raw = (req as typeof req & { rawBody?: Buffer }).rawBody;
    res.json({ raw: raw?.toString("utf8") ?? null });
  });
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  try {
    const body = '{ "synthetic": "private-value" }';
    for (const path of ["/api/auth/login", "/api/v1/auth/reset-password", "/api/users/me", "/api/economy/webhooks/razorpay/extra",
      "/api/economy/webhooks/razorpay", "/api/v1/economy/webhooks/razorpay/", "/API/ECONOMY/WEBHOOKS/RAZORPAY?test=1"]) {
      const response = await fetch(`http://127.0.0.1:${address.port}${path}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body,
      });
      const retained = !path.endsWith("/extra") && path.toLowerCase().includes("/economy/webhooks/razorpay");
      assert.deepEqual(await response.json(), { raw: retained ? body : null });
    }
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});

test("request parser rejects invalid bodies with safe client errors before handlers run", async () => {
  const app = express();
  let handlerCalls = 0;
  app.use(express.json({ limit: "128b" }));
  app.use(express.urlencoded({ extended: true, parameterLimit: 2 }));
  app.post("/synthetic", (_req, res) => { handlerCalls++; res.json({ ok: true }); });
  app.use(errorHandler);
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const url = `http://127.0.0.1:${address.port}/synthetic`;
  const marker = "synthetic-private-password";
  try {
    for (const fixture of [
      { contentType: "application/json", body: `{"password":"${marker}",`, status: 400, code: "invalid_request_body" },
      { contentType: "application/json", body: JSON.stringify({ password: marker.repeat(10) }), status: 413, code: "request_body_too_large" },
      { contentType: "application/x-www-form-urlencoded", body: `a=${marker}&b=2&c=3`, status: 413, code: "too_many_parameters" },
      { contentType: "application/json; charset=unsupported", body: marker, status: 415, code: "unsupported_charset" },
    ]) {
      const response = await fetch(url, { method: "POST", headers: { "Content-Type": fixture.contentType }, body: fixture.body });
      assert.equal(response.status, fixture.status);
      const body = await response.json() as { success: boolean; errors: string[] };
      assert.equal(body.success, false);
      assert.deepEqual(body.errors, [fixture.code]);
      assert.ok(!JSON.stringify(body).includes(marker));
    }
    assert.equal(handlerCalls, 0);
    assert.equal((await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" })).status, 200);
    assert.equal(handlerCalls, 1);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});

test("unexpected errors stay private in every environment and headers already sent delegate", async () => {
  const app = express();
  app.get("/synthetic", () => { throw new Error("synthetic-query-password-private"); });
  app.use(errorHandler);
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  try {
    const response = await fetch(`http://127.0.0.1:${address.port}/synthetic`);
    assert.equal(response.status, 500);
    assert.ok(!(await response.text()).includes("synthetic-query-password-private"));
    const error = new Error("already sent");
    let forwarded: unknown;
    errorHandler(error, {} as never, { headersSent: true } as never, value => { forwarded = value; });
    assert.equal(forwarded, error);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});
