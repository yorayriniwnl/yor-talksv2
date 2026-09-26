import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createHmac, randomUUID } from 'node:crypto';
import express from 'express';
import jwt from 'jsonwebtoken';
import { pool } from '@workspace/db';
import { env } from '../config/env.js';
import { RazorpayService } from '../services/razorpay-service.js';
import { PaymentService } from '../services/payment-service.js';
import { SubscriptionService } from '../services/subscription-service.js';
import { MarketplaceService } from '../services/marketplace-service.js';
import { CheckoutIntentService } from '../services/checkout-intent-service.js';
import { PaymentWebhookService } from '../services/payment-webhook-service.js';
import { RedisRepository } from '../repositories/redis-repository.js';
import { closeAuthDependencies } from '../middlewares/auth.js';
import billingRoutes from '../routes/billing.js';

// PostgreSQL and Redis are real isolated services. Provider responses are
// simulated here; this suite makes no requests to a Razorpay merchant account.
const previous = { ...env };
Object.assign(env, { PAYMENTS_ENABLED: true, RAZORPAY_KEY_ID: 'rzp_test_synthetic', RAZORPAY_KEY_SECRET: 'synthetic-key', RAZORPAY_WEBHOOK_SECRET: 'synthetic-webhook', RAZORPAY_ACCOUNT_ID: 'acc_synthetic' });
type ProviderOrder = Awaited<ReturnType<RazorpayService['getOrder']>>;
type ProviderPayment = Awaited<ReturnType<RazorpayService['getPayment']>>;
type Refund = Awaited<ReturnType<RazorpayService['getPaymentRefunds']>>[number];
class Provider extends RazorpayService {
  orders = new Map<string, ProviderOrder>(); payments = new Map<string, ProviderPayment>(); refunds: Refund[] = [];
  calls = 0; uncertain = false;
  override async createOrder(input: { amountMinor: number; receipt: string; notes: Record<string, string> }) {
    this.calls++;
    const order = { id: `order_${randomUUID().replaceAll('-','')}`, amount: input.amountMinor, currency: 'INR', status: 'created', receipt: input.receipt, notes: input.notes };
    this.orders.set(order.id, order);
    if (this.uncertain) throw new Error('Synthetic timeout after provider acceptance');
    return order;
  }
  override async getOrder(id: string) { const value = this.orders.get(id); assert.ok(value); return value; }
  override async getPayment(id: string) { const value = this.payments.get(id); assert.ok(value); return value; }
  override async findOrderByReceipt(receipt: string) { return [...this.orders.values()].find(order => order.receipt === receipt); }
  override async getOrderPayments(id: string) { return [...this.payments.values()].filter(payment => payment.order_id === id && ['captured','refunded'].includes(payment.status)); }
  override async getPaymentRefunds(id: string, skip = 0) { return this.refunds.filter(item => item.payment_id === id).slice(skip,skip+100); }
  capture(id: string, status = 'captured') {
    const order = this.orders.get(id)!;
    const payment = { id: `pay_${randomUUID().replaceAll('-','')}`, order_id: id, amount: order.amount, currency: order.currency, status };
    this.payments.set(payment.id, payment); return payment;
  }
  refund(payment: ProviderPayment, amount = payment.amount) {
    const item = { id: `rfnd_${randomUUID().replaceAll('-','')}`, payment_id: payment.id, amount, currency: 'INR', status: 'processed' };
    this.refunds.push(item); return item;
  }
}
const provider = new Provider(), tips = new PaymentService(provider), memberships = new SubscriptionService(provider), market = new MarketplaceService(provider), intents = new CheckoutIntentService(provider);
const webhook = new PaymentWebhookService(provider, [tips, memberships, market]);
const userIds: string[] = [], productIds: string[] = [], redis = new RedisRepository();
async function person() {
  const id = randomUUID(); userIds.push(id);
  await pool.query(`INSERT INTO users(id,username,email,password_hash,full_name,terms_version,terms_accepted_at,age_confirmed_at)
    VALUES($1,$2,$3,'synthetic-hash','Checkout test',$4,now(),now())`, [id,`chk-${id.slice(0,8)}`,`${id}@example.test`,env.TERMS_VERSION]);
  return id;
}
async function product(sellerId: string) {
  const id = randomUUID(); productIds.push(id);
  await pool.query(`INSERT INTO products(id,seller_id,title,description,price,category,condition) VALUES($1,$2,'Synthetic item','Test only',50,'Other','used')`, [id,sellerId]);
  return id;
}
const shipping = { shippingName: 'Test buyer', shippingAddress: 'Synthetic local address' };
const signature = (orderId: string, paymentId: string) => createHmac('sha256',env.RAZORPAY_KEY_SECRET).update(`${orderId}|${paymentId}`).digest('hex');
const state = async (id: string) => intents.publicState(await intents.get(id));
const balance = async (id: string) => Number((await pool.query(`SELECT coalesce(sum(CASE WHEN credit_account_id=$1 THEN amount_minor ELSE 0 END),0)-coalesce(sum(CASE WHEN debit_account_id=$1 THEN amount_minor ELSE 0 END),0) AS amount FROM ledger_transactions`,[id])).rows[0].amount);
async function delivered(event: string, entityType: string, entity: unknown) {
  const raw = Buffer.from(JSON.stringify({ event, account_id: env.RAZORPAY_ACCOUNT_ID, payload: { [entityType]: { entity } } }));
  return webhook.handle(null, raw, createHmac('sha256',env.RAZORPAY_WEBHOOK_SECRET).update(raw).digest('hex'));
}
after(async () => {
  const orderIds = (await pool.query('SELECT id FROM checkout_intents WHERE owner_id=ANY($1::uuid[])',[userIds])).rows.map(row => row.id);
  const providerIds = [...provider.orders.keys()], paymentIds = [...provider.payments.keys()];
  await pool.query(`DELETE FROM ledger_transactions WHERE credit_account_id=ANY($1::uuid[]) OR debit_account_id=ANY($1::uuid[])
    OR split_part(reference_id,':',2)=ANY($2::text[]) OR split_part(reference_id,':',3)=ANY($3::text[])`,[userIds,providerIds,paymentIds]);
  await pool.query('DELETE FROM background_jobs WHERE dedup_key=ANY($1::text[])',[orderIds.map(id=>`checkout:${id}`)]);
  await pool.query('DELETE FROM checkout_intents WHERE id=ANY($1::uuid[])',[orderIds]);
  for (const table of ['payment_orders','subscription_orders','marketplace_orders']) await pool.query(`DELETE FROM ${table} WHERE id=ANY($1::uuid[])`,[orderIds]);
  await pool.query('DELETE FROM subscriptions WHERE subscriber_id=ANY($1::uuid[])',[userIds]);
  await pool.query('DELETE FROM products WHERE id=ANY($1::uuid[])',[productIds]);
  for (const id of userIds) await redis.delStrict(`session:${id}:checkout-test`);
  await pool.query('DELETE FROM users WHERE id=ANY($1::uuid[])',[userIds]);
  await redis.disconnect(); await closeAuthDependencies(); await pool.end(); Object.assign(env,previous);
});

