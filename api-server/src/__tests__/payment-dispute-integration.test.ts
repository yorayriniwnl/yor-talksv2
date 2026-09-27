import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createHmac, randomUUID } from 'node:crypto';
import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { pool } from '@workspace/db';
import { env } from '../config/env.js';
import { RazorpayService, type RazorpayDispute } from '../services/razorpay-service.js';
import { PaymentService } from '../services/payment-service.js';
import { SubscriptionService } from '../services/subscription-service.js';
import { MarketplaceService } from '../services/marketplace-service.js';
import { PlatformPremiumService } from '../services/platform-premium-service.js';
import { PaymentWebhookService } from '../services/payment-webhook-service.js';
import { PaymentDisputeService } from '../services/payment-dispute-service.js';
import { EconomyService } from '../services/economy-service.js';
import { FeatureEntitlementService } from '../services/feature-entitlement-service.js';
import { AccountService } from '../services/account-service.js';
import { UserRepository } from '../repositories/user-repository.js';
import { RedisRepository } from '../repositories/redis-repository.js';
import { closeAuthDependencies } from '../middlewares/auth.js';
import operationsRoutes from '../routes/payment-operations.js';

// Real isolated PostgreSQL/Redis; simulated provider, never a real chargeback.
const original={...env};Object.assign(env,{PAYMENTS_ENABLED:true,YOR_PREMIUM_ENABLED:true,YOR_PREMIUM_PRICE_MINOR:500,
  YOR_PREMIUM_DURATION_DAYS:30,YOR_PREMIUM_TERMS_VERSION:`dispute-test-${randomUUID()}`,YOR_PREMIUM_REFUND_POLICY:'Synthetic policy only',
  RAZORPAY_KEY_ID:'rzp_test_synthetic',RAZORPAY_KEY_SECRET:'synthetic-key',RAZORPAY_WEBHOOK_SECRET:'synthetic-hook',RAZORPAY_ACCOUNT_ID:'acc_synthetic'});
