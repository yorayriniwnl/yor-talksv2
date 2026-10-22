import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, test } from 'node:test';
import express from 'express';
import jwt from 'jsonwebtoken';
import { pool } from '@workspace/db';
import { ModerationService } from '../services/moderation-service.js';
import { ModerationWorkflowError } from '../services/moderation-decisions-service.js';
import { createModerationRouter } from '../routes/moderation.js';
import { allowTestContacts, createVerifiedAdultTestUser } from './test-helpers.js';
import { UserRepository } from '../repositories/user-repository.js';
import { RedisRepository } from '../repositories/redis-repository.js';
import { closeAuthenticationDependencies } from '../middlewares/auth.js';
import { env } from '../config/env.js';
import { EligibilityService } from '../services/eligibility-service.js';
import { ContentSafetyService } from '../services/content-safety-service.js';
import type { UserRecord } from '../types/index.js';
import { ConversationRepository, MessageRepository } from '../repositories/message-repository.js';
import { MessageService } from '../services/message-service.js';
import { MediaAuthorizationService, type MediaGrantContext } from '../services/media-authorization-service.js';
import type { MediaAssetRow } from '../services/media-service.js';
import { createTestApprovedMedia } from './media-fixtures.js';

const service = new ModerationService();
const redis = new RedisRepository();
const sessions: string[] = [], targetIds: string[] = [], reportIds: string[] = [];
const messageIds: string[] = [], mediaIds: string[] = [];
let author: UserRecord, staff: UserRecord, reviewer: UserRecord, outsider: UserRecord;
let server: ReturnType<ReturnType<typeof express>['listen']>;
let baseUrl: string;
const tokens = new Map<string, string>();
const rationale = 'The reviewed content violates the published community policy.';

before(async () => {
  [author, staff, reviewer, outsider] = await Promise.all((['user','moderator','moderator','user'] as const).map(role =>
    createVerifiedAdultTestUser(new UserRepository(), { role, settings: { theme: 'light', notificationsEnabled: true, privateAccount: false, contentFilter: 'regular' } })));
  for (const user of [author, staff, reviewer, outsider]) {
    const deviceId = randomUUID(), key = `session:${user.id}:${deviceId}`;
    await redis.setStrict(key, 'active', 600); sessions.push(key);
    tokens.set(user.id, jwt.sign({ sub: user.id, deviceId }, env.JWT_SECRET, { expiresIn: '10m' }));
  }
  const app = express(); app.use(express.json());
  app.use('/api/moderation', createModerationRouter(service));
  app.use('/api/v1/moderation', createModerationRouter(service));
  server = app.listen(0, '127.0.0.1'); await new Promise<void>(resolve => server.once('listening', resolve));
  const address = server.address(); assert.ok(address && typeof address !== 'string');
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  if (server) await new Promise<void>((resolve, reject) => server.close(e => e ? reject(e) : resolve()));
  await pool.query('DELETE FROM moderation_decisions WHERE target_id=ANY($1::text[])', [[...targetIds, ...messageIds, author?.id].filter(Boolean)]);
  await pool.query('DELETE FROM media_references WHERE media_id=ANY($1::uuid[])', [mediaIds]);
  await pool.query('DELETE FROM media_assets WHERE id=ANY($1::uuid[])', [mediaIds]);
  await pool.query('DELETE FROM reports WHERE id=ANY($1::uuid[])', [reportIds]);
  await pool.query('DELETE FROM posts WHERE id=ANY($1::uuid[])', [targetIds]);
  await pool.query('DELETE FROM users WHERE id=ANY($1::uuid[])', [[author,staff,reviewer,outsider].filter(Boolean).map(u => u.id)]);
  for (const key of sessions) await redis.del(key);
  await redis.disconnect(); await closeAuthenticationDependencies(); await pool.end();
});

