import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createHmac, randomUUID } from 'node:crypto';
import express from 'express';
import jwt from 'jsonwebtoken';
import { pool } from '@workspace/db';
import { env } from '../config/env.js';
import { PlatformPremiumService } from '../services/platform-premium-service.js';
import { FeatureEntitlementService } from '../services/feature-entitlement-service.js';
import { RazorpayService } from '../services/razorpay-service.js';
import { PaymentWebhookService } from '../services/payment-webhook-service.js';
import { PaymentInboxService } from '../services/payment-inbox-service.js';
import { MessageService } from '../services/message-service.js';
import { ConversationRepository, MessageRepository } from '../repositories/message-repository.js';
import { UserRepository } from '../repositories/user-repository.js';
import { RedisRepository } from '../repositories/redis-repository.js';
import { closeAuthDependencies } from '../middlewares/auth.js';
import premiumRoutes from '../routes/premium.js';
import type { AIService } from '../services/ai-service.js';

// Real PostgreSQL/Redis; only the Razorpay network boundary is simulated.
const previous = { ...env };
Object.assign(env, { PAYMENTS_ENABLED: true, YOR_PREMIUM_ENABLED: true, YOR_PREMIUM_PRICE_MINOR: 19900,
  YOR_PREMIUM_DURATION_DAYS: 30, YOR_PREMIUM_TERMS_VERSION: `test-${randomUUID()}`,
  YOR_PREMIUM_REFUND_POLICY: 'Synthetic test terms only; not a commercial offer.', SUPPORT_EMAIL: 'test@example.test',
  RAZORPAY_KEY_ID: 'rzp_test_synthetic', RAZORPAY_KEY_SECRET: 'synthetic-key-secret', RAZORPAY_WEBHOOK_SECRET: 'synthetic-webhook-secret',
  RAZORPAY_ACCOUNT_ID: 'acc_synthetic', PAYMENT_EVENT_ENCRYPTION_KEY: 'synthetic-payment-encryption-key-0123456789' });
