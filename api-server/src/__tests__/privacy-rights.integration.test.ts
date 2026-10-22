import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { after, before, test } from 'node:test';
import express from 'express';
import jwt from 'jsonwebtoken';
import { pool } from '@workspace/db';
import { PrivacyRightsService, type PrivacyRequestType } from '../services/privacy-rights-service.js';
import { PrivacyController } from '../controllers/privacy-controller.js';
import { createPrivacyRouter } from '../routes/privacy.js';
import { ConsentService } from '../services/consent-service.js';
import { EligibilityService } from '../services/eligibility-service.js';
import { createVerifiedAdultTestUser } from './test-helpers.js';
import { UserRepository } from '../repositories/user-repository.js';
import { RedisRepository } from '../repositories/redis-repository.js';
import { authenticate, closeAuthenticationDependencies } from '../middlewares/auth.js';
import { closeRateLimitRedis } from '../middlewares/rate-limit.js';
import { env } from '../config/env.js';
import type { EmailService } from '../services/email-service.js';
import type { UserRecord } from '../types/index.js';
import { expirePrivacyChallenges } from '../workers/lifecycle-worker.js';
import { EmailSuppressionService } from '../services/email-suppression-service.js';

const emails: string[] = [], journalIds: string[] = [], deliveries: { email: string; token: string; purpose: string }[] = [];
const hash = (value: string) => createHash('sha256').update(value.trim().toLowerCase()).digest('hex');
const email = () => { const value = `rights-${randomUUID()}@example.test`; emails.push(value); return value; };
const mailer = { sendPrivacyChallengeEmail: async (address: string, token: string, purpose: string) => {
  deliveries.push({ email: address, token, purpose }); return true;
} } as unknown as EmailService;
const service = new PrivacyRightsService(mailer), controller = new PrivacyController(service), consent = new ConsentService(), redis = new RedisRepository();
let user: UserRecord, token: string, session: string, baseUrl: string, server: ReturnType<ReturnType<typeof express>['listen']>;
before(async () => {
  user = await createVerifiedAdultTestUser(new UserRepository()); emails.push(user.email);
  const deviceId = randomUUID(); session = `session:${user.id}:${deviceId}`;
  await redis.setStrict(session, 'active', 600); token = jwt.sign({ sub: user.id, deviceId }, env.JWT_SECRET, { expiresIn: '10m' });
  const app = express(); app.use(express.json()); app.use('/api', createPrivacyRouter(controller));
  app.get('/api/feed', authenticate, (_req,res) => res.json({ allowed: true }));
  app.post('/api/users/me/restriction', authenticate, controller.restrictMe);
  app.delete('/api/users/me/restriction', authenticate, controller.unrestrictMe);
  app.post('/api/users/me/consent-withdrawal', authenticate, controller.withdrawConsent);
  server = app.listen(0,'127.0.0.1'); await new Promise<void>(resolve => server.once('listening', resolve));
  const address = server.address(); assert.ok(address && typeof address !== 'string'); baseUrl = `http://127.0.0.1:${address.port}`;
});
after(async () => {
  try {
    if (server) await new Promise<void>((resolve,reject) => server.close(e => e ? reject(e) : resolve()));
    const digests = emails.map(hash);
    await pool.query('DELETE FROM privacy_rights_requests WHERE email_hash=ANY($1)', [digests]);
    await pool.query('DELETE FROM email_suppressions WHERE email_hash=ANY($1)', [digests]);
    await pool.query('DELETE FROM consent_records WHERE subject_digest=ANY($1)', [digests]);
    await pool.query('DELETE FROM preregistrations WHERE email=ANY($1)', [emails]);
    await pool.query('DELETE FROM waitlist WHERE email=ANY($1)', [emails]);
    await pool.query('DELETE FROM deletion_journal WHERE id=ANY($1::uuid[]) OR stable_identity_digest=ANY($2)', [journalIds,digests]);
    if (user) await pool.query('DELETE FROM users WHERE id=$1', [user.id]);
    if (session) await redis.del(session);
  } finally { await redis.disconnect(); await closeAuthenticationDependencies(); await closeRateLimitRedis(); await pool.end(); }
});
async function challenge(address: string, purpose: PrivacyRequestType = 'access') {
  await service.initiateChallenge(address, purpose);
  const delivered = [...deliveries].reverse().find(item => item.email === address); assert.ok(delivered); return delivered.token;
}
async function preregistration(address = email()) {
  const id = randomUUID(), username = `rights_${id.slice(0,8)}`;
  await pool.query('INSERT INTO preregistrations(id,email,username,launch_updates_consented_at) VALUES($1,$2,$3,clock_timestamp())', [id,address,username]);
  return { id,email: address,username };
}
async function http(path: string, body?: object, method = 'POST', authenticated = false) {
  const response = await fetch(`${baseUrl}/api${path}`, { method, headers: {
    ...(body ? { 'Content-Type': 'application/json' } : {}), ...(authenticated ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined });
  return { status: response.status, headers: response.headers, body: await response.json() as any };
}

test('HTTP challenge responses conceal account existence and never expose the delivery token', async () => {
  const present = await http('/privacy/challenge', { email: user.email, purpose: 'access' });
  const absent = await http('/privacy/challenge', { email: email(), purpose: 'access' });
  assert.equal(present.status,200); assert.deepEqual(present.body,absent.body);
  assert.equal(present.headers.get('cache-control'),'no-store'); assert.equal(present.headers.get('referrer-policy'),'no-referrer');
  for (const item of deliveries) assert.ok(!JSON.stringify(present.body).includes(item.token));
});

test('verification exposes only the token-bound purpose and does not consume authority', async () => {
  const key=await challenge(email(),'erasure');
  const verified=await http('/privacy/verify',{token:key});
  assert.equal(verified.status,200);
  assert.deepEqual(verified.body.data,{valid:true,purpose:'erasure'});
  assert.equal(verified.headers.get('cache-control'),'no-store');
  assert.equal((await service.verifyChallengeToken(key)).valid,true);
  assert.equal((await http('/privacy/verify',{token:'0'.repeat(64)})).status,400);
  assert.equal((await http('/privacy/verify',{token:key,email:'forged@example.test'})).status,400);
});

test('tokens are purpose-bound, expire using the database clock, and are consumed once under concurrency', async () => {
  const address = email(), key = await challenge(address);
  assert.equal((await service.executeRightsRequest({ token:key, requestType:'erasure' })).executed,false);
  assert.equal((await service.verifyChallengeToken(key)).valid,true);
  const results = await Promise.all(Array.from({length:12},()=>service.executeRightsRequest({token:key,requestType:'access'})));
  assert.equal(results.filter(result=>result.executed).length,1);
  assert.equal((await service.verifyChallengeToken(key)).valid,false);
  const audit = (await pool.query('SELECT status,verification_token_hash FROM privacy_rights_requests WHERE email_hash=$1',[hash(address)])).rows;
  assert.deepEqual(audit,[{status:'completed',verification_token_hash:null}]);
  const expired = await challenge(email());
  await pool.query('UPDATE privacy_rights_requests SET verification_expires_at=clock_timestamp() WHERE verification_token_hash=$1',[hash(expired)]);
  assert.equal((await service.executeRightsRequest({token:expired,requestType:'access'})).executed,false);
});

test('distributed challenge issuance limits each address without leaking its existence', async () => {
  const address = email();
  const results = await Promise.all(Array.from({length:8},()=>service.initiateChallenge(address)));
  assert.ok(results.every(result=>result.challengeInitiated));
  assert.equal(deliveries.filter(item=>item.email===address).length,3);
  const audit = (await pool.query('SELECT * FROM privacy_rights_requests WHERE email_hash=$1',[hash(address)])).rows;
  assert.equal(audit.length,3); assert.ok(!JSON.stringify(audit).includes(address));
});

test('failed email delivery invalidates the undelivered challenge', async () => {
  const address = email(); let undelivered = '';
  const failed = new PrivacyRightsService({sendPrivacyChallengeEmail:async (_email:string,key:string)=>{undelivered=key;return false;}} as unknown as EmailService);
  assert.deepEqual(await failed.initiateChallenge(address),{challengeInitiated:true});
  assert.equal((await failed.verifyChallengeToken(undelivered)).valid,false);
});

test('verified unbound erasure deletes current records and withdraws consent atomically without Redis authority', async () => {
  const p = await preregistration(); await pool.query('INSERT INTO waitlist(id,email) VALUES($1,$2)',[randomUUID(),p.email]);
  await consent.recordConsent({email:p.email,purpose:'launch_updates',version:'test-1',granted:true});
  const key = await challenge(p.email,'erasure');
  const result = await service.executeRightsRequest({token:key,requestType:'erasure'}); assert.equal(result.executed,true);
  assert.equal((await pool.query('SELECT 1 FROM preregistrations WHERE id=$1',[p.id])).rowCount,0);
  assert.equal((await pool.query('SELECT 1 FROM waitlist WHERE email=$1',[p.email])).rowCount,0);
  assert.equal(await consent.hasConsent({email:p.email,purpose:'launch_updates'}),false);
  assert.equal((await pool.query('SELECT 1 FROM email_suppressions WHERE email_hash=$1 AND purpose=$2',[hash(p.email),'all_promotional'])).rowCount,1);
  const journal = (await pool.query('SELECT * FROM deletion_journal WHERE stable_identity_digest=$1',[hash(p.email)])).rows;
  assert.equal(journal.length,1); assert.equal(journal[0].account_id,null);
  assert.ok(!JSON.stringify(journal).includes(p.email));
});

test('database failure rolls back token consumption and all effects so a valid request can retry', async () => {
  const p = await preregistration(), key = await challenge(p.email,'erasure'), guard = `rights_guard_${randomUUID().replaceAll('-','')}`;
  await pool.query(`CREATE TABLE ${guard}(id uuid REFERENCES preregistrations(id))`);
  try {
    await pool.query(`INSERT INTO ${guard}(id) VALUES($1)`,[p.id]);
    await assert.rejects(service.executeRightsRequest({token:key,requestType:'erasure'}));
    assert.equal((await service.verifyChallengeToken(key)).valid,true);
    assert.equal((await pool.query('SELECT 1 FROM preregistrations WHERE id=$1',[p.id])).rowCount,1);
  } finally { await pool.query(`DROP TABLE ${guard}`); }
  assert.equal((await service.executeRightsRequest({token:key,requestType:'erasure'})).executed,true);
});

test('privacy cleanup retires expired authority and preserves live challenges and completed evidence', async () => {
  const address=email(),liveAddress=email(),expired=await challenge(address),live=await challenge(liveAddress);
  await pool.query('UPDATE privacy_rights_requests SET verification_expires_at=clock_timestamp() WHERE verification_token_hash=$1',[hash(expired)]);
  await Promise.all([expirePrivacyChallenges(),expirePrivacyChallenges()]);
  const row=(await pool.query('SELECT status,verification_token_hash,verification_expires_at FROM privacy_rights_requests WHERE email_hash=$1',[hash(address)])).rows[0];
  assert.deepEqual(row,{status:'expired',verification_token_hash:null,verification_expires_at:null});
  assert.equal((await service.verifyChallengeToken(live)).valid,true);
  const result=await service.executeRightsRequest({token:live,requestType:'access'});
  assert.equal(result.executed,true);
  await expirePrivacyChallenges();
  assert.equal((await pool.query("SELECT status FROM privacy_rights_requests WHERE email_hash=$1",[hash(liveAddress)])).rows[0].status,'completed');
});

test('a preregistration timestamp cannot override a later consent withdrawal at send time', async () => {
  const p=await preregistration(),suppression=new EmailSuppressionService(),previous=env.PROMOTIONAL_EMAIL_ENABLED;
  env.PROMOTIONAL_EMAIL_ENABLED=true;
  try {
    await consent.recordConsent({email:p.email,purpose:'launch_updates',version:'test-1',granted:true});
    assert.equal((await suppression.checkCanSend(p.email,'launch_updates')).allowed,true);
    await consent.withdrawConsent({email:p.email,purpose:'launch_updates'});
    assert.equal((await suppression.checkCanSend(p.email,'launch_updates')).allowed,false);
    assert.equal((await pool.query('SELECT unsubscribed_at FROM preregistrations WHERE id=$1',[p.id])).rows[0].unsubscribed_at,null);
  } finally { env.PROMOTIONAL_EMAIL_ENABLED=previous; }
});

test('current accounts take precedence over historical erasure and cannot be deleted by an email challenge', async () => {
  const journalId = randomUUID(); journalIds.push(journalId);
  await pool.query('INSERT INTO deletion_journal(id,account_id,stable_identity_digest) VALUES($1,$2,$3)',[journalId,randomUUID(),hash(user.email)]);
  const access = await challenge(user.email);
  assert.equal((await service.executeRightsRequest({token:access,requestType:'access'})).recordStatus,'active_account');
  const erasure = await challenge(user.email,'erasure');
  const response = await http('/privacy/request',{token:erasure,requestType:'erasure'});
  assert.equal(response.status,409); assert.ok(await new UserRepository().findById(user.id));
  const audit = (await pool.query('SELECT subject_id,status FROM privacy_rights_requests WHERE email_hash=$1 AND request_type=$2',[hash(user.email),'erasure'])).rows[0];
  assert.equal(audit.subject_id,user.id); assert.equal(audit.status,'rejected');
});

test('signed-in restriction disables social capabilities and can be lifted through the rights allowlist', async () => {
  assert.equal((await http('/feed',undefined,'GET',true)).status,200);
  assert.equal((await http('/users/me/restriction',{reason:'Pause optional processing'},'POST',true)).status,200);
  assert.equal((await new EligibilityService().decisionFor(user.id)).activated,false);
  assert.equal((await http('/feed',undefined,'GET',true)).status,403);
  assert.equal((await http('/users/me/restriction',undefined,'DELETE',true)).status,200);
  assert.equal((await http('/feed',undefined,'GET',true)).status,200);
});

test('signed-in consent withdrawal resolves the server-owned email and leaves unrelated grants untouched', async () => {
  const p = await preregistration(user.email), other = email();
  await consent.recordConsent({email:p.email,purpose:'launch_updates',version:'test-1',granted:true});
  await consent.recordConsent({email:other,purpose:'launch_updates',version:'test-1',granted:true});
  assert.equal((await http('/users/me/consent-withdrawal',{purpose:'launch_updates'},'POST',true)).status,200);
  assert.equal(await consent.hasConsent({email:p.email,purpose:'launch_updates'}),false);
  assert.equal(await consent.hasConsent({email:other,purpose:'launch_updates'}),true);
  assert.ok((await pool.query('SELECT unsubscribed_at FROM preregistrations WHERE id=$1',[p.id])).rows[0].unsubscribed_at);
  await assert.rejects(consent.withdrawConsent({purpose:'launch_updates'}));
  await assert.rejects(consent.recordConsent({purpose:'launch_updates',version:'test-1',granted:true}));
  assert.equal(await consent.hasConsent({purpose:'launch_updates'}),false);
  assert.equal(await consent.hasConsent({email:other,purpose:'launch_updates'}),true);
});

test('correction validates before consuming authority and changes only the verified preregistration', async () => {
  const p = await preregistration(), key = await challenge(p.email,'correction');
  assert.equal((await service.executeRightsRequest({token:key,requestType:'correction',details:{preferredUsername:'!'}})).executed,false);
  assert.equal((await service.verifyChallengeToken(key)).valid,true);
  const username = `new_${randomUUID().slice(0,8)}`;
  const result = await service.executeRightsRequest({token:key,requestType:'correction',details:{preferredUsername:username}});
  assert.equal(result.executed,true);
  assert.equal((await pool.query('SELECT username FROM preregistrations WHERE id=$1',[p.id])).rows[0].username,username);
});

test('HTTP infrastructure errors are private and invalid request fields are rejected', async t => {
  assert.equal((await http('/privacy/request',{token:'short',requestType:'access'})).status,400);
  t.mock.method(service,'executeRightsRequest',async()=>{throw new Error('private SQL and provider credentials');});
  const response = await http('/privacy/request',{token:'a'.repeat(64),requestType:'access'});
  assert.equal(response.status,503); assert.doesNotMatch(JSON.stringify(response.body),/SQL|credentials/);
});