async function post() {
  const id = randomUUID(); targetIds.push(id);
  const { rows } = await pool.query('INSERT INTO posts(id,author_id,content) VALUES($1,$2,$3) RETURNING *', [id,author.id,'Moderation fixture']);
  return { id, authorId: author.id, content: rows[0].content, distributionMode: 'feed', contentRating: 'regular', createdAt: new Date().toISOString() };
}
async function decision(action: 'remove' | 'restrict' | 'no_action' = 'remove', targetId?: string) {
  return service.recordDecision({ actorId: staff.id, targetType: 'post', targetId: targetId ?? (await post()).id,
    action, rationale, internalNotes: 'confidential investigation evidence' });
}
async function appeal(decisionId: string) { return service.submitAppeal({ decisionId, appellantUserId: author.id, statement: 'Please review the context of this content.' }); }
const errorStatus = (status: number) => (error: unknown) => error instanceof ModerationWorkflowError && error.status === status;
async function http(path: string, user?: UserRecord, method = 'GET', body?: object, mount = '/api') {
  const response = await fetch(`${baseUrl}${mount}/moderation${path}`, { method,
    headers: { ...(user ? { Authorization: `Bearer ${tokens.get(user.id)}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined });
  return { status: response.status, headers: response.headers, body: await response.json() as any };
}

test('HTTP accepts a valid decision-linked appeal at both mounts and exposes only owner-safe fields', async () => {
  for (const mount of ['/api', '/api/v1']) {
    const d = await decision();
    const response = await http('/appeals', author, 'POST', { decisionId: d.id, statement: 'Please review the context of this content.' }, mount);
    assert.equal(response.status, 201); assert.equal(response.body.data.decisionId, d.id);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.doesNotMatch(JSON.stringify(response.body), /reviewerNotes|reviewerId|internalNotes|confidential/);
    const owner = await http('/appeals/mine', author, 'GET', undefined, mount);
    assert.equal(owner.status, 200); assert.ok(owner.body.data.some((a: any) => a.id === response.body.data.id));
    const other = await http('/appeals/mine', outsider, 'GET', undefined, mount);
    assert.deepEqual(other.body.data, []);
  }
});

test('appeals require a private eligible notice and cannot forge author, reporter or affected-party authority', async () => {
  const d = await decision();
  for (const relationship of [undefined, 'author', 'reporter', 'affected_party'] as const) {
    await assert.rejects(service.submitAppeal({ decisionId: d.id, appellantUserId: outsider.id, statement: rationale, relationship }), errorStatus(404));
  }
  await assert.rejects(service.submitAppeal({ decisionId: d.id, appellantUserId: author.id, statement: rationale, relationship: 'reporter' }), errorStatus(403));
  const noAction = await decision('no_action');
  await assert.rejects(appeal(noAction.id), errorStatus(403));
  await pool.query('UPDATE moderation_decision_notices SET appeal_deadline=clock_timestamp() WHERE decision_id=$1', [d.id]);
  await assert.rejects(appeal(d.id), errorStatus(403));
});

test('concurrent duplicate appeals produce one durable record', async () => {
  const d = await decision();
  const results = await Promise.allSettled(Array.from({ length: 8 }, () => appeal(d.id)));
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  for (const result of results) if (result.status === 'rejected') assert.ok(errorStatus(409)(result.reason));
  assert.equal((await pool.query('SELECT count(*)::int AS n FROM moderation_appeals WHERE decision_id=$1', [d.id])).rows[0].n, 1);
});

test('first decisions serialize and every replaced enforcement has a supersession link', async () => {
  const p = await post();
  const recorded = await Promise.all(Array.from({ length: 5 }, () => decision('remove', p.id)));
  const history = await service.listDecisionsForTarget('post', p.id);
  assert.equal(history.length, 5);
  const active = await service.getEnforcement('post', p.id); assert.ok(active);
  assert.equal(history.filter(d => !d.supersededBy).length, 1);
  assert.equal(history.find(d => !d.supersededBy)?.id, active.activeDecisionId);
  assert.ok(recorded.some(d => d.id === active.activeDecisionId));
});

test('no-action decisions preserve the current restriction and do not supersede it', async () => {
  const d = await decision(); await decision('no_action', d.targetId);
  assert.equal((await service.getEnforcement('post', d.targetId))?.activeDecisionId, d.id);
  assert.equal((await service.listDecisionsForTarget('post', d.targetId)).find(row => row.id === d.id)?.supersededBy, null);
});

test('review requires independent staff and records a safe outcome without duplicate-notice errors', async () => {
  const d = await decision(), a = await appeal(d.id);
  const review = { outcome: 'upheld' as const, reviewerNotes: 'private investigation materials', rationale: 'The original decision is confirmed after reviewing the context.' };
  await assert.rejects(service.reviewAppeal(a.id, staff.id, review), errorStatus(403));
  await assert.rejects(service.reviewAppeal(a.id, outsider.id, review), errorStatus(403));
  const reviewed = await service.reviewAppeal(a.id, reviewer.id, review); assert.equal(reviewed.status, 'upheld');
  await assert.rejects(service.reviewAppeal(a.id, reviewer.id, review), errorStatus(409));
  await assert.rejects(appeal(d.id), errorStatus(409));
  const owned = (await service.listUserAppeals(author.id, 100)).find(row => row.id === a.id); assert.ok(owned);
  assert.equal(owned.rationale, review.rationale); assert.doesNotMatch(JSON.stringify(owned), /reviewerNotes|reviewerId|private investigation/);
  assert.equal((await service.listUserNotices(author.id, 100)).filter(n => n.decisionId === d.id).length, 1);
});

test('an old appeal cannot remove a newer restriction', async () => {
  const old = await decision(), a = await appeal(old.id), newer = await decision('restrict', old.targetId);
  await assert.rejects(service.reviewAppeal(a.id, reviewer.id, { outcome: 'reversed', reviewerNotes: rationale, rationale }), errorStatus(409));
  assert.equal((await service.getEnforcement('post', old.targetId))?.activeDecisionId, newer.id);
  assert.equal((await service.listAppeals()).find(row => row.id === a.id)?.status, 'pending');
});

test('removal and reversal change current content authority without a cache expiry', async () => {
  const p = await post(), safety = new ContentSafetyService();
  assert.equal(await safety.isVisible(p, outsider.id, author.id), true);
  const d = await decision('remove', p.id); assert.equal(await safety.isVisible(p, outsider.id, author.id), false);
  const a = await appeal(d.id);
  await service.reviewAppeal(a.id, reviewer.id, { outcome: 'reversed', reviewerNotes: 'Internal appeal assessment', rationale: 'The context establishes that the content is allowed.' });
  assert.equal(await service.getEnforcement('post', p.id), null);
  assert.equal(await safety.isVisible(p, outsider.id, author.id), true);
  assert.ok((await service.listDecisionsForTarget('post', p.id)).find(row => row.id === d.id)?.supersededBy);
});

test('decisions validate target and report association transactionally', async () => {
  await assert.rejects(decision('remove', randomUUID()), errorStatus(404));
  const p = await post(), other = await post(), reportId = randomUUID(); reportIds.push(reportId);
  await pool.query('INSERT INTO reports(id,reporter_id,entity_type,entity_id,reason) VALUES($1,$2,$3,$4,$5)', [reportId, outsider.id, 'post', other.id, 'spam']);
  await assert.rejects(service.recordDecision({ actorId: staff.id, targetType: 'post', targetId: p.id, action: 'remove', reportId, rationale }), errorStatus(400));
  assert.deepEqual(await service.listDecisionsForTarget('post', p.id), []);
});

test('reversal preserves author deletion and never recreates the content', async () => {
  const d = await decision(), a = await appeal(d.id);
  await pool.query('DELETE FROM posts WHERE id=$1', [d.targetId]);
  const reviewed = await service.reviewAppeal(a.id, reviewer.id, { outcome: 'reversed', reviewerNotes: rationale, rationale });
  assert.equal(reviewed.status, 'reversed');
  assert.equal(await service.getEnforcement('post', d.targetId), null);
  assert.equal((await pool.query('SELECT 1 FROM posts WHERE id=$1', [d.targetId])).rowCount, 0);
});

test('a verified reporter can appeal no-action and receive an explicit enforceable reversal', async () => {
  const p = await post(), reportId = randomUUID(); reportIds.push(reportId);
  await pool.query('INSERT INTO reports(id,reporter_id,entity_type,entity_id,reason) VALUES($1,$2,$3,$4,$5)', [reportId, outsider.id, 'post', p.id, 'spam']);
  const d = await service.recordDecision({ actorId: staff.id, targetType: 'post', targetId: p.id, action: 'no_action', reportId, rationale });
  const a = await service.submitAppeal({ decisionId: d.id, appellantUserId: outsider.id, statement: rationale });
  assert.equal(a.relationship, 'reporter');
  const review = { outcome: 'reversed' as const, action: 'remove' as const, reviewerNotes: 'Internal reporter evidence', rationale };
  const reviewed = await service.reviewAppeal(a.id, reviewer.id, review);
  assert.equal((await service.getEnforcement('post', p.id))?.activeDecisionId, reviewed.outcomeDecisionId);
  const reporterNotices = await service.listUserNotices(outsider.id, 100);
  assert.ok(reporterNotices.some(row => row.decisionId === reviewed.outcomeDecisionId));
  assert.doesNotMatch(JSON.stringify(reporterNotices), /Internal reporter evidence|confidential/);
});

test('HTTP denies unauthenticated and ordinary staff access, malformed IDs and unbounded queues', async () => {
  assert.equal((await http('/notices')).status, 401);
  assert.equal((await http('/appeals', outsider)).status, 403);
  assert.equal((await http('/decisions', outsider, 'POST', {})).status, 403);
  for (const path of ['/appeals?limit=-1','/appeals?limit=100000','/appeals?status=unknown','/decisions?targetType=sql&targetId=x','/enforcements/post/not-a-uuid']) {
    const response = await http(path, staff); assert.equal(response.status, 400, path); assert.equal(response.headers.get('cache-control'), 'no-store');
  }
  assert.equal((await http('/appeals', author, 'POST', { statement: rationale })).status, 400);
  // The restricted-rights allowlist rejects malformed identifiers before validation.
  assert.equal((await http('/notices/not-a-uuid/acknowledge', author, 'POST')).status, 403);
});

test('notice acknowledgement is private and idempotent', async () => {
  const d = await decision(), notice = (await service.listUserNotices(author.id, 100)).find(n => n.decisionId === d.id); assert.ok(notice);
  assert.equal((await http(`/notices/${notice.id}/acknowledge`, outsider, 'POST')).status, 404);
  assert.equal(await service.acknowledgeNotice(notice.id, author.id), true);
  const first = (await service.listUserNotices(author.id, 100)).find(n => n.id === notice.id)?.acknowledgedAt;
  assert.equal(await service.acknowledgeNotice(notice.id, author.id), true);
  assert.equal((await service.listUserNotices(author.id, 100)).find(n => n.id === notice.id)?.acknowledgedAt, first);
});

test('account sanctions disable current capabilities while preserving private appeal access', async () => {
  const eligibility = new EligibilityService(); assert.equal((await eligibility.decisionFor(author.id)).activated, true);
  const d = await service.recordDecision({ actorId: staff.id, targetType: 'user', targetId: author.id, action: 'restrict', rationale });
  try {
    assert.equal((await eligibility.decisionFor(author.id)).activated, false);
    for (const mount of ['/api','/api/v1']) {
      assert.equal((await http('/notices', author, 'GET', undefined, mount)).status, 200);
      assert.equal((await http('/appeals/mine', author, 'GET', undefined, mount)).status, 200);
      assert.equal((await http('/decisions?targetType=user&targetId='+author.id, author, 'GET', undefined, mount)).status, 403);
    }
    assert.equal((await http('/appeals', author, 'POST', { decisionId: d.id, statement: rationale })).status, 201);
  } finally { await service.recordDecision({ actorId: staff.id, targetType: 'user', targetId: author.id, action: 'restore', rationale }); }
  assert.equal((await eligibility.decisionFor(author.id)).activated, true);
});

test('unexpected failures return a static private response without SQL or provider evidence', async t => {
  t.mock.method(service, 'listUserNotices', async () => { throw new Error('secret SQL identity and internal evidence'); });
  const response = await http('/notices', author);
  assert.equal(response.status, 503); assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.doesNotMatch(JSON.stringify(response.body), /SQL|identity|evidence|secret/);
});

test('message enforcement covers history, previews, retries, reactions, media grants and realtime delivery', async () => {
  const conversations = new ConversationRepository(), messages = new MessageRepository();
  const messaging = new MessageService(conversations, messages, undefined, undefined, undefined, allowTestContacts);
  const conversation = await conversations.findOrCreateDirect(author.id, outsider.id);
  const asset = await createTestApprovedMedia(author.id, 'message'); mediaIds.push(asset.id);
  const message = await messages.create({ id: randomUUID(), conversationId: conversation.id, senderId: author.id, recipientId: outsider.id,
    content: 'Sensitive removed message', mediaId: asset.id, createdAt: new Date().toISOString(), seenAt: null }); messageIds.push(message.id);
  await pool.query("INSERT INTO media_references(media_id,entity_type,entity_id,slot) VALUES($1,'messages',$2,'attachment')", [asset.id,message.id]);
  const requesterToken = jwt.decode(tokens.get(outsider.id)!) as { deviceId: string };
  const requester = { userId: outsider.id, deviceId: requesterToken.deviceId, authVersion: 0 };
  const revision = (await new EligibilityService().decisionFor(outsider.id)).revision;
  const context: MediaGrantContext = { v: 2, assetId: asset.id, entityType: 'messages', entityId: message.id, slot: 'attachment', variant: 'original',
    ownerPreview: false, viewer: { kind: 'user', ...requester, eligibilityRevision: revision }, policyRevision: revision, exp: Math.floor(Date.now()/1000)+60 };
  const authority = new MediaAuthorizationService(undefined, undefined, undefined, redis, conversations, allowTestContacts);
  const rawAsset = (await pool.query('SELECT * FROM media_assets WHERE id=$1', [asset.id])).rows[0] as MediaAssetRow;
  await authority.authorize(context, rawAsset, requester);
  await messaging.authorizeConversationDelivery(conversation.id, outsider.id, message.id);
  await service.recordDecision({ actorId: staff.id, targetType: 'message', targetId: message.id, action: 'remove', rationale });
  assert.equal(await messages.findVisibleById(message.id), undefined);
  assert.deepEqual(await messaging.listConversation(conversation.id, outsider.id), []);
  assert.equal(await messaging.previewMessage(message.id, outsider.id), undefined);
  assert.equal(await messaging.editMessage(message.id, author.id, 'Editing cannot bypass moderation'), undefined);
  const retried = await messaging.sendMessageToConversation(author.id, conversation.id, message.content, { idempotencyKey: message.id });
  assert.equal(retried.content, ''); assert.equal(retried.mediaId, null);
  await assert.rejects(messaging.addReaction(message.id, outsider.id, 'heart'));
  await assert.rejects(messaging.authorizeConversationDelivery(conversation.id, outsider.id, message.id));
  await assert.rejects(authority.authorize(context, rawAsset, requester));
  await service.recordDecision({ actorId: staff.id, targetType: 'message', targetId: message.id, action: 'restore', rationale });
  assert.equal((await messages.findVisibleById(message.id))?.content, message.content);
  await authority.authorize(context, rawAsset, requester);
});
