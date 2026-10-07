import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { randomUUID } from 'node:crypto';
import type { PoolClient } from 'pg';
import { db, pool } from '@workspace/db';
import { UserRepository } from '../repositories/user-repository.js';
import { createTestUser } from './test-helpers.js';
import { toOwnUser, toPublicUser } from '../utils/user-view.js';
import { AccountService } from '../services/account-service.js';
import type { ApprovedTerritoryPolicy, GuardianAuthorization } from '../eligibility/types.js';

const fixtureUsers: string[] = [];
const schemas: string[] = [];
after(async () => {
  await pool.query('DELETE FROM users WHERE id=ANY($1::uuid[])', [fixtureUsers]);
  for (const schema of schemas) await pool.query(`DROP SCHEMA "${schema}" CASCADE`);
  await pool.end();
});
async function newUser() {
  const user = await createTestUser(new UserRepository(), { ageConfirmedAt: new Date().toISOString() });
  fixtureUsers.push(user.id);
  return user;
}
async function repository() {
  const { EligibilityRepository } = await import('../repositories/eligibility-repository.js');
  return new EligibilityRepository();
}
async function migrate(client: PoolClient) {
  const modulePath = '../../../lib/db/scripts/migrate-eligibility.mjs';
  const { migrateEligibility } = await import(modulePath);
  await migrateEligibility(client);
}

test('eligibility migration is additive and idempotent on fresh and populated baselines', async () => {
  for (const populated of [false, true]) {
    const schema = `eligibility_test_${randomUUID().replaceAll('-', '')}`;
    schemas.push(schema);
    const client = await pool.connect();
    try {
      await client.query(`CREATE SCHEMA "${schema}"`);
      await client.query(`SET search_path TO "${schema}"`);
      await client.query('CREATE TABLE users(id uuid PRIMARY KEY, age_confirmed_at timestamptz)');
      await client.query('CREATE TABLE posts(id uuid PRIMARY KEY, content text)');
      const userId = randomUUID();
      const postId = randomUUID();
      if (populated) {
        await client.query("INSERT INTO users VALUES($1,'2026-01-01T00:00:00Z')", [userId]);
        await client.query("INSERT INTO posts VALUES($1,'Preserve historical content')", [postId]);
      }
      await client.query('BEGIN');
      await migrate(client);
      await client.query('ROLLBACK');
      assert.equal((await client.query("SELECT to_regclass('eligibility_assessments') AS table_name")).rows[0].table_name, null);
      await client.query('BEGIN');
      await migrate(client);
      await migrate(client);
      await client.query('COMMIT');
      assert.equal((await client.query("SELECT count(*)::int AS count FROM information_schema.tables WHERE table_schema=$1 AND table_name LIKE 'eligibility_%'", [schema])).rows[0].count, 4);
      assert.equal((await client.query('SELECT count(*)::int AS count FROM eligibility_assessments')).rows[0].count, 0);
      if (populated) {
        assert.ok((await client.query('SELECT age_confirmed_at FROM users WHERE id=$1', [userId])).rows[0].age_confirmed_at);
        assert.equal((await client.query('SELECT content FROM posts WHERE id=$1', [postId])).rows[0].content, 'Preserve historical content');
      }
    } finally { await client.query('ROLLBACK'); await client.query('RESET search_path'); client.release(); }
  }
});

test('historical checkbox stays an attestation; private assessments never join profile or export fields', async () => {
  const user = await newUser();
  const repo = await repository();
  const legacy = await repo.readFacts(user.id);
  assert.ok(legacy);
  assert.equal(legacy.assessment, undefined);
  assert.equal(legacy.revision, '0');
  assert.ok((await new UserRepository().findById(user.id))?.ageConfirmedAt);
  const { createEligibilityFixture } = await import('./eligibility-fixtures.js');
  await createEligibilityFixture(user.id);
  const facts = await repo.readFacts(user.id);
  assert.equal(facts?.assessment?.evidenceReference, 'opaque-fixture-reference');
  assert.equal(facts?.assessment?.experience, 'adult_18_plus');
  for (const view of [toOwnUser(user), toPublicUser(user), await new UserRepository().findById(user.id),
    await new AccountService(new UserRepository(), {} as never).exportAccount(user.id)]) {
    const payload = view as unknown as Record<string, unknown>;
    assert.equal(payload.evidenceReference, undefined);
    assert.equal(payload.assessment, undefined);
    assert.doesNotMatch(JSON.stringify(payload), /opaque-fixture-reference|synthetic-thresholds/);
  }
  assert.equal(await repo.readFacts(randomUUID()), undefined);
});

