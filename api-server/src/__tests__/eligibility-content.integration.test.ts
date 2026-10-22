import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, test } from 'node:test';
import { eq } from 'drizzle-orm';
import { contentSafetyClassificationsTable, db, pool } from '@workspace/db';
import { env } from '../config/env.js';
import type { EligibilityDecision } from '../eligibility/types.js';
import { CONTENT_CLASSIFICATION_POLICY_VERSION, contentHashFor, contentRevisionFor } from '../eligibility/content-policy.js';
import { UserRepository } from '../repositories/user-repository.js';
import { PostRepository } from '../repositories/post-repository.js';
import { EligibilityService } from '../services/eligibility-service.js';
import { ContentSafetyService } from '../services/content-safety-service.js';
import { createTestUser } from './test-helpers.js';

after(() => pool.end());

test('a child-safe approval applies only to its exact content revision and hash', async t => {
  const originalNodeEnv = env.NODE_ENV;
  env.NODE_ENV = 'production';
  t.after(() => { env.NODE_ENV = originalNodeEnv; });
  const decision: EligibilityDecision = {
    experience: 'under_13', activated: true,
    capabilities: { social: true, publish: false, messaging: true, payments: false, seller: false,
      memberships: false, live: false, rtc: false, ai: false, analytics: false, profiling: false },
    maximumContentRating: 'child_safe', policyVersions: ['fixture:1'], revision: 'content-fixture', reason: null,
    publicBrowsingAllowed: true,
  };
  const adultAuthorDecision: EligibilityDecision = { ...decision, experience: 'adult_18_plus', maximumContentRating: 'mature' };
  t.mock.method(EligibilityService.prototype, 'decisionFor', async () => decision);
  t.mock.method(EligibilityService.prototype, 'decisionForMany', async (ids: string[]) => new Map(ids.map(id => [id,adultAuthorDecision])));
  const users = new UserRepository(), posts = new PostRepository();
  const author = await createTestUser(users), viewer = await createTestUser(users);
  const ownedPostIds: string[] = [];
  t.after(async () => {
    for (const id of ownedPostIds) await db.delete(contentSafetyClassificationsTable).where(eq(contentSafetyClassificationsTable.entityId, id));
    await pool.query('DELETE FROM users WHERE id=ANY($1::uuid[])', [[author.id, viewer.id]]);
  });
  const now = new Date().toISOString();
  const post = await posts.create({ id: randomUUID(), authorId: author.id, content: 'Reviewed child-safe copy', images: [],
    createdAt: now, updatedAt: now, likesCount: 0, commentsCount: 0, bookmarksCount: 0, shareCount: 0,
    audience: 'public', distributionMode: 'feed_and_profile', contentCategory: 'other', contentRating: 'child_safe' });
  ownedPostIds.push(post.id);
  const safety = new ContentSafetyService(users);
  assert.equal(await safety.isVisible(post, viewer.id, author.id), false,
    'an author supplied child-safe label is not proof of a safe classification');

  const record = post as unknown as Record<string, unknown>, contentHash = contentHashFor(record);
  await db.insert(contentSafetyClassificationsTable).values({ id: randomUUID(), entityType: 'posts', entityId: post.id,
    contentRevision: contentRevisionFor(record, contentHash), contentHash, classification: 'child_safe',
    issuer: 'fixture:reviewer', status: 'approved', policyVersion: CONTENT_CLASSIFICATION_POLICY_VERSION,
    approvedAt: new Date().toISOString() });
  assert.equal(await safety.isVisible(post, viewer.id, author.id), true);

  const updated = await posts.update(post.id, { content: 'Edited after the review' });
  assert.ok(updated);
  assert.notEqual(contentHashFor(updated as unknown as Record<string, unknown>), contentHash);
  assert.equal(await safety.isVisible(updated, viewer.id, author.id), false,
    'content edits invalidate the former child-safe decision');
  const [stored] = await db.select().from(contentSafetyClassificationsTable)
    .where(eq(contentSafetyClassificationsTable.entityId, post.id));
  assert.equal(stored?.status, 'superseded');
});