type Order=Awaited<ReturnType<RazorpayService['getOrder']>>;type Payment=Awaited<ReturnType<RazorpayService['getPayment']>>;
class Provider extends RazorpayService {
  orders=new Map<string,Order>();payments=new Map<string,Payment>();disputes=new Map<string,RazorpayDispute>();
  override async createOrder(input:{amountMinor:number;receipt:string;notes:Record<string,string>}){const value={id:`order_${randomUUID().replaceAll('-','')}`,amount:input.amountMinor,currency:'INR',status:'created',receipt:input.receipt,notes:input.notes};this.orders.set(value.id,value);return value;}
  override async getOrder(id:string){const value=this.orders.get(id);assert.ok(value);return value;}
  override async getPayment(id:string){const value=this.payments.get(id);assert.ok(value);return value;}
  override async getOrderPayments(id:string){return [...this.payments.values()].filter(value=>value.order_id===id);}
  override async getPaymentRefunds(_id:string){return [];}
  override async getDispute(id:string){const value=this.disputes.get(id);assert.ok(value);return {...value};}
  override async listDisputes(skip=0){return [...this.disputes.values()].slice(skip,skip+50);}
  capture(id:string){const order=this.orders.get(id)!;const value={id:`pay_${randomUUID().replaceAll('-','')}`,order_id:id,amount:order.amount,currency:order.currency,status:'captured'};this.payments.set(value.id,value);return value;}
  dispute(payment:Payment){const value:RazorpayDispute={id:`disp_${randomUUID().replaceAll('-','')}`,payment_id:payment.id,amount:payment.amount,currency:'INR',amount_deducted:0,status:'open',respond_by:Math.floor(Date.now()/1000)+86400};this.disputes.set(value.id,value);return value;}
}
const provider=new Provider(), handlers={tip:new PaymentService(provider),membership:new SubscriptionService(provider),marketplace:new MarketplaceService(provider),premium:new PlatformPremiumService(provider)};
const disputes=new PaymentDisputeService(provider,id=>webhooks.ensureCaptureByPayment(id));
const webhooks:PaymentWebhookService=new PaymentWebhookService(provider,Object.values(handlers),id=>disputes.reconcile(id));
const wallet=new EconomyService(),features=new FeatureEntitlementService(),redis=new RedisRepository();
const ids:string[]=[],orders:string[]=[],products:string[]=[],jobs:string[]=[];
async function person(role='user'){
  const id=randomUUID();ids.push(id);await pool.query(`INSERT INTO users(id,username,email,password_hash,full_name,role,terms_version,terms_accepted_at,age_confirmed_at)
    VALUES($1,$2,$3,$4,'Synthetic dispute',$5,$6,now(),now())`,[id,`dsp-${id.slice(0,8)}`,`${id}@example.test`,await bcrypt.hash('synthetic-password',4),role,env.TERMS_VERSION]);return id;
}
async function purchase(product:keyof typeof handlers){
  const owner=await person(),creator=await person();let id:string,providerId:string,subscriptionId:string|undefined;
  if(product==='tip'){const item=await handlers.tip.createTipOrder({payerId:owner,creatorId:creator,amountMinor:500});id=item.checkoutId;providerId=item.providerOrderId!;}
  else if(product==='membership'){const item=await handlers.membership.createOrder({subscriberId:owner,creatorId:creator,tier:'chai'});id=item.checkoutId;providerId=item.providerOrderId!;subscriptionId=item.subscriptionId;}
  else if(product==='marketplace'){const productId=randomUUID();products.push(productId);await pool.query(`INSERT INTO products(id,seller_id,title,description,price,category,condition) VALUES($1,$2,'Synthetic','Test',5,'Other','used')`,[productId,creator]);const item=await handlers.marketplace.createOrder({buyerId:owner,productId,shippingName:'Test buyer',shippingAddress:'Synthetic local address'});id=item.checkoutId;providerId=item.providerOrderId!;}
  else{const item=await handlers.premium.createOrder(owner,{idempotencyKey:randomUUID(),acceptedTermsVersion:env.YOR_PREMIUM_TERMS_VERSION,acceptedPriceMinor:500});id=item.id;providerId=item.providerOrderId!;}
  orders.push(id);const payment=provider.capture(providerId);await handlers[product].reconcileCapturedPayment({orderId:providerId,paymentId:payment.id});
  return {product,owner,creator,id,providerId,payment,subscriptionId};
}
const orderState=async(item:Awaited<ReturnType<typeof purchase>>)=>(await pool.query(`SELECT status FROM ${{tip:'payment_orders',membership:'subscription_orders',marketplace:'marketplace_orders',premium:'premium_orders'}[item.product]} WHERE id=$1`,[item.id])).rows[0].status;
async function event(dispute:RazorpayDispute,type='payment.dispute.created'){
  const raw=Buffer.from(JSON.stringify({event:type,account_id:env.RAZORPAY_ACCOUNT_ID,payload:{dispute:{entity:dispute}}}));
  await webhooks.handle(null,raw,createHmac('sha256',env.RAZORPAY_WEBHOOK_SECRET).update(raw).digest('hex'));
}
after(async()=>{
  const disputeIds=[...provider.disputes.keys()],providerIds=[...provider.orders.keys()],paymentIds=[...provider.payments.keys()];
  await pool.query('DELETE FROM payment_dispute_history WHERE dispute_id=ANY($1::text[])',[disputeIds]);
  await pool.query('DELETE FROM payment_disputes WHERE id=ANY($1::text[])',[disputeIds]);
  await pool.query('DELETE FROM payment_dispute_reserves WHERE order_id=ANY($1::uuid[])',[orders]);
  await pool.query(`DELETE FROM ledger_transactions WHERE credit_account_id=ANY($1::uuid[]) OR debit_account_id=ANY($1::uuid[])
    OR split_part(reference_id,':',2)=ANY($2::text[]) OR split_part(reference_id,':',3)=ANY($3::text[]) OR split_part(reference_id,':',4)=ANY($4::text[])`,[ids,[...providerIds,...orders],paymentIds,orders]);
  await pool.query('DELETE FROM background_jobs WHERE id=ANY($1::uuid[]) OR dedup_key=ANY($2::text[])',[jobs,[...orders.flatMap(id=>[`premium:${id}`,`checkout:${id}`]),...disputeIds.map(id=>`dispute:${id}`),...ids.map(id=>`account:${id}`)]]);
  await pool.query('DELETE FROM payment_operation_audit WHERE actor_id=ANY($1::uuid[])',[ids]);
  await pool.query('DELETE FROM media_cleanup_holds WHERE deletion_id=ANY($1::uuid[])',[ids]);
  await pool.query('DELETE FROM premium_access WHERE order_id=ANY($1::uuid[])',[orders]);
  for(const table of ['checkout_intents','payment_orders','subscription_orders','marketplace_orders','premium_orders'])await pool.query(`DELETE FROM ${table} WHERE id=ANY($1::uuid[])`,[orders]);
  await pool.query('DELETE FROM premium_plans WHERE terms_version=$1',[env.YOR_PREMIUM_TERMS_VERSION]);
  await pool.query('DELETE FROM products WHERE id=ANY($1::uuid[])',[products]);
  for(const id of ids)await redis.delStrict(`session:${id}:dispute-test`);
  await pool.query('DELETE FROM users WHERE id=ANY($1::uuid[])',[ids]);
  await redis.disconnect();await closeAuthDependencies();await pool.end();Object.assign(env,original);
});