type ProviderOrder = Awaited<ReturnType<RazorpayService['getOrder']>>;
type ProviderPayment = Awaited<ReturnType<RazorpayService['getPayment']>>;
class Provider extends RazorpayService {
  orders = new Map<string, ProviderOrder>(); payments = new Map<string, ProviderPayment>(); calls = 0; uncertain = false;
  override async createOrder(input: { amountMinor: number; receipt: string; notes: Record<string, string> }) {
    this.calls++;
    const order = { id: `order_${randomUUID().replaceAll('-', '')}`, amount: input.amountMinor, currency: 'INR', status: 'created', receipt: input.receipt, notes: input.notes };
    this.orders.set(order.id, order);
    if (this.uncertain) throw new Error('Simulated timeout after provider accepted creation');
    return order;
  }
  override async getOrder(id: string) { const order = this.orders.get(id); assert.ok(order); return order; }
  override async findOrderByReceipt(receipt: string) { return [...this.orders.values()].find(order => order.receipt === receipt); }
  override async getPayment(id: string) { const payment = this.payments.get(id); assert.ok(payment); return payment; }
  override async getOrderPayments(id: string) { return [...this.payments.values()].filter(payment => payment.order_id === id && ['captured','refunded'].includes(payment.status)); }
  override async getPaymentRefunds(_id: string) { return []; }
  capture(orderId: string, status = 'captured') {
    const order = this.orders.get(orderId)!;
    const payment = { id: `pay_${randomUUID().replaceAll('-', '')}`, order_id: orderId, amount: order.amount, currency: order.currency, status };
    this.payments.set(payment.id, payment); return payment;
  }
}
const provider = new Provider(), service = new PlatformPremiumService(provider), entitlements = new FeatureEntitlementService();
const inbox = new PaymentInboxService(provider, new PaymentWebhookService(provider, [service]));
const userIds: string[] = [], eventIds: string[] = [], redis = new RedisRepository();
async function person() {
  const id = randomUUID(); userIds.push(id);
  await pool.query(`INSERT INTO users(id,username,email,password_hash,full_name,terms_version,terms_accepted_at,age_confirmed_at)
    VALUES($1,$2,$3,'synthetic-hash','Premium test',$4,now(),now())`, [id, `pre-${id.slice(0, 8)}`, `${id}@example.test`, env.TERMS_VERSION]);
  return id;
}
const input = () => ({ idempotencyKey: randomUUID(), acceptedTermsVersion: env.YOR_PREMIUM_TERMS_VERSION, acceptedPriceMinor: env.YOR_PREMIUM_PRICE_MINOR });
async function buy(userId: string) {
  const order = await service.createOrder(userId, input()); assert.ok(order.providerOrderId);
  const payment = provider.capture(order.providerOrderId);
  await service.reconcileCapturedPayment({ orderId: order.providerOrderId, paymentId: payment.id });
  return { order, payment };
}
async function event(payload: unknown) {
  const id = `evt_${randomUUID().replaceAll('-', '')}`; eventIds.push(id);
  const raw = Buffer.from(JSON.stringify({ account_id: env.RAZORPAY_ACCOUNT_ID, ...payload as object }));
  const signature = createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET).update(raw).digest('hex');
  await inbox.accept(raw, signature, id); return { id, raw, signature };
}
after(async () => {
  const orders = (await pool.query('SELECT id,provider_payment_id FROM premium_orders WHERE user_id=ANY($1::uuid[])', [userIds])).rows;
  for (const order of orders) {
    await pool.query('DELETE FROM ledger_transactions WHERE reference_id=$1 OR starts_with(reference_id,$2)', [`premium:${order.id}`, `premium:refund:${order.provider_payment_id}:`]);
    await pool.query('DELETE FROM background_jobs WHERE dedup_key=$1', [`premium:${order.id}`]);
  }
  await pool.query('DELETE FROM premium_access WHERE user_id=ANY($1::uuid[])', [userIds]);
  await pool.query('DELETE FROM premium_orders WHERE user_id=ANY($1::uuid[])', [userIds]);
  await pool.query('DELETE FROM premium_plans WHERE terms_version=$1', [env.YOR_PREMIUM_TERMS_VERSION]);
  await pool.query('DELETE FROM background_jobs WHERE dedup_key=ANY($1::text[])', [eventIds.map(id => `payment:event:${id}`)]);
  await pool.query('DELETE FROM payment_events WHERE event_id=ANY($1::text[])', [eventIds]);
  for (const id of userIds) await redis.delStrict(`session:${id}:premium-test`);
  await pool.query('DELETE FROM users WHERE id=ANY($1::uuid[])', [userIds]);
  await redis.disconnect(); await closeAuthDependencies(); await pool.end(); Object.assign(env, previous);
});

test('free accounts have no paid perks and one SQL query resolves the entire snapshot', async t => {
  const userId = await person();
  const original = pool.query.bind(pool); let calls = 0;
  t.mock.method(pool, 'query', (...args: any[]) => { calls++; return (original as any)(...args); });
  assert.equal(Object.values(await entitlements.getSnapshot(userId)).some(Boolean), false);
  assert.equal(calls, 1);
});

test('concurrent checkout and repeated client keys create a single durable provider order', async () => {
  const userId = await person(), request = input(), before = provider.calls;
  const orders = await Promise.all(Array.from({ length: 8 }, () => service.createOrder(userId, request)));
  assert.equal(new Set(orders.map(order => order.id)).size, 1); assert.equal(provider.calls - before, 1);
  assert.equal(await entitlements.hasFeature(userId, 'MESSAGE_FONT'), false);
  await assert.rejects(service.createOrder(userId, input()), /already pending/);
  await assert.rejects(service.createOrder(await person(), { ...input(), acceptedPriceMinor: 100 }), /price or terms changed/);
  await assert.rejects(service.getOrder(await person(), orders[0]!.id), /not found/);
});