test('concurrent tip retries create one provider order and exactly one capture/refund effect', async () => {
  const payerId=await person(), creatorId=await person(), before=provider.calls;
  const input={payerId,creatorId,amountMinor:500,idempotencyKey:randomUUID()};
  const results=await Promise.all(Array.from({length:8},()=>tips.createTipOrder(input)));
  assert.equal(new Set(results.map(item=>item.checkoutId)).size,1); assert.equal(provider.calls-before,1);
  const order=await tips.createTipOrder(input); assert.ok(order.providerOrderId);
  const payment=provider.capture(order.providerOrderId);
  await Promise.all(Array.from({length:8},()=>delivered('payment.captured','payment',payment)));
  assert.equal(await balance(creatorId),500);
  await assert.rejects(tips.createTipOrder({...input,amountMinor:600}),/different request/);
  await assert.rejects(tips.verifyTipPayment({payerId,orderId:order.providerOrderId,paymentId:payment.id,signature:'0'.repeat(64)}),/signature/);
  const refund=provider.refund(payment);
  await Promise.all(Array.from({length:8},()=>delivered('refund.processed','refund',refund)));
  assert.equal(await balance(creatorId),0); assert.equal((await state(order.checkoutId)).status,'refunded');
  await delivered('payment.captured','payment',payment);
  assert.equal((await state(order.checkoutId)).status,'refunded');
});