for(const product of ['tip','membership','marketplace','premium'] as const)test(`${product}: duplicate and out-of-order disputes freeze and restore only the original paid state`,async()=>{
  const item=await purchase(product),dispute=provider.dispute(item.payment);
  const before=product==='premium'?(await handlers.premium.state(item.owner)).subscription.ends_at:product==='membership'?(await handlers.membership.listForSubscriber(item.owner))[0]!.expiresAt:null;
  await Promise.all(Array.from({length:5},()=>event(dispute)));
  assert.equal(await orderState(item),'disputed');assert.equal((await wallet.getCreatorWallet(item.creator)).balanceMinor,0);
  if(product==='premium')assert.equal(await features.hasFeature(item.owner,'MESSAGE_FONT'),false);
  if(product==='membership')assert.equal((await handlers.membership.listForSubscriber(item.owner))[0]!.status,'disputed');
  dispute.status='won';await event(dispute,'payment.dispute.won');
  // An old created webhook is only a signal to fetch the current provider state.
  await event({...dispute,status:'open'},'payment.dispute.created');
  assert.equal(await orderState(item),'paid');assert.equal((await wallet.getCreatorWallet(item.creator)).balanceMinor,product==='premium'?0:item.payment.amount);
  if(product==='premium'){assert.equal(await features.hasFeature(item.owner,'MESSAGE_FONT'),true);assert.equal(String((await handlers.premium.state(item.owner)).subscription.ends_at),String(before));}
  if(product==='membership')assert.equal((await handlers.membership.listForSubscriber(item.owner))[0]!.expiresAt,before);
  assert.equal(Number((await pool.query('SELECT revision FROM payment_dispute_reserves WHERE order_id=$1',[item.id])).rows[0].revision),2);
});

test('partial chargeback plus refund never debits more than the original creator credit',async()=>{
  const item=await purchase('tip'),dispute=provider.dispute(item.payment);await event(dispute);
  await handlers.tip.reconcileRefund({id:'rfnd_partial',paymentId:item.payment.id,amountMinor:200,currency:'INR'});
  assert.equal((await wallet.getCreatorWallet(item.creator)).balanceMinor,0);
  dispute.status='won';dispute.amount_deducted=100;await event(dispute,'payment.dispute.won');
  assert.equal(await orderState(item),'chargeback');assert.equal((await wallet.getCreatorWallet(item.creator)).balanceMinor,200);
  await handlers.tip.reconcileRefund({id:'rfnd_rest',paymentId:item.payment.id,amountMinor:300,currency:'INR'});
  assert.equal(await orderState(item),'refunded');assert.equal((await wallet.getCreatorWallet(item.creator)).balanceMinor,0);
  assert.equal(Number((await pool.query('SELECT excess_minor FROM payment_dispute_reserves WHERE order_id=$1',[item.id])).rows[0].excess_minor),100);
  await event(dispute);assert.equal((await wallet.getCreatorWallet(item.creator)).balanceMinor,0);
});