test('newer authority revision wins even when transaction timestamps sort before old proof', async () => {
  const user = await newUser();
  const repo = await repository();
  const { createEligibilityFixture } = await import('./eligibility-fixtures.js');
  await createEligibilityFixture(user.id);
  const verified = (await repo.readFacts(user.id))!.assessment!;
  const id = randomUUID();
  await db.transaction(tx => repo.storeAssessment({ ...verified, id, status: 'revoked' }, tx));
  await pool.query("UPDATE eligibility_assessments SET created_at='2020-01-01T00:00:00Z' WHERE id=$1", [id]);
  assert.equal((await repo.readFacts(user.id))?.assessment?.status, 'revoked');
});

test('eligibility revisions increment atomically without losing bigint precision and roll back with facts', async () => {
  const user = await newUser();
  const repo = await repository();
  await pool.query('INSERT INTO eligibility_revisions(user_id,revision) VALUES($1,9007199254740993)', [user.id]);
  const revisions = await Promise.all(Array.from({ length: 8 }, () => db.transaction(tx => repo.advanceRevision(user.id, tx))));
  assert.equal(new Set(revisions).size, 8);
  assert.equal((await repo.readFacts(user.id))?.revision, '9007199254741001');
  await assert.rejects(db.transaction(async tx => { await repo.advanceRevision(user.id, tx); throw new Error('synthetic rollback'); }), /synthetic rollback/);
  assert.equal((await repo.readFacts(user.id))?.revision, '9007199254741001');
});

async function challenge(userId: string, overrides: Record<string, unknown> = {}) {
  const repo = await repository();
  const value = { id: randomUUID(), userId, issuer: 'isolated-fixture', audience: 'yor-talks-fixture',
    purpose: 'age_assessment' as const, nonceHash: randomUUID().replaceAll('-', '').repeat(2),
    policyVersions: { 'fixture-recipient': 'fixture-1' }, noticeVersions: {}, requestedPurposes: [],
    subjectRevision: (await repo.readFacts(userId))!.revision,
    expiresAt: new Date(Date.now() + 60_000).toISOString(), ...overrides };
  await db.transaction(tx => repo.createChallenge(value, tx));
  return value;
}

test('challenge consumption is subject/purpose/revision bound, single-use and event unique', async () => {
  const owner = await newUser();
  const other = await newUser();
  const repo = await repository();
  const value = await challenge(owner.id);
  const eventId = randomUUID();
  const input = { challengeId: value.id, userId: owner.id, issuer: value.issuer, audience: value.audience,
    purpose: value.purpose, nonceHash: value.nonceHash, eventId, subjectRevision: value.subjectRevision };
  for (const forged of [{ userId: other.id }, { purpose: 'guardian_authorization' }, { nonceHash: '0'.repeat(64) }, { issuer: 'wrong' }, { audience: 'wrong' }, { subjectRevision: '1' }]) {
    assert.equal(await db.transaction(tx => repo.consumeChallenge({ ...input, ...forged } as never, tx)), false);
  }
  const results = await Promise.all(Array.from({ length: 8 }, () => db.transaction(tx => repo.consumeChallenge(input, tx))));
  assert.equal(results.filter(Boolean).length, 1);
  const second = await challenge(owner.id);
  await assert.rejects(db.transaction(tx => repo.consumeChallenge({ ...input, challengeId: second.id, nonceHash: second.nonceHash }, tx)));
  assert.equal((await pool.query('SELECT consumed_at FROM eligibility_challenges WHERE id=$1', [second.id])).rows[0].consumed_at, null);
  const expired = await challenge(owner.id);
  await pool.query("UPDATE eligibility_challenges SET created_at=now()-interval '2 hours',expires_at=now()-interval '1 hour' WHERE id=$1", [expired.id]);
  assert.equal(await db.transaction(tx => repo.consumeChallenge({ ...input, challengeId: expired.id, nonceHash: expired.nonceHash, eventId: randomUUID() }, tx)), false);
  const stale = await challenge(owner.id);
  await db.transaction(tx => repo.advanceRevision(owner.id, tx));
  assert.equal(await db.transaction(tx => repo.consumeChallenge({ ...input, challengeId: stale.id, nonceHash: stale.nonceHash,
    subjectRevision: stale.subjectRevision, eventId: randomUUID() }, tx)), false);
});

