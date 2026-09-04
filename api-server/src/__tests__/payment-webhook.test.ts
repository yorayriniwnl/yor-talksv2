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