test('lost dispute keeps access revoked and delayed won events cannot override current provider loss',async()=>{
  const item=await purchase('premium'),dispute=provider.dispute(item.payment);dispute.status='lost';dispute.amount_deducted=500;
  await event(dispute,'payment.dispute.lost');await event({...dispute,status:'won',amount_deducted:0},'payment.dispute.won');
  await handlers.premium.reconcileCapturedPayment({orderId:item.providerId,paymentId:item.payment.id});
  assert.equal(await features.hasFeature(item.owner,'MESSAGE_FONT'),false);assert.equal(await orderState(item),'chargeback');
});

test('multiple disputes share one bounded reserve and one resolution cannot clear another open case',async()=>{
  const item=await purchase('marketplace'),first=provider.dispute(item.payment),second=provider.dispute(item.payment);
  await Promise.all([event(first),event(second)]);assert.equal((await wallet.getCreatorWallet(item.creator)).balanceMinor,0);
  first.status='closed';await event(first);assert.equal(await orderState(item),'disputed');assert.equal((await wallet.getCreatorWallet(item.creator)).balanceMinor,0);
  second.status='won';await event(second);assert.equal(await orderState(item),'paid');assert.equal((await wallet.getCreatorWallet(item.creator)).balanceMinor,500);
});

test('winning an expired Premium dispute never renews the term',async()=>{
  const item=await purchase('premium'),dispute=provider.dispute(item.payment);await event(dispute);
  await pool.query(`UPDATE premium_access SET starts_at=now()-interval '31 days',ends_at=now()-interval '1 day' WHERE order_id=$1`,[item.id]);
  dispute.status='won';await event(dispute);
  assert.equal(await features.hasFeature(item.owner,'MESSAGE_FONT'),false);
  assert.equal((await handlers.premium.state(item.owner)).subscription.status,'expired');
});

test('refund during a dispute wins over later resolution and paid-through cancellation survives a won dispute',async()=>{
  const item=await purchase('membership'),dispute=provider.dispute(item.payment);await event(dispute);
  await handlers.membership.cancel(item.subscriptionId!,item.owner);
  dispute.status='won';await event(dispute);
  const sub=(await handlers.membership.listForSubscriber(item.owner))[0]!;assert.equal(sub.status,'active');assert.equal(sub.cancelAtPeriodEnd,true);
  dispute.status='open';await event(dispute);
  await handlers.membership.reconcileRefund({id:'rfnd_member',paymentId:item.payment.id,amountMinor:100,currency:'INR'});
  dispute.status='won';await event(dispute);
  assert.equal((await handlers.membership.listForSubscriber(item.owner))[0]!.status,'refunded');
  assert.equal((await pool.query('SELECT status FROM entitlements WHERE entity_id=$1',[item.subscriptionId])).rows[0].status,'revoked');
});

test('creator deletion during dispute preserves financial identity without restoring deleted credit attribution',async()=>{
  const item=await purchase('tip'),dispute=provider.dispute(item.payment);await event(dispute);
  await new AccountService(new UserRepository(),redis).deleteAccount(item.creator,'synthetic-password');
  dispute.status='closed';await event(dispute);
  const reserve=(await pool.query(`SELECT credit_account_id,debit_account_id FROM ledger_transactions WHERE starts_with(reference_id,$1)`,[`dispute:reserve:tip:${item.id}:`])).rows;
  assert.equal(reserve.length,2);assert.ok(reserve.every(row=>row.credit_account_id===null&&row.debit_account_id===null));
  assert.equal((await pool.query('SELECT payer_id,creator_id FROM payment_orders WHERE id=$1',[item.id])).rows[0].payer_id,item.owner);
});

