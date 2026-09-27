import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, test } from 'node:test';
import { pool } from '@workspace/db';
import { UserRepository } from '../repositories/user-repository.js';
import { PostRepository, encodePostCursor } from '../repositories/post-repository.js';
import { NotificationRepository } from '../repositories/notification-repository.js';
import { RedisRepository } from '../repositories/redis-repository.js';
import { SearchService } from '../services/search-service.js';
import { SearchController } from '../controllers/search-controller.js';
import { CacheService } from '../services/cache-service.js';
import { PostService } from '../services/post-service.js';
import { ContentSafetyService } from '../services/content-safety-service.js';
import { createTestUser } from './test-helpers.js';
import type { PostRecord } from '../types/index.js';

after(() => pool.end());
const users = new UserRepository();
async function post(repository: PostRepository, authorId: string, content: string, audience: PostRecord['audience'] = 'public', distributionMode: PostRecord['distributionMode'] = 'feed_and_profile') {
  return repository.create({ id: randomUUID(), authorId, content, audience, distributionMode, contentRating: 'regular',
    images: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), likesCount: 0,
    commentsCount: 0, bookmarksCount: 0, shareCount: 0, score: 100000 });
}

for (const mode of ['auto', 'fallback'] as const) {
  test(`SQL ${mode} search enforces audience, account status, privacy, blocks and profile distribution`, async () => {
    const posts = new PostRepository(mode);
    const author = await createTestUser(users);
    const viewer = await createTestUser(users);
    const marker = randomUUID();
    const publicPost = await post(posts, author.id, marker);
    const followers = await post(posts, author.id, marker, 'followers');
    const close = await post(posts, author.id, marker, 'close_friends');
    const profile = await post(posts, author.id, marker, 'public', 'profile_only');
    const service = new SearchService(users, posts);
    const ids = async () => (await service.search(marker, viewer.id)).posts.map(item => item.id).sort();
    assert.deepEqual(await ids(), [publicPost.id]);
    await users.followUser(viewer.id, author.id);
    assert.deepEqual(await ids(), [publicPost.id, followers.id].sort());
    await users.addCloseFriend(author.id, viewer.id);
    assert.deepEqual(await ids(), [publicPost.id, followers.id, close.id].sort());
    assert.equal((await service.search(marker, author.id)).posts.some(item => item.id === profile.id), false);
    await users.update(author.id, { blockedUsers: [viewer.id] });
    assert.deepEqual(await ids(), []);
    await users.update(author.id, { blockedUsers: [], privacy: { profileVisibility: 'private', messageRequests: true, allowDmFromStrangers: true } });
    await users.unfollowUser(viewer.id, author.id);
    assert.deepEqual(await ids(), []);
    await users.followUser(viewer.id, author.id);
    await users.update(author.id, { accountStatus: 'suspended' });
    assert.deepEqual(await ids(), []);
  });
}

test('warm search and trending caches cannot restore edited, restricted or deleted records', async (t) => {
  const posts = new PostRepository();
  const author = await createTestUser(users);
  const viewer = await createTestUser(users);
  const marker = randomUUID();
  const item = await post(posts, author.id, marker);
  const redis = new RedisRepository();
  const cache = new CacheService(redis);
  const controller = new SearchController(new SearchService(users, posts), cache);
  const feed = new PostService(posts, users, new NotificationRepository());
  t.after(async () => { feed.close(); await redis.disconnect(); });
  const search = async () => {
    let response: any;
    const res = { status: () => res, setHeader: () => res, json: (value: unknown) => { response = value; } };
    await controller.search({ query: { q: marker }, user: { id: viewer.id } } as never, res as never);
    assert.equal(response.success, true);
    return response.data.posts as PostRecord[];
  };
  assert.equal((await search()).length, 1);
  assert.ok((await feed.getTrendingFeed(undefined, 100, viewer.id)).some(row => row.id === item.id));
  await posts.update(item.id, { content: 'edited private text', audience: 'followers' });
  assert.equal((await search()).length, 0);
  assert.ok(!(await feed.getTrendingFeed(undefined, 100, viewer.id)).some(row => row.id === item.id));
  assert.equal(await feed.getPost(item.id, viewer.id), undefined);
  await users.followUser(viewer.id, author.id);
  assert.equal((await feed.getPost(item.id, viewer.id))?.content, 'edited private text');
  await users.update(viewer.id, { blockedUsers: [author.id] });
  assert.equal(await feed.getPost(item.id, viewer.id), undefined);
  await users.update(viewer.id, { blockedUsers: [] });
  await posts.delete(item.id);
  assert.ok(!(await feed.getTrendingFeed(undefined, 100, viewer.id)).some(row => row.id === item.id));
});

test('visibility uses two SQL queries for fifty candidates and preserves keyset pagination after filtering', async (t) => {
  const author = await createTestUser(users);
  const viewer = await createTestUser(users);
  const posts = new PostRepository();
  const fixture = await post(posts, author.id, randomUUID());
  const service = new ContentSafetyService(users);
  const original = pool.query.bind(pool);
  let queries = 0;
  const spy = t.mock.method(pool, 'query', ((...args: any[]) => { queries++; return (original as any)(...args); }) as any);
  const started = performance.now();
  assert.equal((await service.filterVisibleByAuthor(Array(50).fill(fixture), viewer.id, row => row.authorId)).length, 50);
  assert.equal(queries, 2);
  t.diagnostic(`50 candidates: ${queries} SQL queries, ${(performance.now() - started).toFixed(1)} ms`);
  spy.mock.restore();
  const feed = new PostService(posts, users, new NotificationRepository());
  t.after(() => feed.close());
  await post(posts, author.id, 'excluded follower post', 'followers');
  const second = await post(posts, author.id, 'next visible');
  const firstPage = await feed.getUserFeed(author.id, undefined, 1, viewer.id);
  assert.equal(firstPage[0].id, second.id);
  const secondPage = await feed.getUserFeed(author.id, encodePostCursor(firstPage[0]), 1, viewer.id);
  assert.equal(secondPage[0].id, fixture.id);
});