test('temporary overrides are independent of payment, expire, and cannot defeat operational availability', async () => {
  const userId = await person();
  await pool.query(`INSERT INTO user_feature_overrides(user_id,feature_key,enabled,expires_at) VALUES($1,'MESSAGE_FONT',true,now()+interval '1 hour')`, [userId]);
  assert.equal(await entitlements.hasFeature(userId, 'MESSAGE_FONT'), true);
  assert.equal(await new FeatureEntitlementService(undefined, { MESSAGE_FONT: false }).hasFeature(userId, 'MESSAGE_FONT'), false);
  await pool.query(`UPDATE user_feature_overrides SET expires_at=now()-interval '1 second' WHERE user_id=$1`, [userId]);
  assert.equal(await entitlements.hasFeature(userId, 'MESSAGE_FONT'), false);
  await buy(userId);
  await pool.query(`UPDATE user_feature_overrides SET enabled=false,expires_at=now()+interval '1 hour' WHERE user_id=$1`, [userId]);
  assert.equal(await entitlements.hasFeature(userId, 'MESSAGE_FONT'), false);
  assert.equal(await entitlements.hasFeature(userId, 'STORY_FONT'), true);
});

test('failed payment attempts are visible and a later successful attempt on the same order grants access', async () => {
  const userId = await person(), order = await service.createOrder(userId, input());
  const failed = provider.capture(order.providerOrderId!, 'failed');
  const accepted = await event({ event: 'payment.failed', payload: { payment: { entity: failed } } });
  await inbox.process(accepted.id);
  assert.equal((await service.getOrder(userId, order.id)).lastPaymentStatus, 'failed');
  assert.equal(await entitlements.hasFeature(userId, 'MESSAGE_FONT'), false);
  provider.capture(order.providerOrderId!);
  await service.recover(userId, order.id);
  assert.equal((await service.getOrder(userId, order.id)).lastPaymentStatus, 'captured');
  assert.equal(await entitlements.hasFeature(userId, 'MESSAGE_FONT'), true);
  await service.reconcileFailedPayment({ orderId: order.providerOrderId!, paymentId: failed.id });
  assert.equal((await service.getOrder(userId, order.id)).lastPaymentStatus, 'captured');
});

test('closed checkout settles through encrypted durable webhook acceptance exactly once', async () => {
  const userId = await person(), order = await service.createOrder(userId, input());
  const payment = provider.capture(order.providerOrderId!);
  const accepted = await event({ event: 'payment.captured', payload: { payment: { entity: payment } } });
  assert.equal(await entitlements.hasFeature(userId, 'MESSAGE_FONT'), false);
  const stored = (await pool.query('SELECT * FROM payment_events WHERE event_id=$1', [accepted.id])).rows[0];
  assert.ok(stored.encrypted_payload.startsWith('v1:')); assert.ok(!stored.encrypted_payload.includes(payment.id));
  await Promise.all(Array.from({ length: 6 }, () => inbox.accept(accepted.raw, accepted.signature, accepted.id)));
  assert.equal(Number((await pool.query('SELECT count(*) FROM background_jobs WHERE dedup_key=$1', [`payment:event:${accepted.id}`])).rows[0].count), 1);
  await Promise.all(Array.from({ length: 6 }, () => inbox.process(accepted.id)));
  assert.equal(await entitlements.hasFeature(userId, 'MESSAGE_FONT'), true);
  assert.equal(Number((await pool.query('SELECT count(*) FROM ledger_transactions WHERE reference_id=$1', [`premium:${order.id}`])).rows[0].count), 1);
  const before = (await service.state(userId)).subscription.ends_at;
  await service.reconcileCapturedPayment({ orderId: order.providerOrderId!, paymentId: payment.id });
  assert.equal(String((await service.state(userId)).subscription.ends_at), String(before));
});

test('uncertain provider creation recovers by durable receipt without repeating the POST', async () => {
  const userId = await person(), before = provider.calls; provider.uncertain = true;
  let order;
  try { order = await service.createOrder(userId, input()); } finally { provider.uncertain = false; }
  assert.equal(order.status, 'creation_unknown'); assert.equal(order.providerOrderId, null);
  const matching = [...provider.orders.values()].find(value => value.notes?.localOrderId === order.id)!;
  provider.capture(matching.id);
  await service.recover(userId, order.id);
  assert.equal(provider.calls - before, 1); assert.equal(await entitlements.hasFeature(userId, 'MESSAGE_FONT'), true);
});