test('concurrent membership requests use one pending term and cancellation retains paid access', async () => {
  const subscriberId=await person(),creatorId=await person(),before=provider.calls;
  const results=await Promise.all(Array.from({length:5},()=>memberships.createOrder({subscriberId,creatorId,tier:'chai',idempotencyKey:randomUUID()})));
  assert.equal(new Set(results.map(item=>item.checkoutId)).size,1);assert.equal(provider.calls-before,1);
  const order=await state(results[0]!.checkoutId), payment=provider.capture(order.providerOrderId!);
  await intents.reconcile(order.checkoutId,memberships);
  const sub=await memberships.cancel(results[0]!.subscriptionId,subscriberId);
  assert.equal(sub.status,'active');assert.equal(sub.cancelAtPeriodEnd,true);
  assert.ok(new Date(`${sub.expiresAt!.replace(/Z$/,'')}Z`)>new Date());
  await assert.rejects(memberships.createOrder({subscriberId,creatorId,tier:'chai'}),/active membership/);
  provider.refund(payment,100);
  await intents.reconcile(order.checkoutId,memberships); // missed webhook repaired by provider reads
  const verify=await memberships.verifyPayment({subscriberId,subscriptionId:sub.id,orderId:order.providerOrderId!,paymentId:payment.id,signature:signature(order.providerOrderId!,payment.id)});
  assert.equal(verify.status,'refunded');
  assert.equal((await pool.query('SELECT status FROM entitlements WHERE entity_id=$1',[sub.id])).rows[0].status,'revoked');
  assert.equal(await balance(creatorId),4800);
});

test('cancelling pending membership before capture never grants access or credits its creator', async () => {
  const subscriberId=await person(),creatorId=await person();
  const order=await memberships.createOrder({subscriberId,creatorId,tier:'elite'});
  await memberships.cancel(order.subscriptionId,subscriberId);
  const payment=provider.capture(order.providerOrderId!);
  await intents.reconcile(order.checkoutId,memberships);
  assert.equal((await state(order.checkoutId)).status,'refund_required');assert.equal(await balance(creatorId),0);
  assert.equal((await pool.query('SELECT 1 FROM entitlements WHERE entity_id=$1',[order.subscriptionId])).rowCount,0);
  provider.refund(payment);await intents.reconcile(order.checkoutId,memberships);
  assert.equal(await balance(creatorId),0);
});

test('uncertain creation and capture before local binding recover without another provider POST', async () => {
  const payerId=await person(),creatorId=await person(),before=provider.calls;
  provider.uncertain=true;let order;
  try {order=await tips.createTipOrder({payerId,creatorId,amountMinor:600});} finally {provider.uncertain=false;}
  assert.equal(order.providerOrderId,null);assert.equal(order.providerState,'creation_unknown');
  const remote=[...provider.orders.values()].find(item=>item.notes?.localOrderId===order.checkoutId)!;
  const payment=provider.capture(remote.id);
  await delivered('payment.captured','payment',payment);
  await intents.reconcile(order.checkoutId,tips);
  assert.equal((await state(order.checkoutId)).status,'paid');assert.equal(provider.calls-before,1);assert.equal(await balance(creatorId),600);
  await assert.rejects(intents.owned(await person(),order.checkoutId),/not found/);
});

