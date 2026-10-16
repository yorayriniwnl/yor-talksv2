import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { env } from '../config/env.js';
import { AssuranceService } from '../services/assurance-service.js';
import { EnrollmentUnavailableError, EligibilityEnrollmentService } from '../services/eligibility-enrollment-service.js';
import { EligibilityRepository } from '../repositories/eligibility-repository.js';
import { enrollmentPrescreenSchema } from '../validators/eligibility.js';
import { registerSchema } from '../validators/auth.js';
import { AuthService } from '../services/auth-service.js';
import type { UserRepository } from '../repositories/user-repository.js';
import type { OAuth2Client } from 'google-auth-library';
import type { RedisRepository } from '../repositories/redis-repository.js';
import type { EmailService } from '../services/email-service.js';
import { createHash, randomUUID } from 'node:crypto';
import { db, pool, type DbTransaction } from '@workspace/db';
import { fixturePolicies } from './assurance-fixtures.js';
import type { ApprovedTerritoryPolicy } from '../eligibility/types.js';
import { FixtureAssuranceAdapter } from './assurance-fixtures.js';
import { createTestUser } from './test-helpers.js';
import { UserRepository as ConcreteUserRepository } from '../repositories/user-repository.js';
import type { RedisRepository as ConcreteRedisRepository } from '../repositories/redis-repository.js';

const hasDisposableDatabase = (process.env.CI==='true' && Boolean(process.env.DATABASE_URL))
  || Boolean(process.env.TEST_DATABASE_URL && process.env.DATABASE_URL===process.env.TEST_DATABASE_URL);
const cleanupUserIds: string[] = [];
const cleanupUsernames: string[] = [];
const cleanupEnrollmentIds: string[] = [];
after(async () => {
  if (!hasDisposableDatabase) return;
  if (cleanupEnrollmentIds.length) await pool.query('DELETE FROM eligibility_enrollments WHERE id=ANY($1::uuid[])',[cleanupEnrollmentIds]);
  if (cleanupUsernames.length) await pool.query('DELETE FROM users WHERE username=ANY($1::text[])',[cleanupUsernames]);
  if (cleanupUserIds.length) await pool.query('DELETE FROM users WHERE id=ANY($1::uuid[])',[cleanupUserIds]);
  await pool.end();
});

function enrollmentTestPolicies(): ApprovedTerritoryPolicy[] {
  return fixturePolicies().map(policy => ({ ...policy,allowedExperiences: ['under_13','teen_13_17','adult_18_plus'] as ApprovedTerritoryPolicy['allowedExperiences'],
    requiredGuardianPurposes: ['account_collection'] as ApprovedTerritoryPolicy['requiredGuardianPurposes'],
    guardianNoticeVersions: { account_collection: 'collection-notice-1' } }));
}

test('prescreen returns no enrollment when verification or an approved territory is unavailable', async () => {
  let writes = 0;
  const assurance = { callbacksEnabled: false } as unknown as AssuranceService;
  const repository = { createEnrollment: async () => { writes++; } } as unknown as EligibilityRepository;
  const service = new EligibilityEnrollmentService(assurance,repository,{ policies: () => [],operatorPolicyIds: ['operator'] });
  const result = await service.prescreen({ requestedExperience: 'under_13',territory: 'US' });

  assert.deepEqual(result,{ status: 'unavailable',nextStep: null });
  assert.equal(writes,0);
});

test('prescreen does not create an enrollment for an unreviewed territory even with a test provider', async () => {
  let writes = 0;
  const assurance = { callbacksEnabled: true } as unknown as AssuranceService;
  const repository = { createEnrollment: async () => { writes++; } } as unknown as EligibilityRepository;
  const service = new EligibilityEnrollmentService(assurance,repository,{ policies: fixturePolicies,operatorPolicyIds: ['fixture-operator'] });
  const result = await service.prescreen({ requestedExperience: 'teen_13_17',territory: 'US' });

  assert.deepEqual(result,{ status: 'unavailable',nextStep: null });
  assert.equal(writes,0);
});