test('capture overtaking local provider binding recovers association from provider receipt and notes', async () => {
  const userId = await person(); provider.uncertain = true;
  let order;
  try { order = await service.createOrder(userId, input()); } finally { provider.uncertain = false; }
  const matching = [...provider.orders.values()].find(value => value.notes?.localOrderId === order.id)!;
  const payment = provider.capture(matching.id);
  const accepted = await event({ event: 'payment.captured', payload: { payment: { entity: payment } } });
  await inbox.process(accepted.id);
  assert.equal((await service.getOrder(userId, order.id)).status, 'paid');
});

test('amount, currency, receipt, order, signature and account tampering never grant access', async () => {
  const userId = await person(), order = await service.createOrder(userId, input()), payment = provider.capture(order.providerOrderId!);
  const original = { ...payment };
  for (const change of [{ amount: 100 }, { currency: 'USD' }, { order_id: 'order_wrong' }]) {
    Object.assign(payment, original, change);
    await assert.rejects(service.reconcileCapturedPayment({ orderId: order.providerOrderId!, paymentId: payment.id }), /mismatch/);
  }
  Object.assign(payment, original);
  const providerOrder = provider.orders.get(order.providerOrderId!)!, receipt = providerOrder.receipt;
  providerOrder.receipt = 'wrong';
  await assert.rejects(service.reconcileCapturedPayment({ orderId: order.providerOrderId!, paymentId: payment.id }), /mismatch/);
  providerOrder.receipt = receipt;
  await assert.rejects(service.verify(userId, order.id, { paymentId: payment.id, signature: '0'.repeat(64) }), /Invalid/);
  const raw = Buffer.from(JSON.stringify({ event: 'payment.captured', account_id: 'acc_wrong' }));
  await assert.rejects(inbox.accept(raw, '0'.repeat(64), 'evt_invalid'), /signature/);
  const signature = createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET).update(raw).digest('hex');
  await assert.rejects(inbox.accept(raw, signature, 'evt_invalid'), /account/);
  assert.equal(await entitlements.hasFeature(userId, 'MESSAGE_FONT'), false);
});

test('cancellation preserves paid access, expiry removes perks, and late cancelled captures require refund review', async () => {
  const userId = await person(), { order } = await buy(userId);
  await service.cancel(userId, order.id);
  assert.equal((await service.state(userId)).subscription.status, 'cancelled');
  assert.equal(await entitlements.hasFeature(userId, 'MESSAGE_FONT'), true);
  await pool.query(`UPDATE premium_access SET starts_at=now()-interval '31 days',ends_at=now()-interval '1 day' WHERE order_id=$1`, [order.id]);
  assert.equal((await service.state(userId)).subscription.status, 'expired');
  assert.equal(await entitlements.hasFeature(userId, 'MESSAGE_FONT'), false);
  const pending = await service.createOrder(userId, input()); await service.cancel(userId, pending.id);
  const late = provider.capture(pending.providerOrderId!);
  await service.reconcileCapturedPayment({ orderId: pending.providerOrderId!, paymentId: late.id });
  assert.equal((await service.getOrder(userId, pending.id)).status, 'refund_required');
  assert.equal(await entitlements.hasFeature(userId, 'MESSAGE_FONT'), false);
});

test('out-of-order refunds and later capture replays never restore access or duplicate accounting', async () => {
  const userId = await person(), order = await service.createOrder(userId, input());
  const payment = provider.capture(order.providerOrderId!, 'refunded');
  const refund = { id: `rfnd_${randomUUID().replaceAll('-', '')}`, payment_id: payment.id, amount: payment.amount, currency: 'INR', status: 'processed' };
  const accepted = await event({ event: 'refund.processed', payload: { refund: { entity: refund } } });
  await inbox.process(accepted.id); await inbox.process(accepted.id);
  await service.reconcileCapturedPayment({ orderId: order.providerOrderId!, paymentId: payment.id });
  assert.equal((await service.getOrder(userId, order.id)).status, 'refunded');
  assert.equal(await entitlements.hasFeature(userId, 'MESSAGE_FONT'), false);
  const ledger = await pool.query('SELECT amount_minor FROM ledger_transactions WHERE starts_with(reference_id,$1)', [`premium:refund:${payment.id}:`]);
  assert.equal(ledger.rowCount, 1); assert.equal(ledger.rows[0].amount_minor, payment.amount);
  await assert.rejects(service.reconcileRefund({ id: 'rfnd_overflow', paymentId: payment.id, amountMinor: 100 }), /exceed/);
  const altered = Buffer.from(JSON.stringify({ event: 'payment.failed', account_id: env.RAZORPAY_ACCOUNT_ID }));
  await assert.rejects(inbox.accept(altered, createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET).update(altered).digest('hex'), accepted.id), /reused/);
});