test('marketplace reservation races and late captures preserve the next buyer reservation', async () => {
  const seller=await person(),buyer=await person(),other=await person(),productId=await product(seller);
  provider.uncertain=true;let first;
  try {first=await market.createOrder({buyerId:buyer,productId,...shipping});}finally{provider.uncertain=false;}
  assert.equal(first.providerOrderId,null);assert.equal((await pool.query('SELECT availability FROM products WHERE id=$1',[productId])).rows[0].availability,'reserved');
  await assert.rejects(market.createOrder({buyerId:other,productId,...shipping}),/reserved/);
  const remote=[...provider.orders.values()].find(item=>item.notes?.localOrderId===first.checkoutId)!;
  await pool.query(`UPDATE marketplace_orders SET reservation_expires_at=timezone('UTC',now())-interval '1 second' WHERE id=$1`,[first.checkoutId]);
  const second=await market.createOrder({buyerId:other,productId,...shipping});
  const late=provider.capture(remote.id);await delivered('payment.captured','payment',late);
  assert.equal((await state(first.checkoutId)).status,'refund_required');
  assert.equal((await pool.query('SELECT availability FROM products WHERE id=$1',[productId])).rows[0].availability,'reserved');
  assert.equal(await balance(seller),0);
  provider.refund(late);await intents.reconcile(first.checkoutId,market);assert.equal(await balance(seller),0);
  provider.capture(second.providerOrderId!);await intents.reconcile(second.checkoutId,market);
  assert.equal((await state(second.checkoutId)).status,'paid');assert.equal(await balance(seller),5000);
  assert.equal((await pool.query('SELECT availability FROM products WHERE id=$1',[productId])).rows[0].availability,'sold');
});

test('a marketplace settlement crash rolls back sale and ledger; retry safely finishes', async () => {
  const seller=await person(),buyer=await person(),productId=await product(seller);
  const order=await market.createOrder({buyerId:buyer,productId,...shipping});provider.capture(order.providerOrderId!);
  await pool.query(`CREATE FUNCTION synthetic_checkout_fault() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic settlement failure'; END $$`);
  await pool.query('CREATE TRIGGER synthetic_checkout_fault BEFORE INSERT ON ledger_transactions FOR EACH ROW EXECUTE FUNCTION synthetic_checkout_fault()');
  try {
    await assert.rejects(intents.reconcile(order.checkoutId,market));
    assert.equal((await state(order.checkoutId)).status,'created');assert.equal(await balance(seller),0);
    assert.equal((await pool.query('SELECT availability FROM products WHERE id=$1',[productId])).rows[0].availability,'reserved');
  }finally{await pool.query('DROP TRIGGER synthetic_checkout_fault ON ledger_transactions');await pool.query('DROP FUNCTION synthetic_checkout_fault()');}
  await intents.reconcile(order.checkoutId,market);assert.equal(await balance(seller),5000);
});

test('provider amount, currency and receipt association cannot be swapped before settlement', async () => {
  const payerId=await person(),creatorId=await person();
  const order=await tips.createTipOrder({payerId,creatorId,amountMinor:500});const payment=provider.capture(order.providerOrderId!);
  const original={...payment};
  for(const patch of [{amount:600},{currency:'USD'},{order_id:'order_wrong'}]){Object.assign(payment,original,patch);await assert.rejects(tips.reconcileCapturedPayment({orderId:order.providerOrderId!,paymentId:payment.id}));}
  Object.assign(payment,original);const remote=provider.orders.get(order.providerOrderId!)!;remote.receipt='wrong';
  await assert.rejects(intents.reconcile(order.checkoutId,tips),/mismatch/);assert.equal(await balance(creatorId),0);
});

