import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, test } from "node:test";
import { pool } from "@workspace/db";
import { PaymentRequestError, PaymentService } from "../services/payment-service.js";
import { RazorpayService } from "../services/razorpay-service.js";
import { UserRepository } from "../repositories/user-repository.js";
import { createTestUser } from "./test-helpers.js";

const userIds: string[] = [];
const orderIds: string[] = [];
const paymentIds: string[] = [];

after(async () => {
  try {
    if (paymentIds.length) await pool.query("DELETE FROM ledger_transactions WHERE reference_id = ANY($1::text[])", [paymentIds]);
    if (orderIds.length) await pool.query("DELETE FROM payment_orders WHERE id = ANY($1::uuid[])", [orderIds]);
    if (orderIds.length) await pool.query("DELETE FROM checkout_intents WHERE id = ANY($1::uuid[])", [orderIds]);
    if (userIds.length) await pool.query("DELETE FROM users WHERE id = ANY($1::uuid[])", [userIds]);
  } finally {
    await pool.end();
  }
});

test("payment reconciliation survives provider retry and concurrent duplicate webhook delivery", async () => {
  const users = new UserRepository();
  const payer = await createTestUser(users);
  const creator = await createTestUser(users);
  userIds.push(payer.id, creator.id);
  const id = randomUUID();
  const providerOrderId = `reconcile-${randomUUID()}`;
  const providerPaymentId = `payment-${randomUUID()}`;
  const referenceId = `razorpay:${providerOrderId}`;
  orderIds.push(id);
  paymentIds.push(referenceId);
  await pool.query(`
    INSERT INTO payment_orders (id, payer_id, creator_id, provider, provider_order_id, amount_minor, currency, status)
    VALUES ($1, $2, $3, 'razorpay', $4, 1234, 'INR', 'created')
  `, [id, payer.id, creator.id, providerOrderId]);
  await pool.query(`
    INSERT INTO checkout_intents
      (id, product, owner_id, idempotency_key, input_hash, provider_order_id, amount_minor, currency, legacy, status)
    VALUES ($1, 'tip', $2, $1, 'legacy-test', $3, 1234, 'INR', true, 'created')
  `, [id, payer.id, providerOrderId]);

  let providerAvailable = false;
  const fakeProvider = {
    assertConfigured() {},
    async getOrder(orderId: string) {
      return { id: orderId, amount: 1234, currency: "INR", receipt: null, notes: {} };
    },
    async getPayment(paymentId: string) {
      if (!providerAvailable) throw new Error("mock provider temporarily unavailable");
      return { id: paymentId, order_id: providerOrderId, amount: 1234, currency: "INR", status: "captured" };
    },
  } as unknown as RazorpayService;
  const service = new PaymentService(fakeProvider);

  await assert.rejects(service.reconcileCapturedPayment({ orderId: providerOrderId, paymentId: providerPaymentId }), /temporarily unavailable/);
  const beforeRetry = (await pool.query<{ status: string }>("SELECT status FROM payment_orders WHERE id = $1", [id])).rows[0];
  assert.equal(beforeRetry.status, "created");

  providerAvailable = true;
  const deliveries = await Promise.all(Array.from({ length: 5 }, () => service.reconcileCapturedPayment({
    orderId: providerOrderId,
    paymentId: providerPaymentId,
  })));
  assert.equal(new Set(deliveries.map((delivery) => delivery.transactionId)).size, 1);
  assert.ok(deliveries.every((delivery) => delivery.status === "paid"));

  const settledOrder = (await pool.query<{ status: string; provider_payment_id: string }>(
    "SELECT status, provider_payment_id FROM payment_orders WHERE id = $1", [id],
  )).rows[0];
  const ledger = (await pool.query<{ count: string; amount_minor: string }>(
    "SELECT count(*)::text AS count, sum(amount_minor)::text AS amount_minor FROM ledger_transactions WHERE reference_id = $1", [referenceId],
  )).rows[0];
  assert.equal(settledOrder.status, "paid");
  assert.equal(settledOrder.provider_payment_id, providerPaymentId);
  assert.equal(Number(ledger.count), 1);
  assert.equal(Number(ledger.amount_minor), 1234);
  await assert.rejects(
    service.reconcileCapturedPayment({ orderId: providerOrderId, paymentId: `different-${randomUUID()}` }),
    PaymentRequestError,
  );
});