test('dispute transaction failure rolls back evidence, access and reserve, then read-only retry succeeds',async()=>{
  const item=await purchase('premium'),dispute=provider.dispute(item.payment);
  await pool.query(`CREATE FUNCTION synthetic_dispute_fault() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic dispute failure'; END $$`);
  await pool.query('CREATE TRIGGER synthetic_dispute_fault BEFORE INSERT ON payment_dispute_history FOR EACH ROW EXECUTE FUNCTION synthetic_dispute_fault()');
  try{await assert.rejects(event(dispute));assert.equal(await features.hasFeature(item.owner,'MESSAGE_FONT'),true);assert.equal((await pool.query('SELECT 1 FROM payment_disputes WHERE id=$1',[dispute.id])).rowCount,0);}
  finally{await pool.query('DROP TRIGGER synthetic_dispute_fault ON payment_dispute_history');await pool.query('DROP FUNCTION synthetic_dispute_fault()');}
  await event(dispute);assert.equal(await features.hasFeature(item.owner,'MESSAGE_FONT'),false);
});

test('scheduled provider scan queues missed disputes without changing money before reconciliation',async()=>{
  const item=await purchase('marketplace'),dispute=provider.dispute(item.payment);
  assert.equal(await disputes.scan(),3600);assert.equal(await orderState(item),'paid');
  assert.equal((await pool.query('SELECT kind FROM background_jobs WHERE dedup_key=$1',[`dispute:${dispute.id}`])).rows[0].kind,'dispute_reconcile');
  await disputes.reconcile(dispute.id);assert.equal(await orderState(item),'disputed');
});

test('ordinary users and moderators cannot inspect financial operations; administrator retries are audited',async()=>{
  const admin=await person('admin'),moderator=await person('moderator'),ordinary=await person();
  const headers:Record<string,{Authorization:string}>={};for(const id of [admin,moderator,ordinary]){await redis.setStrict(`session:${id}:dispute-test`,'synthetic',120);headers[id]={Authorization:`Bearer ${jwt.sign({sub:id,deviceId:'dispute-test',type:'access',authVersion:0},env.JWT_SECRET,{expiresIn:'2m'})}`};}
  const job=randomUUID();jobs.push(job);await pool.query(`INSERT INTO background_jobs(id,kind,dedup_key,payload,status,attempts) VALUES($1,'dispute_reconcile',$2,'{}','dead',8)`,[job,`synthetic:${job}`]);
  const app=express();app.use(express.json());app.use('/api',operationsRoutes);const server=app.listen(0,'127.0.0.1');await new Promise<void>(resolve=>server.once('listening',resolve));const addr=server.address();assert.ok(addr&&typeof addr!=='string');const url=`http://127.0.0.1:${addr.port}/api/operations/payments`;
  try{
    assert.equal((await fetch(url)).status,401);for(const id of [ordinary,moderator])assert.equal((await fetch(url,{headers:headers[id]})).status,403);
    const response=await fetch(url,{headers:headers[admin]});assert.equal(response.status,200);const body=await response.text();assert.ok(!body.includes('encrypted_payload'));assert.ok(!body.includes('shipping_address'));
    const request={method:'POST',headers:{...headers[admin],'Content-Type':'application/json'},body:JSON.stringify({reason:'Synthetic provider recovery'})};
    assert.equal((await fetch(`${url}/jobs/${job}/retry`,{...request,headers:{...request.headers,Origin:'https://untrusted.example.test'}})).status,403);
    assert.equal((await fetch(`${url}/jobs/${job}/retry`,request)).status,200);
    assert.equal((await pool.query('SELECT actor_id FROM payment_operation_audit WHERE target_id=$1',[job])).rows[0].actor_id,admin);
    assert.equal((await pool.query('SELECT status FROM background_jobs WHERE id=$1',[job])).rows[0].status,'pending');
  }finally{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));}
});