test('prescreen accepts only a coarse experience and territory declaration', () => {
  assert.equal(enrollmentPrescreenSchema.safeParse({ requestedExperience: 'under_13',territory: 'US' }).success,true);
  assert.equal(enrollmentPrescreenSchema.safeParse({ requestedExperience: 'under_13',territory: 'US',email: 'child@example.test' }).success,false);
});

test('registration rejects self-asserted age and proof fields', () => {
  const valid = { enrollmentId: '6c2fe577-56a6-4736-8c83-c0b2a278eb5b',registrationNonce: 'x'.repeat(43),
    username: 'person-1',email: 'person@example.test',password: 'GoodPassword1!',fullName: 'Example Person',acceptedTerms: true };
  assert.equal(registerSchema.safeParse(valid).success,true);
  assert.equal(registerSchema.safeParse({ ...valid,enrollmentId: undefined,registrationNonce: undefined }).success,false);
  assert.equal(registerSchema.safeParse({ ...valid,confirmedAge: true }).success,false);
  assert.equal(registerSchema.safeParse({ ...valid,experience: 'adult_18_plus',guardianApproved: true }).success,false);
});

test('password registration stops before user lookup, persistence, or email when enrollment is not authorized', async () => {
  const calls = { lookup: 0,create: 0,email: 0 };
  const users = {
    findByEmail: async () => { calls.lookup++; return undefined; },
    findByUsername: async () => { calls.lookup++; return undefined; },
    create: async () => { calls.create++; throw new Error('must not persist'); },
  } as unknown as UserRepository;
  const enrollment = {
    consumeAuthorizedEnrollment: async () => { throw new EnrollmentUnavailableError(); },
    bindAuthorizedEnrollment: async () => undefined,
  } as unknown as EligibilityEnrollmentService;
  const email = { sendVerificationEmail: async () => { calls.email++; return true; } } as unknown as EmailService;
  const auth = new AuthService(users,{} as RedisRepository,undefined,email,enrollment,undefined,
    async operation => operation({} as DbTransaction));
  await assert.rejects(() => auth.register({ enrollmentId: randomUUID(),registrationNonce: 'x'.repeat(43),username: 'child-1',
    email: 'child@example.test',password: 'GoodPassword1!',fullName: 'Example Child',acceptedTerms: true }),EnrollmentUnavailableError);
  assert.deepEqual(calls,{ lookup: 0,create: 0,email: 0 });
});