test('a settlement database failure rolls back money and access together, then replay succeeds', async () => {
  const userId = await person(), order = await service.createOrder(userId, input()), payment = provider.capture(order.providerOrderId!);
  await pool.query(`CREATE OR REPLACE FUNCTION synthetic_premium_fault() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic failure'; END $$`);
  await pool.query(`CREATE TRIGGER synthetic_premium_fault BEFORE INSERT ON premium_access FOR EACH ROW EXECUTE FUNCTION synthetic_premium_fault()`);
  try {
    await assert.rejects(service.reconcileCapturedPayment({ orderId: order.providerOrderId!, paymentId: payment.id }), /synthetic failure/);
    assert.equal((await service.getOrder(userId, order.id)).status, 'created');
    assert.equal(Number((await pool.query('SELECT count(*) FROM ledger_transactions WHERE reference_id=$1', [`premium:${order.id}`])).rows[0].count), 0);
  } finally {
    await pool.query('DROP TRIGGER synthetic_premium_fault ON premium_access');
    await pool.query('DROP FUNCTION synthetic_premium_fault()');
  }
  await service.reconcileCapturedPayment({ orderId: order.providerOrderId!, paymentId: payment.id });
  assert.equal(await entitlements.hasFeature(userId, 'MESSAGE_FONT'), true);
});

test('free/expired saved typography continues to send ordinary messages without changing existing content', async () => {
  const sender = await person(), recipient = await person();
  await pool.query(`UPDATE users SET message_font_id='mono' WHERE id=$1`, [sender]);
  const messages = new MessageService(new ConversationRepository(), new MessageRepository(), new UserRepository(),
    { moderate: async () => ({ spam: false, toxicity: false, nsfw: false }) } as unknown as AIService);
  const result = await messages.sendMessage(sender, recipient, 'An ordinary message after expiry');
  assert.equal(result.textStyleId, 'default'); assert.equal(result.content, 'An ordinary message after expiry');
  await assert.rejects(messages.sendMessage(sender, recipient, 'Invalid style', { textStyleId: 'url(evil)' as 'default' }), /not supported/);
});

test('real authenticated HTTP state enforces ownership, rejects client entitlement fields and cross-origin mutations', async () => {
  const userId = await person(), other = await person(), order = await service.createOrder(other, input());
  await redis.setStrict(`session:${userId}:premium-test`, 'synthetic-hash', 120);
  const token = jwt.sign({ sub: userId, deviceId: 'premium-test', type: 'access', authVersion: 0 }, env.JWT_SECRET, { expiresIn: '2m' });
  const app = express(); app.use(express.json()); app.use('/api', premiumRoutes);
  const server = app.listen(0, '127.0.0.1'); await new Promise<void>(resolve => server.once('listening', resolve));
  const address = server.address(); assert.ok(address && typeof address !== 'string');
  const url = `http://127.0.0.1:${address.port}/api`;
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  try {
    assert.equal((await fetch(`${url}/premium/me`)).status, 401);
    const result = await fetch(`${url}/premium/me`, { headers }); assert.equal(result.status, 200);
    const body = await result.json() as { data: { enabledFeatures: Record<string, boolean> } };
    assert.equal(Object.values(body.data.enabledFeatures).some(Boolean), false);
    assert.equal((await fetch(`${url}/premium/orders/${order.id}`, { headers })).status, 409);
    assert.equal((await fetch(`${url}/premium/orders`, { method: 'POST', headers, body: JSON.stringify({ ...input(), enabledFeatures: { MESSAGE_FONT: true } }) })).status, 400);
    assert.equal((await fetch(`${url}/premium/orders/${order.id}/cancel`, { method: 'POST', headers: { ...headers, Origin: 'https://untrusted.example.test' } })).status, 403);
  } finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); }
});
