import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, test, type TestContext } from 'node:test';
import { pool } from '@workspace/db';
import { env } from '../config/env.js';
import type { EligibilityDecision } from '../eligibility/types.js';
import { UserRepository } from '../repositories/user-repository.js';
import { PostRepository } from '../repositories/post-repository.js';
import { EligibilityService } from '../services/eligibility-service.js';
import { ProfileVisibilityService } from '../services/profile-visibility-service.js';
import { ProfileInteractionService, ProfileInteractionForbiddenError } from '../services/profile-interaction-service.js';
import { SearchService } from '../services/search-service.js';
import { createTestUser } from './test-helpers.js';

after(() => pool.end());

const adult: EligibilityDecision = {
  experience: 'adult_18_plus', activated: true,
  capabilities: { social: true, publish: true, messaging: true, payments: false, seller: false,
    memberships: false, live: false, rtc: false, ai: false, analytics: false, profiling: false },
  maximumContentRating: 'mature', policyVersions: ['fixture:profile'], revision: 'fixture-adult', reason: null, publicBrowsingAllowed: true,
};
const unknown: EligibilityDecision = { ...adult, experience: 'unknown', activated: false, reason: 'verification_required' };
const teen: EligibilityDecision = { ...adult, experience: 'teen_13_17', maximumContentRating: 'regular' };

async function fixture(t: TestContext) {
  const users = new UserRepository();
  const owned: string[] = [];
  const decisions = new Map<string, EligibilityDecision>();
  const originalEnvironment = env.NODE_ENV;
  env.NODE_ENV = 'production';
  t.after(() => { env.NODE_ENV = originalEnvironment; });
  t.after(async () => { await pool.query('DELETE FROM users WHERE id=ANY($1::uuid[])', [owned]); });
  t.mock.method(EligibilityService.prototype, 'decisionFor', async (id: string) => decisions.get(id) ?? unknown);
  t.mock.method(EligibilityService.prototype, 'decisionForMany', async (ids: string[]) => new Map(ids.map(id => [id, decisions.get(id) ?? unknown])));
  const create = async (name: string, decision = adult) => {
    const user = await createTestUser(users, { username: name, fullName: name });
    owned.push(user.id);
    decisions.set(user.id, decision);
    return user;
  };
  const marker = `profile-${randomUUID().slice(0, 8)}`;
  const viewer = await create(`viewer-${randomUUID().slice(0, 8)}`);
  return { users, viewer, marker, create, decisions };
}

test('general search applies current canonical profile discovery authority', async t => {
  const f = await fixture(t);
  const visible = await f.create(`${f.marker}-public`);
  const privateFollowed = await f.create(`${f.marker}-followed`);
  const privateStranger = await f.create(`${f.marker}-private`);
  const minor = await f.create(`${f.marker}-teen`, teen);
  await f.create(`${f.marker}-unknown`, unknown);
  const suspended = await f.create(`${f.marker}-suspended`);
  const shielded = await f.create(`${f.marker}-blocked`);
  await f.users.update(privateFollowed.id, { settings: { ...privateFollowed.settings, privateAccount: true } });
  await f.users.update(privateStranger.id, { settings: { ...privateStranger.settings, privateAccount: true } });
  await f.users.update(suspended.id, { accountStatus: 'suspended' });
  await f.users.update(f.viewer.id, { blockedUsers: [shielded.id] });
  await f.users.followUser(f.viewer.id, privateFollowed.id);
  await f.users.followUser(f.viewer.id, minor.id);
  const service = new SearchService(f.users, new PostRepository());
  const results = async () => (await service.search(f.marker, f.viewer.id)).users.map(user => user.id).sort();
  assert.deepEqual(await results(), [visible.id, privateFollowed.id].sort());
  assert.deepEqual((await service.search(f.marker)).users, [], 'a guest has no trusted authority for profile discovery');
  f.decisions.set(visible.id, unknown);
  assert.deepEqual(await results(), [privateFollowed.id], 'revocation removes a previously discoverable profile immediately');
  f.decisions.set(f.viewer.id, unknown);
  assert.deepEqual(await results(), [], 'unverified viewers cannot discover other profiles');
});

test('known-ID profile comments and showcases enforce owner authority and current private access', async t => {
  const f = await fixture(t);
  const owner = await f.create(`${f.marker}-owner`);
  const commentId = randomUUID(), showcaseId = randomUUID();
  await pool.query('INSERT INTO profile_comments(id,profile_id,author_id,content) VALUES($1,$2,$3,$4)', [commentId, owner.id, f.viewer.id, 'Synthetic profile comment']);
  await pool.query('INSERT INTO profile_showcases(id,user_id,type,title) VALUES($1,$2,$3,$4)', [showcaseId, owner.id, 'custom', 'Synthetic profile showcase']);
  const service = new ProfileInteractionService(f.users);
  const denied = async () => {
    await assert.rejects(() => service.listShowcases(owner.id, f.viewer.id), ProfileInteractionForbiddenError);
    await assert.rejects(() => service.listCommentsWithAuthors(owner.id, f.viewer.id), ProfileInteractionForbiddenError);
    await assert.rejects(() => service.createComment(owner.id, f.viewer.id, 'Must not reach moderation or persistence'), ProfileInteractionForbiddenError);
  };
  assert.deepEqual((await service.listShowcases(owner.id, f.viewer.id)).map(item => item.id), [showcaseId]);
  assert.deepEqual((await service.listCommentsWithAuthors(owner.id, f.viewer.id)).map(item => item.comment.id), [commentId]);
  for (const accountStatus of ['suspended', 'deactivated', 'deleted'] as const) {
    await f.users.update(owner.id, { accountStatus });
    await denied();
  }
  await f.users.update(owner.id, { accountStatus: 'active' });
  f.decisions.set(owner.id, unknown);
  await denied();
  f.decisions.set(owner.id, teen);
  await denied();
  await f.users.followUser(f.viewer.id, owner.id);
  assert.equal((await service.listShowcases(owner.id, f.viewer.id))[0]?.id, showcaseId, 'current followers retain permitted private access');
  assert.equal((await service.listCommentsWithAuthors(owner.id, f.viewer.id))[0]?.comment.id, commentId);
  await f.users.update(owner.id, { blockedUsers: [f.viewer.id] });
  await denied();
  await f.users.update(owner.id, { blockedUsers: [] });
  f.decisions.set(f.viewer.id, unknown);
  await denied();
});

test('profile discovery batches relationship and current eligibility reads for fifty candidates', async t => {
  const f = await fixture(t);
  const candidates = [];
  for (let i = 0; i < 50; i++) candidates.push(await f.create(`${f.marker}-${i}`));
  let relationshipReads = 0, eligibilityReads = 0;
  const relationships = f.users.audienceRelationships.bind(f.users);
  t.mock.method(f.users, 'audienceRelationships', async (...args: Parameters<UserRepository['audienceRelationships']>) => { relationshipReads++; return relationships(...args); });
  t.mock.method(EligibilityService.prototype, 'decisionForMany', async (ids: string[]) => {
    eligibilityReads++;
    assert.equal(ids.length, 51);
    return new Map(ids.map(id => [id, f.decisions.get(id) ?? unknown]));
  });
  const policy = new ProfileVisibilityService(f.users);
  assert.equal((await policy.filter(candidates, f.viewer.id, { discovery: true })).length, 50);
  assert.equal(relationshipReads, 1);
  assert.equal(eligibilityReads, 1);
});
