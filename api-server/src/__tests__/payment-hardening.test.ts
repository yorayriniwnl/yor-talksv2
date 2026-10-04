import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { test } from "node:test";
import { db } from "@workspace/db";
import { createProductSchema } from "../validators/product.js";
import { MarketplaceService } from "../services/marketplace-service.js";
import { PaymentsNotConfiguredError, PaymentProviderError, RazorpayService } from "../services/razorpay-service.js";
import { PaymentWebhookService } from "../services/payment-webhook-service.js";
import { env } from "../config/env.js";

test("marketplace prices cannot exceed the integer minor-unit ledger ceiling", () => {
  const product = {
    title: "Desk lamp",
    description: "Working condition",
    price: 21_474_836.47,
    mediaIds: [],
    category: "home",
    condition: "used",
    contentRating: "regular",
  };
  assert.equal(createProductSchema.safeParse(product).success, true);
  assert.equal(createProductSchema.safeParse({ ...product, price: 21_474_836.48 }).success, false);
});

test('dispute adapter validates current provider amounts, currency and payment association fields',async t=>{
  const original={...env};Object.assign(env,{PAYMENTS_ENABLED:true,RAZORPAY_KEY_ID:'rzp_test_synthetic',RAZORPAY_KEY_SECRET:'synthetic-key',RAZORPAY_WEBHOOK_SECRET:'synthetic-hook'});t.after(()=>Object.assign(env,original));
  const valid={id:'disp_synthetic',payment_id:'pay_synthetic',amount:500,amount_deducted:100,currency:'INR',status:'won'};
  let current:unknown=valid;
  t.mock.method(globalThis,'fetch',async()=>new Response(JSON.stringify(current),{status:200}));
  const provider=new RazorpayService();assert.equal((await provider.getDispute(valid.id)).amount_deducted,100);
  for(const changed of [{id:'disp_other'},{payment_id:null},{amount:-1},{amount_deducted:501},{currency:'USD'},{status:'unknown'}]){
    current={...valid,...changed};await assert.rejects(provider.getDispute(valid.id),PaymentProviderError);
  }
});

test("marketplace order creation checks the payment gate before touching the database", async (t) => {
  let databaseReads = 0;
  t.mock.method(db, "select", (() => {
    databaseReads++;
    throw new Error("database access is not allowed in this test");
  }) as typeof db.select);
  const razorpay = {
    assertConfigured() { throw new PaymentsNotConfiguredError(); },
  } as unknown as RazorpayService;
  const contentSafety = { isVisible: async () => true } as never;
  const service = new MarketplaceService(razorpay, contentSafety);

  await assert.rejects(() => service.createOrder({
    buyerId: "10000000-0000-4000-8000-000000000001",
    productId: "10000000-0000-4000-8000-000000000002",
    shippingName: "Test Buyer",
    shippingAddress: "Test Address",
  }), PaymentsNotConfiguredError);
  assert.equal(databaseReads, 0);
});

test("Razorpay order responses must match the requested amount and currency", async (t) => {
  const previous = {
    enabled: env.PAYMENTS_ENABLED,
    keyId: env.RAZORPAY_KEY_ID,
    keySecret: env.RAZORPAY_KEY_SECRET,
    webhookSecret: env.RAZORPAY_WEBHOOK_SECRET,
  };
  Object.assign(env, {
    PAYMENTS_ENABLED: true,
    RAZORPAY_KEY_ID: "key_test_mock",
    RAZORPAY_KEY_SECRET: "secret_test_mock",
    RAZORPAY_WEBHOOK_SECRET: "webhook_test_mock",
  });
  t.after(() => Object.assign(env, previous));
  let providerCalls = 0;
  t.mock.method(globalThis, "fetch", (async () => {
    providerCalls++;
    return new Response(JSON.stringify({ id: "order_test_mock", amount: 99, currency: "USD", status: "created" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch);

  const razorpay = new RazorpayService();
  await assert.rejects(() => razorpay.createOrder({ amountMinor: 100, receipt: "receipt_test", notes: {} }), PaymentProviderError);
  assert.equal(providerCalls, 1);
});

test("signed captured-payment webhooks dispatch to exactly the matching payment flow", async () => {
  const captured: string[] = [];
  const handler = (id: string, orderId: string) => ({
    hasProviderOrder: async (candidate: string) => candidate === orderId,
    hasProviderPayment: async () => false,
    reconcileCapturedPayment: async () => { captured.push(id); },
    reconcileRefund: async () => false,
  });
  const razorpay = { verifyWebhookSignature: () => true } as unknown as RazorpayService;
  const service = new PaymentWebhookService(razorpay, [
    handler("tip", "order_tip"),
    handler("membership", "order_membership"),
    handler("marketplace", "order_marketplace"),
  ]);
  const event = { event: "payment.captured", payload: { payment: { entity: { id: "pay_1", order_id: "order_marketplace" } } } };

  await service.handle(event, Buffer.from(JSON.stringify(event)), "signed");
  assert.deepEqual(captured, ["marketplace"]);
});

test("processed refund webhooks validate amount and route using provider payment id", async () => {
  const received: Array<{ id: string; paymentId: string; amountMinor: number }> = [];
  const handler = {
    hasProviderOrder: async () => false,
    hasProviderPayment: async (paymentId: string) => paymentId === "pay_2",
    reconcileCapturedPayment: async () => undefined,
    reconcileRefund: async (refund: { id: string; paymentId: string; amountMinor: number }) => {
      received.push(refund);
      return true;
    },
  };
  const razorpay = { verifyWebhookSignature: () => true } as unknown as RazorpayService;
  const service = new PaymentWebhookService(razorpay, [handler]);
  const event = {
    event: "refund.processed",
    payload: { refund: { entity: { id: "rfnd_1", payment_id: "pay_2", amount: 250, currency: "INR", status: "processed" } } },
  };

  await service.handle(event, Buffer.from(JSON.stringify(event)), "signed");
  assert.deepEqual(received, [{ id: "rfnd_1", paymentId: "pay_2", amountMinor: 250, currency: "INR" }]);
  await assert.rejects(() => service.handle({
    ...event,
    payload: { refund: { entity: { ...event.payload.refund.entity, amount: 0 } } },
  }, Buffer.from("invalid-refund"), "signed"));
});

test("payment webhooks reject invalid raw-body signatures before dispatch", async () => {
  let matched = false;
  const handler = {
    hasProviderOrder: async () => { matched = true; return true; },
    hasProviderPayment: async () => false,
    reconcileCapturedPayment: async () => undefined,
    reconcileRefund: async () => false,
  };
  const secret = "local-webhook-test-secret";
  const razorpay = {
    verifyWebhookSignature: (body: Buffer, signature: string) =>
      signature === createHmac("sha256", secret).update(body).digest("hex"),
  } as unknown as RazorpayService;
  const service = new PaymentWebhookService(razorpay, [handler]);
  const event = { event: "payment.captured", payload: { payment: { entity: { id: "pay_3", order_id: "order_3" } } } };
  const rawBody = Buffer.from(JSON.stringify(event));

  await assert.rejects(() => service.handle(event, rawBody, "invalid-signature"));
  assert.equal(matched, false);
});
