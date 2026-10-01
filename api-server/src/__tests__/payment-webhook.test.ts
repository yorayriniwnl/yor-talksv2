import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { test } from "node:test";
import { env } from "../config/env.js";
import { RazorpayService } from "../services/razorpay-service.js";

test("Razorpay webhook signatures require the configured secret", (t) => {
  const previous = { enabled: env.PAYMENTS_ENABLED, secret: env.RAZORPAY_WEBHOOK_SECRET };
  env.PAYMENTS_ENABLED = true;
  env.RAZORPAY_WEBHOOK_SECRET = "webhook-test-secret";
  t.after(() => {
    env.PAYMENTS_ENABLED = previous.enabled;
    env.RAZORPAY_WEBHOOK_SECRET = previous.secret;
  });
  const body = Buffer.from('{"event":"payment.captured"}');
  const signature = createHmac("sha256", env.RAZORPAY_WEBHOOK_SECRET).update(body).digest("hex");
  const service = new RazorpayService();
  assert.equal(service.verifyWebhookSignature(body, signature), true);
  assert.equal(service.verifyWebhookSignature(body, "invalid"), false);
});

test("Razorpay payment signatures bind both order and payment identifiers", (t) => {
  const previous = { enabled: env.PAYMENTS_ENABLED, secret: env.RAZORPAY_KEY_SECRET };
  env.PAYMENTS_ENABLED = true;
  env.RAZORPAY_KEY_SECRET = "payment-test-secret";
  t.after(() => {
    env.PAYMENTS_ENABLED = previous.enabled;
    env.RAZORPAY_KEY_SECRET = previous.secret;
  });
  const signature = createHmac("sha256", env.RAZORPAY_KEY_SECRET)
    .update("order_test|payment_test")
    .digest("hex");
  const service = new RazorpayService();
  assert.equal(service.verifySignature("order_test", "payment_test", signature), true);
  assert.equal(service.verifySignature("order_other", "payment_test", signature), false);
  assert.equal(service.verifySignature("order_test", "payment_test", "00"), false);
});

test("Razorpay order requests use the provider API with configured mock credentials", async (t) => {
  const previous = {
    enabled: env.PAYMENTS_ENABLED,
    keyId: env.RAZORPAY_KEY_ID,
    keySecret: env.RAZORPAY_KEY_SECRET,
    webhookSecret: env.RAZORPAY_WEBHOOK_SECRET,
    fetch: globalThis.fetch,
  };
  env.PAYMENTS_ENABLED = true;
  env.RAZORPAY_KEY_ID = "mock-key";
  env.RAZORPAY_KEY_SECRET = "mock-secret";
  env.RAZORPAY_WEBHOOK_SECRET = "mock-webhook-secret";
  let request: { url: string; authorization: string; body: Record<string, unknown> } | undefined;
  globalThis.fetch = (async (input, init) => {
    request = {
      url: String(input),
      authorization: new Headers(init?.headers).get("Authorization") ?? "",
      body: JSON.parse(String(init?.body)) as Record<string, unknown>,
    };
    return Response.json({ id: "order_mock", amount: 500, currency: "INR", status: "created" });
  }) as typeof fetch;
  t.after(() => {
    env.PAYMENTS_ENABLED = previous.enabled;
    env.RAZORPAY_KEY_ID = previous.keyId;
    env.RAZORPAY_KEY_SECRET = previous.keySecret;
    env.RAZORPAY_WEBHOOK_SECRET = previous.webhookSecret;
    globalThis.fetch = previous.fetch;
  });

  const order = await new RazorpayService().createOrder({
    amountMinor: 500,
    receipt: "yor_receipt",
    notes: { purpose: "test" },
  });
  assert.equal(order.id, "order_mock");
  assert.equal(request?.url, "https://api.razorpay.com/v1/orders");
  assert.equal(request?.authorization, `Basic ${Buffer.from("mock-key:mock-secret").toString("base64")}`);
  assert.equal(request?.body.amount, 500);
  assert.equal(request?.body.currency, "INR");
});