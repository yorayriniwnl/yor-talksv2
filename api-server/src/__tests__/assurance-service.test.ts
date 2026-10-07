import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { db, pool } from '@workspace/db';
import { UserRepository } from '../repositories/user-repository.js';
import { EligibilityRepository } from '../repositories/eligibility-repository.js';
import { AssuranceService } from '../services/assurance-service.js';
import { UnavailableAssuranceAdapter } from '../eligibility/assurance-adapter.js';
import { createTestUser } from './test-helpers.js';
import { FixtureAssuranceAdapter, fixturePolicies } from './assurance-fixtures.js';
import { env } from '../config/env.js';

const users: string[] = [];
after(async () => { await pool.query('DELETE FROM users WHERE id=ANY($1::uuid[])',[users]); await pool.end(); });
async function setup(options: { timeoutMs?: number; maxOutstanding?: number } = {}) {
  const user = await createTestUser(new UserRepository()); users.push(user.id);
  const repo = new EligibilityRepository(); const adapter = new FixtureAssuranceAdapter(); let policies = fixturePolicies();
  const service = new AssuranceService(repo,adapter,{ policies: () => policies, operatorPolicyIds: ['fixture-operator'], ...options });
  return { user,repo,adapter,service, changePolicies: () => { policies = policies.map(p => ({ ...p, maximumContentRating: 'child_safe' })); } };
}
test('default unavailable provider cannot create authority or reserve challenges', async () => {
  const { user,repo } = await setup(); const service = new AssuranceService(repo,new UnavailableAssuranceAdapter());
  await assert.rejects(service.startOwnerChallenge(user.id,{ purpose: 'age_assessment',territory: 'ZZ' }), /Verification provider unavailable/);
  assert.equal((await pool.query('SELECT count(*)::int n FROM eligibility_challenges WHERE user_id=$1',[user.id])).rows[0].n,0);
  await assert.rejects(service.consumeCallback(Buffer.from('{"verified":true}'),{}), /Verification provider unavailable/);
});
test('strict challenge intake cannot accept verified flags, asserted bands or parent evidence', async () => {
  const { user,service } = await setup();
  for (const extra of [{ verified: true },{ guardianApproved: true },{ experience: 'adult_18_plus' },{ guardianUserId: randomUUID() }])
    await assert.rejects(service.startOwnerChallenge(user.id,{ purpose: 'age_assessment',territory: 'ZZ',...extra } as never));
});
test('verified callback consumes once, stores private proof, and exposes only safe owner status', async () => {
  const { user,repo,adapter,service } = await setup();
  const safe = await service.startOwnerChallenge(user.id,{ purpose: 'age_assessment',territory: 'ZZ' });
  assert.doesNotMatch(JSON.stringify(safe), /nonce|issuer|audience|private-/);
  const body = adapter.callback();
  const outcomes = await Promise.all(Array.from({length: 8},() => service.consumeCallback(body,{})));
  assert.equal(outcomes.filter(Boolean).length,1);
  assert.equal((await repo.readFacts(user.id))?.assessment?.evidenceReference,'private-evidence-reference');
  assert.equal((await service.ownerChallengeStatus(user.id,safe.challengeId))?.status,'consumed');
  assert.equal(await service.ownerChallengeStatus(randomUUID(),safe.challengeId),undefined);
  assert.doesNotMatch(JSON.stringify(await service.ownerStatus(user.id)), /private-evidence|private-parent|nonce|issuer|audience/);
});
test('wrong subject, issuer, audience, purpose, nonce, expiry or policy cannot consume a challenge', async () => {
  const { user,repo,adapter,service } = await setup();
  await service.startOwnerChallenge(user.id,{ purpose: 'age_assessment',territory: 'ZZ' });
  for (const patch of [{ userId: randomUUID() },{ enrollmentId: randomUUID() },{ issuer: 'wrong' },{ audience: 'wrong' },
    { purpose: 'guardian_authorization' },{ nonce: 'wrong' },{ expiresAt: new Date(Date.now()-1000).toISOString() },
    { policyVersions: { 'fixture-recipient': 'stale' } }]) {
    assert.equal(await service.consumeCallback(adapter.callback({ ...adapter.event(),...patch } as never),{}),false);
  }
  const event = adapter.event(); if (event.purpose === 'age_assessment') event.assessment.thresholds = [{ age: 13,atLeast: false },{ age: 18,atLeast: true }];
  assert.equal(await service.consumeCallback(adapter.callback(event),{}),false);
  assert.equal((await repo.readFacts(user.id))?.assessment,undefined);
  assert.equal(await service.consumeCallback(adapter.callback(),{}),true);
});
test('same-version policy changes and expired challenge invalidate in-flight results', async () => {
  const first = await setup(); await first.service.startOwnerChallenge(first.user.id,{ purpose: 'age_assessment',territory: 'ZZ' });
  first.changePolicies(); assert.equal(await first.service.consumeCallback(first.adapter.callback(),{}),false);
  const second = await setup(); await second.service.startOwnerChallenge(second.user.id,{ purpose: 'age_assessment',territory: 'ZZ' });
  await pool.query("UPDATE eligibility_challenges SET created_at=clock_timestamp()-interval '1 hour',expires_at=clock_timestamp()-interval '1 second' WHERE id=$1",[second.adapter.starts[0].id]);
  assert.equal(await second.service.consumeCallback(second.adapter.callback(),{}),false);
});
test('issuer event uniqueness rolls back challenge consumption and proof writes', async () => {
  const { user,repo,adapter,service } = await setup();
  await service.startOwnerChallenge(user.id,{ purpose: 'age_assessment',territory: 'ZZ' });
  const event = adapter.event(); assert.equal(await service.consumeCallback(adapter.callback(event),{}),true);
  const revision = (await repo.readFacts(user.id))!.revision;
  const next = await service.startOwnerChallenge(user.id,{ purpose: 'age_assessment',territory: 'ZZ' });
  assert.equal(await service.consumeCallback(adapter.callback({ ...adapter.event(),eventId: event.eventId }),{}),false);
  assert.equal((await service.ownerChallengeStatus(user.id,next.challengeId))?.status,'pending');
  assert.equal((await repo.readFacts(user.id))!.revision,revision);
});
test('purpose-bound guardian journey verifies responsibility and withdraws atomically without parent disclosure', async () => {
  const { user,repo,adapter,service } = await setup();
  await service.startOwnerChallenge(user.id,{ purpose: 'guardian_authorization',territory: 'ZZ',purposes: ['account_activation'] });
  const bad = adapter.event(); if (bad.purpose === 'guardian_authorization') bad.guardian.noticeVersions = { account_activation: 'wrong-notice' };
  assert.equal(await service.consumeCallback(adapter.callback(bad),{}),false);
  assert.equal(await service.consumeCallback(adapter.callback(),{}),true);
  const safe = await service.listGuardianAuthorizations(user.id); assert.equal(safe.length,1);
  assert.doesNotMatch(JSON.stringify(safe), /private-|guardianUserId|issuer|responsibility/);
  await service.startOwnerChallenge(user.id,{ purpose: 'guardian_authorization',territory: 'ZZ',purposes: ['account_activation'] });
  const stale = adapter.callback(); const revision = (await repo.readFacts(user.id))!.revision;
  assert.equal(await service.withdrawGuardianAuthorization(randomUUID(),safe[0].id),false);
  assert.equal(await service.withdrawGuardianAuthorization(user.id,safe[0].id),true);
  assert.equal(await service.consumeCallback(stale,{}),false);
  assert.ok(BigInt((await repo.readFacts(user.id))!.revision)>BigInt(revision));
});
test('callback waiting on subject lock loses to guardian withdrawal; no stale grant is written', async () => {
  const { user,repo,adapter,service } = await setup();
  await service.startOwnerChallenge(user.id,{ purpose: 'guardian_authorization',territory: 'ZZ',purposes: ['account_activation'] });
  assert.equal(await service.consumeCallback(adapter.callback(),{}),true);
  const grant = (await service.listGuardianAuthorizations(user.id))[0];
  await service.startOwnerChallenge(user.id,{ purpose: 'guardian_authorization',territory: 'ZZ',purposes: ['account_activation'] });
  let callback!: Promise<boolean>;
  await db.transaction(async tx => {
    await repo.lockSubject({ userId: user.id },tx);
    callback = service.consumeCallback(adapter.callback(),{});
    assert.equal(await repo.withdrawGuardianAuthorization(grant.id,user.id,tx),true);
  });
  assert.equal(await callback,false); assert.equal((await service.listGuardianAuthorizations(user.id)).length,1);
});
test('bounded outstanding reservations across concurrent starts and safe provider timeouts', async () => {
  const { user,adapter,service } = await setup({ maxOutstanding: 2,timeoutMs: 20 });
  const attempts = await Promise.allSettled(Array.from({length: 8},() => service.startOwnerChallenge(user.id,{ purpose: 'age_assessment',territory: 'ZZ' })));
  assert.equal(attempts.filter(result => result.status==='fulfilled').length,2);
  const other = await setup({ timeoutMs: 20 }); other.adapter.start = async () => new Promise(() => {});
  await assert.rejects(other.service.startOwnerChallenge(other.user.id,{ purpose: 'age_assessment',territory: 'ZZ' }), /Verification provider unavailable/);
  adapter.verifyCallback = async () => { throw new Error('private-untrusted-callback-material'); };
  assert.equal(await service.consumeCallback(Buffer.from('private-callback-body'),{}),false);
});
test('callback timeout is safe and a failed provider start revokes its reservation',async () => {
  const {user,adapter,service}=await setup({timeoutMs:20});
  adapter.start=async challenge=>{ adapter.starts.push(challenge); throw new Error('private-provider-failure'); };
  await assert.rejects(service.startOwnerChallenge(user.id,{purpose:'age_assessment',territory:'ZZ'}),/Verification provider unavailable/);
  assert.equal(await service.consumeCallback(adapter.callback(),{}),false);
  adapter.verifyCallback=async()=>new Promise(()=>{});
  await assert.rejects(service.consumeCallback(Buffer.from('private-body'),{}),error=>error instanceof Error && error.message==='Verification provider unavailable');
});
test('revoked linked parent and policy replacement during proof writes cannot grant authority',async () => {
  const first=await setup(); const parent=await createTestUser(new UserRepository());users.push(parent.id);
  await first.service.startOwnerChallenge(first.user.id,{purpose:'guardian_authorization',territory:'ZZ',purposes:['account_activation']});
  const event=first.adapter.event();if(event.purpose==='guardian_authorization')event.guardian.guardianUserId=parent.id;
  await pool.query("UPDATE users SET account_status='suspended' WHERE id=$1",[parent.id]);
  assert.equal(await first.service.consumeCallback(first.adapter.callback(event),{}),false);
  const second=await setup();await second.service.startOwnerChallenge(second.user.id,{purpose:'age_assessment',territory:'ZZ'});
  const store=second.repo.storeAssessment.bind(second.repo);
  second.repo.storeAssessment=async(value,tx)=>{await store(value,tx);second.changePolicies();};
  assert.equal(await second.service.consumeCallback(second.adapter.callback(),{}),false);
  assert.equal((await second.repo.readFacts(second.user.id))?.assessment,undefined);
  assert.equal((await second.service.ownerChallengeStatus(second.user.id,second.adapter.starts[0].id))?.status,'pending');
});
test('private challenge policy binding cannot contain only half its required fields',async () => {
  const {user,repo}=await setup();
  await assert.rejects(db.transaction(tx=>repo.createChallenge({userId:user.id,id:randomUUID(),issuer:'isolated-fixture',audience:'fixture-app',purpose:'age_assessment',
    nonceHash:'a'.repeat(64),subjectRevision:'0',policyVersions:{fixture:'1'},noticeVersions:{},requestedPurposes:[],
    territory:'ZZ',expiresAt:new Date(Date.now()+60_000).toISOString()},tx)));
});
test('expired proof during awaited database write rolls back its challenge and authority',async () => {
  const {user,repo,adapter,service}=await setup();await service.startOwnerChallenge(user.id,{purpose:'age_assessment',territory:'ZZ'});
  const event=adapter.event();event.expiresAt=new Date(Date.now()+100).toISOString();
  const store=repo.storeAssessment.bind(repo);repo.storeAssessment=async(value,tx)=>{await store(value,tx);await pool.query('SELECT pg_sleep(0.15)');};
  assert.equal(await service.consumeCallback(adapter.callback(event),{}),false);
  assert.equal((await repo.readFacts(user.id))?.assessment,undefined);
  assert.equal((await service.ownerChallengeStatus(user.id,adapter.starts[0].id))?.status,'pending');
});
test('fixture adapter injection is refused by production environment',()=>{
  const previous=env.NODE_ENV;
  try {env.NODE_ENV='production';assert.throws(()=>new AssuranceService(new EligibilityRepository(),new FixtureAssuranceAdapter()),/Verification provider unavailable/);}
  finally {env.NODE_ENV=previous;}
});
