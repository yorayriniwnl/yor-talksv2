import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { randomUUID } from 'node:crypto';
import express from 'express';
import jwt from 'jsonwebtoken';
import { pool } from '@workspace/db';
import { env } from '../config/env.js';
import { closeAuthenticationDependencies } from '../middlewares/auth.js';
import { closeRateLimitRedis } from '../middlewares/rate-limit.js';
import { RedisRepository } from '../repositories/redis-repository.js';
import { UserRepository } from '../repositories/user-repository.js';
import { EligibilityRepository } from '../repositories/eligibility-repository.js';
import { AssuranceService } from '../services/assurance-service.js';
import { createEligibilityRouter } from '../routes/eligibility.js';
import { createTestUser } from './test-helpers.js';
import { errorHandler } from '../middlewares/error-handler.js';
import { logger } from '../lib/logger.js';
import { skipAssuranceCallbackParser } from '../middlewares/assurance-body.js';
import { FixtureAssuranceAdapter, fixturePolicies } from './assurance-fixtures.js';

const repo = new EligibilityRepository(); const adapter = new FixtureAssuranceAdapter();
const service = new AssuranceService(repo,adapter,{ policies: fixturePolicies,operatorPolicyIds: ['fixture-operator'] });
const redis = new RedisRepository(); const users: string[] = []; const sessions: string[] = [];
const app = express();
app.use(skipAssuranceCallbackParser(express.json()));
app.use('/fixture',createEligibilityRouter(service)); app.use('/default',createEligibilityRouter());
app.use(errorHandler);
const server = app.listen(0,'127.0.0.1'); await new Promise<void>(resolve => server.once('listening',resolve));
const address=server.address(); assert.ok(address && typeof address!=='string'); const base=`http://127.0.0.1:${address.port}`;
after(async () => {
  await pool.query('DELETE FROM users WHERE id=ANY($1::uuid[])',[users]);
  for (const key of sessions) await redis.del(key);
  await redis.disconnect(); await closeAuthenticationDependencies(); await closeRateLimitRedis(); await pool.end();
  await new Promise<void>((resolve,reject) => server.close(error => error ? reject(error) : resolve()));
});
async function identity() {
  const user=await createTestUser(new UserRepository()); users.push(user.id); const deviceId=randomUUID();
  const token=jwt.sign({ sub: user.id,role: 'user',permissions: [],deviceId },env.JWT_SECRET,{ expiresIn: '5m' });
  const key=`session:${user.id}:${deviceId}`; sessions.push(key); await redis.setStrict(key,'active',300);
  return { user,token,headers: { Authorization: `Bearer ${token}`,'Content-Type': 'application/json' } };
}
test('default provider has no callback mount and returns a safe unavailable response',async () => {
  const owner=await identity();
  assert.equal((await fetch(`${base}/default/eligibility/provider/callback`,{ method: 'POST',headers: {'Content-Type':'application/json'},body:'{"verified":true}' })).status,404);
  const res=await fetch(`${base}/default/users/me/eligibility/challenges`,{ method:'POST',headers:owner.headers,body:JSON.stringify({purpose:'age_assessment',territory:'ZZ'}) });
  assert.equal(res.status,503); assert.doesNotMatch(await res.text(),/nonce|evidence|SELECT|parameters/);
});
test('owner challenge routes require authentication and reject forged approval properties',async () => {
  assert.equal((await fetch(`${base}/fixture/users/me/eligibility`)).status,401);
  const owner=await identity();
  const forged=await fetch(`${base}/fixture/users/me/eligibility/challenges`,{method:'POST',headers:owner.headers,body:JSON.stringify({purpose:'age_assessment',territory:'ZZ',verified:true,guardianApproved:true})});
  assert.equal(forged.status,400); assert.equal((await repo.readFacts(owner.user.id))?.assessment,undefined);
});
test('raw client JSON cannot verify; trusted opaque fixture callback applies once and status remains owner-bound',async () => {
  const owner=await identity(); const stranger=await identity();
  const start=await fetch(`${base}/fixture/users/me/eligibility/challenges`,{method:'POST',headers:owner.headers,body:JSON.stringify({purpose:'age_assessment',territory:'ZZ'})});
  assert.equal(start.status,201); const safe=(await start.json() as { data: { challengeId: string } }).data;
  assert.equal((await fetch(`${base}/fixture/users/me/eligibility/challenges/${safe.challengeId}`,{headers:stranger.headers})).status,404);
  const forged=await fetch(`${base}/fixture/eligibility/provider/callback`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({verified:true,userId:owner.user.id,evidenceReference:'private-callback-material'})});
  assert.equal(forged.status,400); assert.doesNotMatch(await forged.text(),/private-callback-material/);
  const event=adapter.event(); const token=randomUUID(); adapter.events.set(JSON.stringify({token}),event);
  const callback=()=>fetch(`${base}/fixture/eligibility/provider/callback`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token})});
  const outcomes=await Promise.all(Array.from({length:5},callback)); assert.equal(outcomes.filter(res=>res.status===200).length,1);
  for (const res of outcomes) assert.doesNotMatch(await res.text(),/private-evidence|private-parent|private-responsibility/);
  const state=await fetch(`${base}/fixture/users/me/eligibility`,{headers:owner.headers}); assert.equal(state.status,200);
  assert.doesNotMatch(await state.text(),/evidenceReference|guardianReference|responsibilityReference|nonceHash|issuer/);
  assert.doesNotMatch(JSON.stringify(jwt.decode(owner.token)),/experience|threshold|guardian|evidence/);
});
test('guardian endpoint starts verification, ignores client authority and supports owner withdrawal',async () => {
  const owner=await identity(); const start=await fetch(`${base}/fixture/users/me/guardian-authorizations`,{method:'POST',headers:owner.headers,
    body:JSON.stringify({territory:'ZZ',purposes:['account_activation']})}); assert.equal(start.status,201);
  assert.equal((await service.listGuardianAuthorizations(owner.user.id)).length,0);
  assert.equal(await service.consumeCallback(adapter.callback(),{}),true);
  const res=await fetch(`${base}/fixture/users/me/guardian-authorizations`,{headers:owner.headers}); const grants=(await res.json() as { data: { id: string }[] }).data;
  assert.doesNotMatch(JSON.stringify(grants),/private-|guardianUserId|responsibility/);
  assert.equal((await fetch(`${base}/fixture/users/me/guardian-authorizations/${grants[0].id}/withdraw`,{method:'POST',headers:owner.headers})).status,200);
  assert.equal((await service.listGuardianAuthorizations(owner.user.id))[0].status,'withdrawn');
});
test('malformed callback bytes cannot reach the general logger or response',async () => {
  const captured: unknown[]=[];const original=logger.error;logger.error=((...args:unknown[])=>{captured.push(args);}) as typeof logger.error;
  try {
    const res=await fetch(`${base}/fixture/eligibility/provider/callback`,{method:'POST',headers:{'Content-Type':'application/json'},body:'{"private-callback-material":'});
    assert.equal(res.status,400);assert.doesNotMatch(await res.text(),/private-callback-material/);assert.deepEqual(captured,[]);
    const oversized=await fetch(`${base}/fixture/eligibility/provider/callback`,{method:'POST',headers:{'Content-Type':'application/json'},body:'private-callback-material'.repeat(3000)});
    assert.equal(oversized.status,400);assert.doesNotMatch(await oversized.text(),/private-callback-material/);assert.deepEqual(captured,[]);
  } finally {logger.error=original;}
});