test('failed attempts remain retryable and delayed failure events cannot replace a settled state', async () => {
  const payerId=await person(),creatorId=await person();
  const order=await tips.createTipOrder({payerId,creatorId,amountMinor:500});
  const failed=provider.capture(order.providerOrderId!,'failed');await delivered('payment.failed','payment',failed);
  assert.equal((await state(order.checkoutId)).lastPaymentStatus,'failed');assert.equal((await state(order.checkoutId)).status,'created');
  provider.capture(order.providerOrderId!);await intents.reconcile(order.checkoutId,tips);
  await delivered('payment.failed','payment',failed);
  assert.equal((await state(order.checkoutId)).lastPaymentStatus,'captured');assert.equal(await balance(creatorId),500);
});

test('racing membership cancellation with capture produces one coherent paid-through or refund-required outcome', async () => {
  const subscriberId=await person(),creatorId=await person();
  const order=await memberships.createOrder({subscriberId,creatorId,tier:'chai'});
  provider.capture(order.providerOrderId!);
  await Promise.all([intents.reconcile(order.checkoutId,memberships),memberships.cancel(order.subscriptionId,subscriberId)]);
  const current=(await memberships.listForSubscriber(subscriberId))[0]!;
  const payable=(await state(order.checkoutId)).status;
  assert.ok(payable==='paid'||payable==='refund_required');
  assert.equal(current.status,payable==='paid'?'active':'refund_required');
  assert.equal(current.cancelAtPeriodEnd,true);
  assert.equal(await balance(creatorId),payable==='paid'?4900:0);
});

test('refund identifiers use literal prefixes and cannot collide across provider payment ids', async () => {
  const payerId=await person(),creatorId=await person();const order=await tips.createTipOrder({payerId,creatorId,amountMinor:500});
  const payment=provider.capture(order.providerOrderId!);await intents.reconcile(order.checkoutId,tips);
  // SQL LIKE would treat '_' as any character and count this unrelated row.
  const prefix=`razorpay:refund:${payment.id.replace('_','X')}:foreign`;
  await pool.query(`INSERT INTO ledger_transactions(id,credit_account_id,amount_minor,reference_id) VALUES($1,$2,500,$3)`,[randomUUID(),creatorId,prefix]);
  const refund=provider.refund(payment);await intents.reconcile(order.checkoutId,tips);
  assert.equal((await state(order.checkoutId)).status,'refunded');
  await assert.rejects(tips.reconcileRefund({id:refund.id,paymentId:payment.id,amountMinor:400,currency:'INR'}),/different amount/);
});

test('billing history authenticates, binds ownership, and denies cross-origin cancellation', async () => {
  const owner=await person(),creator=await person(),other=await person();
  const order=await tips.createTipOrder({payerId:owner,creatorId:creator,amountMinor:500});
  await redis.setStrict(`session:${other}:checkout-test`,'synthetic-hash',120);
  const token=jwt.sign({sub:other,deviceId:'checkout-test',type:'access',authVersion:0},env.JWT_SECRET,{expiresIn:'2m'});
  const app=express();app.use(express.json());app.use('/api',billingRoutes);
  const server=app.listen(0,'127.0.0.1');await new Promise<void>(resolve=>server.once('listening',resolve));
  const addr=server.address();assert.ok(addr&&typeof addr!=='string');const url=`http://127.0.0.1:${addr.port}/api/billing/checkouts`;
  const headers={Authorization:`Bearer ${token}`};
  try{
    assert.equal((await fetch(url)).status,401);
    const response=await fetch(url,{headers});assert.equal(response.status,200);assert.deepEqual((await response.json() as any).data,[]);
    assert.equal((await fetch(`${url}/${order.checkoutId}/recover`,{method:'POST',headers})).status,409);
    assert.equal((await fetch(`${url}/${order.checkoutId}/cancel`,{method:'POST',headers:{...headers,Origin:'https://untrusted.example.test'}})).status,403);
    assert.equal((await state(order.checkoutId)).status,'created');
  }finally{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));}
});