test('under-13 enrollment gates profile creation, rechecks guardian withdrawal, and consumes one time under concurrency',
  { skip: !hasDisposableDatabase },async () => {
    const repository = new EligibilityRepository();
    const adapter = new FixtureAssuranceAdapter();
    const policies = enrollmentTestPolicies();
    const assurance = new AssuranceService(repository,adapter,{ policies: () => policies,operatorPolicyIds: ['fixture-operator'] });
    const enrollments = new EligibilityEnrollmentService(assurance,repository,{ policies: () => policies,operatorPolicyIds: ['fixture-operator'] });
    const users = new ConcreteUserRepository();
    const guardian = await createTestUser(users);
    cleanupUserIds.push(guardian.id);
    let emailSends = 0;
    const fakeRedis = { hashToken: async (value: string) => createHash('sha256').update(value).digest('hex'),
      setStrict: async () => undefined,delStrict: async () => undefined } as unknown as ConcreteRedisRepository;
    const email = { sendVerificationEmail: async () => { emailSends++; return true; } } as unknown as EmailService;
    const auth = new AuthService(users,fakeRedis,undefined,email,enrollments);
    const makeRegistration = (id: string,suffix: string) => {
      const username = `kid-${id.slice(0,8)}-${suffix}`;
      cleanupUsernames.push(username);
      return { enrollmentId: id,registrationNonce: '',username,email: `${username}@example.com`,
        password: 'GoodPassword1!',fullName: 'Example Child',acceptedTerms: true };
    };
    const countFor = async (emailAddress: string) => Number((await pool.query('SELECT count(*)::int AS n FROM users WHERE email=$1',[emailAddress])).rows[0].n);
    const approveGuardian = async (id: string,nonce: string) => {
      await enrollments.startChallenge(id,nonce,'guardian_authorization');
      const event = adapter.event();
      if (event.purpose!=='guardian_authorization') throw new Error('Expected guardian challenge');
      event.guardian.guardianUserId = guardian.id;
      assert.equal(await assurance.consumeCallback(adapter.callback(event),{}),true);
    };

    const withdrawn = await enrollments.prescreen({ requestedExperience: 'under_13',territory: 'ZZ' });
    assert.ok(withdrawn.enrollment);
    cleanupEnrollmentIds.push(withdrawn.enrollment.id);
    const withdrawnRegistration = { ...makeRegistration(withdrawn.enrollment.id,'withdrawn'),registrationNonce: withdrawn.enrollment.registrationNonce };
    assert.equal(await countFor(withdrawnRegistration.email),0);
    await approveGuardian(withdrawn.enrollment.id,withdrawn.enrollment.registrationNonce);
    const withdrawnEvidence = await db.transaction(tx => repository.readEnrollmentEvidence(withdrawn.enrollment!.id,tx));
    const guardianAuthorization = withdrawnEvidence.guardianAuthorizations[0];
    assert.ok(guardianAuthorization);
    assert.equal(await db.transaction(tx => repository.withdrawGuardianAuthorization(guardianAuthorization.id,guardian.id,tx)),true);
    await assert.rejects(() => enrollments.startChallenge(withdrawn.enrollment!.id,withdrawn.enrollment!.registrationNonce,'age_assessment'),EnrollmentUnavailableError);
    await assert.rejects(() => auth.register(withdrawnRegistration),EnrollmentUnavailableError);
    assert.equal(await countFor(withdrawnRegistration.email),0);

    const expired = await enrollments.prescreen({ requestedExperience: 'teen_13_17',territory: 'ZZ' });
    assert.ok(expired.enrollment);
    cleanupEnrollmentIds.push(expired.enrollment.id);
    await pool.query(`UPDATE eligibility_enrollments SET created_at=clock_timestamp()-interval '1 hour',
      expires_at=clock_timestamp()-interval '1 second' WHERE id=$1`,[expired.enrollment.id]);
    const expiredRegistration = { ...makeRegistration(expired.enrollment.id,'expired'),registrationNonce: expired.enrollment.registrationNonce };
    assert.equal((await enrollments.status(expired.enrollment.id,expired.enrollment.registrationNonce))?.status,'unavailable');
    await assert.rejects(() => auth.register(expiredRegistration),EnrollmentUnavailableError);
    assert.equal(await countFor(expiredRegistration.email),0);

    const ready = await enrollments.prescreen({ requestedExperience: 'under_13',territory: 'ZZ' });
    assert.ok(ready.enrollment);
    cleanupEnrollmentIds.push(ready.enrollment.id);
    const registrationA = { ...makeRegistration(ready.enrollment.id,'a'),registrationNonce: ready.enrollment.registrationNonce };
    const registrationB = { ...makeRegistration(ready.enrollment.id,'b'),registrationNonce: ready.enrollment.registrationNonce };
    assert.equal(await countFor(registrationA.email),0);
    await approveGuardian(ready.enrollment.id,ready.enrollment.registrationNonce);
    assert.equal(await countFor(registrationA.email),0);
    const assessmentChallenge = await enrollments.startChallenge(ready.enrollment.id,ready.enrollment.registrationNonce,'age_assessment');
    assert.ok(assessmentChallenge.challengeId);
    const ageEvent = adapter.event();
    if (ageEvent.purpose!=='age_assessment') throw new Error('Expected age challenge');
    ageEvent.assessment.experience = 'under_13';
    ageEvent.assessment.thresholds = [{ age: 13,atLeast: false },{ age: 18,atLeast: false }];
    assert.equal(await assurance.consumeCallback(adapter.callback(ageEvent),{}),true);
    const enrollmentStatus = await enrollments.status(ready.enrollment.id,ready.enrollment.registrationNonce);
    assert.equal(enrollmentStatus?.status,'authorized');
    assert.equal('registrationNonce' in (enrollmentStatus?.enrollment ?? {}),false);
    assert.equal(await countFor(registrationA.email),0);

    const results = await Promise.allSettled([auth.register(registrationA),auth.register(registrationB)]);
    const successes = results.filter((result): result is PromiseFulfilledResult<Awaited<ReturnType<typeof auth.register>>> => result.status==='fulfilled');
    assert.equal(successes.length,1);
    const created = successes[0].value.user;
    cleanupUserIds.push(created.id);
    assert.equal(created.ageConfirmedAt,null);
    assert.equal(created.settings?.privateAccount,true);
    assert.equal(created.privacy?.profileVisibility,'private');
    assert.equal(emailSends,1);
    const facts = await repository.readFacts(created.id);
    assert.equal(facts?.assessment?.experience,'under_13');
    assert.equal(facts?.guardianAuthorizations[0]?.userId,created.id);
    assert.equal((await Promise.all([countFor(registrationA.email),countFor(registrationB.email)])).reduce((a,b)=>a+b,0),1);
    const rejection = results.find((result): result is PromiseRejectedResult => result.status==='rejected');
    assert.ok(rejection?.reason instanceof EnrollmentUnavailableError);
  });