test('pre-account enrollments remain opaque and private subject/timestamp constraints cannot be bypassed', async () => {
  const user = await newUser();
  const repo = await repository();
  const enrollmentId = randomUUID();
  try {
    await pool.query("INSERT INTO eligibility_enrollments(id,credential_hash,requested_experience,territory,expires_at) VALUES($1,$2,'under_13','ZZ',now()+interval '1 hour')", [enrollmentId, 'a'.repeat(64)]);
    const columns = (await pool.query("SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='eligibility_enrollments'")).rows.map(row => row.column_name);
    for (const field of ['email', 'full_name', 'birth_date', 'date_of_birth', 'avatar_url', 'password_hash', 'child_name']) assert.equal(columns.includes(field), false);
    await assert.rejects(pool.query("UPDATE eligibility_enrollments SET status='authorized' WHERE id=$1", [enrollmentId]));
    await assert.rejects(pool.query("UPDATE eligibility_enrollments SET credential_hash='guessable' WHERE id=$1", [enrollmentId]));
    const { createEligibilityFixture } = await import('./eligibility-fixtures.js');
    await createEligibilityFixture(user.id);
    await assert.rejects(pool.query('UPDATE eligibility_assessments SET enrollment_id=$1 WHERE user_id=$2', [enrollmentId, user.id]));
    await assert.rejects(pool.query('UPDATE eligibility_assessments SET user_id=NULL WHERE user_id=$1', [user.id]));
    const value = await challenge(user.id);
    await assert.rejects(pool.query('UPDATE eligibility_challenges SET expires_at=created_at WHERE id=$1', [value.id]));
    const authorizationId = randomUUID();
    await assert.rejects(db.transaction(tx => repo.storeGuardianAuthorization({ id: authorizationId, userId: user.id,
      guardianUserId: null, guardianReference: 'opaque', issuer: 'isolated-fixture', responsibilityReference: 'opaque',
      status: 'granted', purposes: ['account_activation'], noticeVersions: {}, policyVersions: { fixture: '1' },
      verifiedAt: new Date().toISOString(), grantedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now()+60_000).toISOString(), withdrawnAt: null }, tx)));
  } finally { await pool.query('DELETE FROM eligibility_enrollments WHERE id=$1', [enrollmentId]); }
});

test('eligibility storage prevents orphans and rejects malformed private authority', async () => {
  const user = await newUser();
  const repo = await repository();
  const { createEligibilityFixture } = await import('./eligibility-fixtures.js');
  await createEligibilityFixture(user.id);
  for (const assignment of [
    "status='invented'", "experience='verified_adult'", "threshold_assertions='{}'::jsonb",
    "threshold_assertions='[{\"age\":18,\"atLeast\":\"yes\"}]'::jsonb",
    "threshold_assertions='[{\"age\":18,\"atLeast\":true},{\"age\":18,\"atLeast\":false}]'::jsonb",
    "verified_at=NULL", "expires_at=verified_at", "evidence_reference=NULL", "policy_versions='[]'::jsonb",
  ]) await assert.rejects(pool.query(`UPDATE eligibility_assessments SET ${assignment} WHERE user_id=$1`, [user.id]));
  await assert.rejects(db.transaction(tx => repo.advanceRevision(randomUUID(), tx)));
  await challenge(user.id);
  await pool.query('DELETE FROM users WHERE id=$1', [user.id]);
  for (const table of ['eligibility_assessments', 'eligibility_challenges', 'eligibility_revisions']) {
    assert.equal((await pool.query(`SELECT 1 FROM ${table} WHERE user_id=$1`, [user.id])).rowCount, 0);
  }
});

test('guardian permissions are purpose-specific, owner-bound and withdrawn with the revision', async () => {
  const child = await newUser();
  const guardian = await newUser();
  const stranger = await newUser();
  const repo = await repository();
  const grantedAt = new Date().toISOString();
  const authorization = { id: randomUUID(), userId: child.id, guardianUserId: guardian.id,
    guardianReference: 'opaque-guardian', issuer: 'isolated-fixture', responsibilityReference: 'opaque-responsibility',
    status: 'granted' as const, purposes: ['account_activation'] as const,
    noticeVersions: { account_activation: 'notice-1' }, policyVersions: { 'fixture-recipient': 'fixture-1' },
    verifiedAt: grantedAt, grantedAt, expiresAt: new Date(Date.now() + 86_400_000).toISOString(), withdrawnAt: null };
  await db.transaction(tx => repo.storeGuardianAuthorization({ ...authorization, purposes: [...authorization.purposes] }, tx));
  assert.deepEqual((await repo.readFacts(child.id))?.guardianAuthorizations[0].purposes, ['account_activation']);
  assert.equal(await db.transaction(tx => repo.withdrawGuardianAuthorization(authorization.id, stranger.id, tx)), false);
  const revision = (await repo.readFacts(child.id))!.revision;
  assert.equal(await db.transaction(tx => repo.withdrawGuardianAuthorization(authorization.id, guardian.id, tx)), true);
  const facts = (await repo.readFacts(child.id))!;
  assert.equal(facts.guardianAuthorizations[0].status, 'withdrawn');
  assert.ok(facts.guardianAuthorizations[0].withdrawnAt);
  assert.ok(BigInt(facts.revision) > BigInt(revision));
  assert.equal(await db.transaction(tx => repo.withdrawGuardianAuthorization(authorization.id, guardian.id, tx)), false);
  await assert.rejects(db.transaction(tx => repo.storeGuardianAuthorization({ ...authorization, id: randomUUID(), purposes: [] }, tx)));
});

