import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, test } from 'node:test';
import { eq } from 'drizzle-orm';
import { contentSafetyClassificationsTable, db, pool } from '@workspace/db';
import { commentsTable } from '@workspace/db/schema';
import { env } from '../config/env.js';
import type { EligibilityDecision } from '../eligibility/types.js';
import { CONTENT_CLASSIFICATION_POLICY_VERSION, contentHashFor, contentRevisionFor } from '../eligibility/content-policy.js';
import { UserRepository } from '../repositories/user-repository.js';
import { PostRepository } from '../repositories/post-repository.js';
import { PostService } from '../services/post-service.js';
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
  t.mock.method(EligibilityService.prototype, 'decisionFor', async () => decision);
  const users = new UserRepository(), posts = new PostRepository();
  const author = await createTestUser(users), viewer = await createTestUser(users);
  const ownedContentIds: string[] = [];
  t.after(async () => {
    for (const id of ownedContentIds) await db.delete(contentSafetyClassificationsTable).where(eq(contentSafetyClassificationsTable.entityId, id));
    await pool.query('DELETE FROM users WHERE id=ANY($1::uuid[])', [[author.id, viewer.id]]);
  });
  const now = new Date().toISOString();
  const post = await posts.create({ id: randomUUID(), authorId: author.id, content: 'Reviewed child-safe copy', images: [],
    createdAt: now, updatedAt: now, likesCount: 0, commentsCount: 0, bookmarksCount: 0, shareCount: 0,
    audience: 'public', distributionMode: 'feed_and_profile', contentCategory: 'other', contentRating: 'child_safe' });
  ownedContentIds.push(post.id);
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

test('child-safe post views hide unclassified comments and their aggregate count', async t => {
  const originalNodeEnv = env.NODE_ENV;
  env.NODE_ENV = 'production';
  t.after(() => { env.NODE_ENV = originalNodeEnv; });
  const child: EligibilityDecision = {
    experience: 'under_13', activated: true,
    capabilities: { social: true, publish: false, messaging: true, payments: false, seller: false,
      memberships: false, live: false, rtc: false, ai: false, analytics: false, profiling: false },
    maximumContentRating: 'child_safe', policyVersions: ['fixture:1'], revision: 'comment-fixture', reason: null,
    publicBrowsingAllowed: true,
  };
  t.mock.method(EligibilityService.prototype, 'decisionFor', async () => child);
  const users = new UserRepository(), posts = new PostRepository();
  const author = await createTestUser(users), viewer = await createTestUser(users), commenter = await createTestUser(users);
  const ownedContentIds: string[] = [];
  t.after(async () => {
    for (const id of ownedContentIds) await db.delete(contentSafetyClassificationsTable).where(eq(contentSafetyClassificationsTable.entityId, id));
    await pool.query('DELETE FROM users WHERE id=ANY($1::uuid[])', [[author.id, viewer.id, commenter.id]]);
  });
  const post = await posts.create({ id: randomUUID(), authorId: author.id, content: 'Approved child-safe post', images: [],
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), likesCount: 0, commentsCount: 1,
    bookmarksCount: 0, shareCount: 0, audience: 'public', distributionMode: 'feed_and_profile',
    contentCategory: 'other', contentRating: 'child_safe' });
  ownedContentIds.push(post.id);
  const postRecord = post as unknown as Record<string, unknown>, contentHash = contentHashFor(postRecord);
  await db.insert(contentSafetyClassificationsTable).values({ id: randomUUID(), entityType: 'posts', entityId: post.id,
    contentRevision: contentRevisionFor(postRecord, contentHash), contentHash, classification: 'child_safe',
    issuer: 'fixture:reviewer', status: 'approved', policyVersion: CONTENT_CLASSIFICATION_POLICY_VERSION,
    approvedAt: new Date().toISOString() });
  const safeCommentCreatedAt = new Date().toISOString();
  const [safeComment] = await db.insert(commentsTable).values({ id: randomUUID(), postId: post.id, authorId: commenter.id,
    content: 'Approved child-safe comment', contentRating: 'child_safe', createdAt: safeCommentCreatedAt,
    updatedAt: safeCommentCreatedAt }).returning();
  const safeCommentRecord = safeComment as unknown as Record<string, unknown>;
  const safeCommentHash = contentHashFor(safeCommentRecord);
  await db.insert(contentSafetyClassificationsTable).values({ id: randomUUID(), entityType: 'comments', entityId: safeComment.id,
    contentRevision: contentRevisionFor(safeCommentRecord, safeCommentHash), contentHash: safeCommentHash,
    classification: 'child_safe', issuer: 'fixture:reviewer', status: 'approved',
    policyVersion: CONTENT_CLASSIFICATION_POLICY_VERSION, approvedAt: new Date().toISOString() });
  ownedContentIds.push(safeComment.id);
  await db.insert(commentsTable).values({ id: randomUUID(), postId: post.id, authorId: author.id, parentId: safeComment.id,
    content: 'Unclassified reply', createdAt: new Date().toISOString() });
  await db.update(commentsTable).set({ repliesCount: 1 }).where(eq(commentsTable.id, safeComment.id));
  const [unclassifiedComment] = await db.insert(commentsTable).values({ id: randomUUID(), postId: post.id, authorId: commenter.id,
    content: 'Unclassified comment', createdAt: new Date().toISOString() }).returning();

  const service = Object.assign(Object.create(PostService.prototype), {
    postRepository: posts,
    userRepository: users,
    contactShieldService: { getShieldedUserIds: async () => new Set<string>(), canView: async () => true },
    contentSafetyService: new ContentSafetyService(users),
  }) as PostService;
  const visiblePost = await service.getPost(post.id, viewer.id);
  assert.equal(visiblePost?.commentsCount, 0, 'a child-safe view must not expose the raw all-audience comment count');
  const visibleComments = await service.listComments(post.id, viewer.id);
  assert.equal(visibleComments.length, 1, 'unclassified comments must not bypass the post ceiling');
  assert.equal(visibleComments[0]?.replies?.length, 0, 'an unclassified reply must not bypass the comment ceiling');
  assert.equal(visibleComments[0]?.repliesCount, 0, 'a hidden reply count must not leak through the public comment DTO');
  assert.equal(await service.toggleCommentLike(post.id, unclassifiedComment.id, viewer.id), undefined,
    'a like response must not return an unclassified comment hidden from the viewer');
});