test('adult enrollment completes after age assessment without demanding guardian authorization',
  { skip: !hasDisposableDatabase },async () => {
    const repository=new EligibilityRepository(),adapter=new FixtureAssuranceAdapter();
    const policies=enrollmentTestPolicies();
    const assurance=new AssuranceService(repository,adapter,{policies:()=>policies,operatorPolicyIds:['fixture-operator']});
    const enrollments=new EligibilityEnrollmentService(assurance,repository,{policies:()=>policies,operatorPolicyIds:['fixture-operator']});
    const prescreen=await enrollments.prescreen({requestedExperience:'adult_18_plus',territory:'ZZ'});
    assert.ok(prescreen.enrollment);
    cleanupEnrollmentIds.push(prescreen.enrollment.id);
    assert.equal(prescreen.nextStep,'age_assessment');
    const challenge=await enrollments.startChallenge(prescreen.enrollment.id,prescreen.enrollment.registrationNonce,'age_assessment');
    assert.ok(challenge.challengeId);
    const event=adapter.event();
    if(event.purpose!=='age_assessment')throw new Error('Expected an age assessment challenge');
    event.assessment.experience='adult_18_plus';
    event.assessment.thresholds=[{age:13,atLeast:true},{age:18,atLeast:true}];
    assert.equal(await assurance.consumeCallback(adapter.callback(event),{}),true);
    assert.deepEqual(await enrollments.status(prescreen.enrollment.id,prescreen.enrollment.registrationNonce),
      {status:'authorized',nextStep:'complete_registration',enrollment:{id:prescreen.enrollment.id,expiresAt:prescreen.enrollment.expiresAt}});
  });

test('Google sign-in does not create an account when no authorized Yor account exists', async () => {
  const original = env.GOOGLE_CLIENT_ID;
  env.GOOGLE_CLIENT_ID = 'fixture-google-client';
  let creates = 0;
  const users = {
    findByGoogleSubject: async () => undefined,
    findByEmail: async () => undefined,
    create: async () => { creates++; throw new Error('must not create a user'); },
  } as unknown as UserRepository;
  const client = { verifyIdToken: async () => ({ getPayload: () => ({ sub: 'google-subject',email: 'child@example.test',email_verified: true }) }) };
  const auth = new AuthService(users,{} as RedisRepository,undefined,undefined,undefined,() => client as unknown as OAuth2Client);
  try {
    await assert.rejects(() => auth.loginWithGoogle({ credential: 'fixture-google-token' }),/No Yor account exists/);
    assert.equal(creates,0);
  } finally {
    env.GOOGLE_CLIENT_ID = original;
  }
});