test('current eligibility service observes real proof, newer guardian withdrawal and registry withdrawal', async () => {
  const child = await newUser(); const parent = await newUser(); const repo = await repository();
  const { createEligibilityFixture } = await import('./eligibility-fixtures.js');
  const { EligibilityService } = await import('../services/eligibility-service.js');
  const now = new Date(); const before = new Date(now.getTime()-60_000).toISOString(); const after = new Date(now.getTime()+86_400_000).toISOString();
  const registry: ApprovedTerritoryPolicy[] = (['recipient','operator'] as const).map(scope => ({
    id: `fixture-${scope}`, scope, territory: scope === 'recipient' ? 'ZZ' : 'EE', version: 'fixture-1', approved: true,
    synthetic: true, approvalReference: 'isolated-approval', effectiveFrom: before, reviewExpiresAt: after,
    sources: ['https://legal.example/fixture'], allowedExperiences: ['under_13','teen_13_17','adult_18_plus'], minimumAccessThreshold: null,
    independentConsentThreshold: 13, guardianRequiredBelow: null, requiredGuardianPurposes: ['account_activation'],
    guardianNoticeVersions: { account_activation: 'notice-1' }, currentTermsVersion: 'terms-1', guardianContactsRequired: true,
    publicBrowsingAllowed: true, maximumContentRating: 'mature', capabilities: { social: true,publish: true,messaging: true,payments: false,seller: false,memberships: false,live: false,rtc: false,ai: false,analytics: false,profiling: false },
  }));
  await createEligibilityFixture(child.id, { account: { id: child.id,status: 'active',termsVersion: 'terms-1',termsAcceptedAt: before,contentPreference: 'mature' } });
  const adult = (await repo.readFacts(child.id))!.assessment!;
  await db.transaction(tx => repo.storeAssessment({ ...adult,id: randomUUID(),experience: 'under_13',thresholds: [{age:13,atLeast:false},{age:18,atLeast:false}] },tx));
  const service = new EligibilityService(repo,{ policies: () => registry,operatorPolicyIds: ['fixture-operator'],currentTermsVersion: 'terms-1' });
  assert.equal((await service.decisionFor(child.id)).reason,'guardian_required');
  const grant: GuardianAuthorization = { id: randomUUID(),userId: child.id,guardianUserId: parent.id,guardianReference: 'private-parent-reference',issuer: 'isolated-fixture',
    responsibilityReference: 'private-responsibility-reference',status: 'granted',purposes: ['account_activation'],noticeVersions: {account_activation:'notice-1'},
    policyVersions: {'fixture-recipient':'fixture-1','fixture-operator':'fixture-1'},verifiedAt: before,grantedAt: before,expiresAt: after,withdrawnAt: null };
  await db.transaction(tx => repo.storeGuardianAuthorization(grant,tx));
  const newer = {...grant,id:randomUUID()}; await db.transaction(tx => repo.storeGuardianAuthorization(newer,tx));
  const allowed = await service.decisionFor(child.id); assert.equal(allowed.activated,true); assert.equal(allowed.maximumContentRating,'child_safe');
  assert.doesNotMatch(JSON.stringify(allowed), /private-parent|private-responsibility|opaque-fixture-reference/);
  await db.transaction(tx => repo.withdrawGuardianAuthorization(newer.id,parent.id,tx));
  const withdrawn = await service.decisionFor(child.id); assert.equal(withdrawn.activated,false); assert.notEqual(withdrawn.revision,allowed.revision);
  assert.equal((await repo.readFacts(child.id))!.guardianAuthorizations.find(value => value.id===grant.id)?.status,'granted');
  await db.transaction(tx => repo.storeGuardianAuthorization({...grant,id:randomUUID()},tx));
  const reapproved = await service.decisionFor(child.id); assert.equal(reapproved.activated,true);
  registry[0].approved=false;
  const policyWithdrawn = await service.decisionFor(child.id); assert.equal(policyWithdrawn.activated,false); assert.notEqual(policyWithdrawn.revision,reapproved.revision);
});
