import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, test } from 'node:test';
import { pool } from '@workspace/db';
import { PostRepository } from '../repositories/post-repository.js';
import { VideoRepository } from '../repositories/video-repository.js';
import { VideoBookmarkRepository } from '../repositories/video-bookmark-repository.js';
import { UserRepository } from '../repositories/user-repository.js';
import { PostService } from '../services/post-service.js';
import { VideoService } from '../services/video-service.js';
import { ContactShieldService } from '../services/contact-shield-service.js';
import { InvalidCollectionCursorError, savedCollectionQuerySchema } from '../utils/saved-collection-page.js';
import { createTestUser } from './test-helpers.js';
import { getContactIdentifierDigest } from '../utils/contact-shield.js';

after(() => pool.end());
const visiblePolicy = {
  getViewerFilter: async () => 'regular',
  filterVisibleByAuthor: async (items: Array<{ id: string; content?: string; title?: string }>) =>
    items.filter(item => (item.content ?? item.title ?? '').startsWith('visible')),
};
function postService() {
  return new PostService(new PostRepository(), {} as any, {} as any, undefined, {} as any, {} as any,
    { getShieldedUserIds: async () => new Set<string>() } as any, visiblePolicy as any, {} as any);
}

test('saved posts remain reachable beyond an empty bounded scan and timestamp ties without dropping visible rows', async () => {
  const user = await createTestUser(new UserRepository());
  const service = postService();
  const ids = Array.from({ length: 555 }, () => randomUUID()).sort();
  try {
    await pool.query(`INSERT INTO posts(id,author_id,content)
      SELECT id,$2,CASE WHEN ordinal<=5 THEN 'visible bookmark' ELSE 'hidden bookmark' END
      FROM unnest($1::uuid[]) WITH ORDINALITY AS fixture(id,ordinal)`, [ids, user.id]);
    await pool.query(`INSERT INTO post_bookmarks(post_id,user_id,created_at)
      SELECT id,$2,'2026-01-01 00:00:00.123456'::timestamp FROM unnest($1::uuid[]) AS id`, [ids, user.id]);
    const first = await service.getSavedPostsPage(user.id, 3);
    assert.deepEqual(first.data, []);
    assert.equal(first.meta.hasMore, true);
    assert.ok(first.meta.nextCursor);
    const payload = JSON.parse(Buffer.from(first.meta.nextCursor.split('.')[0], 'base64url').toString());
    assert.match(payload.createdAt, /\.123456$/);
    const second = await service.getSavedPostsPage(user.id, 3, first.meta.nextCursor);
    assert.deepEqual(second.data.map(item => item.id), ids.slice(2, 5).reverse());
    assert.equal(second.meta.hasMore, true);
    const third = await service.getSavedPostsPage(user.id, 3, second.meta.nextCursor!);
    assert.deepEqual(third.data.map(item => item.id), ids.slice(0, 2).reverse());
    assert.equal(third.meta.hasMore, false);
    assert.equal(third.meta.nextCursor, null);
  } finally {
    service.close();
    await pool.query('DELETE FROM users WHERE id=$1', [user.id]);
  }
});

test('saved video pages are bounded, preserve all bookmarks and reject changed cursor ownership, collection or signature', async t => {
  const user = await createTestUser(new UserRepository());
  const other = await createTestUser(new UserRepository());
  const bookmarks = new VideoBookmarkRepository();
  t.mock.method(bookmarks, 'listForUser', async () => { throw new Error('Paging must not load every bookmark ID'); });
  const service = new VideoService(new VideoRepository(), undefined, bookmarks, visiblePolicy as any);
  const ids = Array.from({ length: 205 }, () => randomUUID()).sort().reverse();
  const posts = postService();
  try {
    await pool.query(`INSERT INTO videos(id,author_id,title,video_url,thumbnail_url,type)
      SELECT id,$2,'visible saved video','https://example.test/fixture.mp4','https://example.test/fixture.jpg','short'
      FROM unnest($1::uuid[]) AS id`, [ids, user.id]);
    await pool.query(`INSERT INTO video_bookmarks(video_id,user_id,created_at)
      SELECT id,$2,'2026-01-01 00:00:00.123456'::timestamp FROM unnest($1::uuid[]) AS id`, [ids, user.id]);
    const seen: string[] = [];
    let cursor: string | undefined;
    let firstCursor = '';
    do {
      const page = await service.listBookmarkedVideosPage(user.id, 50, cursor);
      assert.ok(page.data.length <= 50);
      assert.ok(page.data.every(item => item.savedByMe));
      seen.push(...page.data.map(item => item.id));
      cursor = page.meta.nextCursor ?? undefined;
      if (!firstCursor && cursor) firstCursor = cursor;
      assert.ok(seen.length <= ids.length, 'Cursor must advance rather than repeat pages');
    } while (cursor);
    assert.deepEqual(seen, ids);
    await assert.rejects(service.listBookmarkedVideosPage(other.id, 50, firstCursor), InvalidCollectionCursorError);
    await assert.rejects(posts.getSavedPostsPage(user.id, 50, firstCursor), InvalidCollectionCursorError);
    const [payload, signature] = firstCursor.split('.');
    const tampered = `${payload}.${signature[0] === 'A' ? 'B' : 'A'}${signature.slice(1)}`;
    await assert.rejects(service.listBookmarkedVideosPage(user.id, 50, tampered), InvalidCollectionCursorError);
  } finally {
    posts.close();
    await pool.query('DELETE FROM users WHERE id=ANY($1::uuid[])', [[user.id, other.id]]);
  }
});

test('saved collection query validation rejects invalid page sizes and malformed cursors', () => {
  for (const query of [{ limit: '0' }, { limit: '101' }, { limit: '1.5' }, { limit: ['10'] }, { cursor: 'not-signed' }, { unknown: 'value' }]) {
    assert.equal(savedCollectionQuerySchema.safeParse(query).success, false);
  }
  assert.equal(savedCollectionQuerySchema.safeParse({ limit: '100' }).success, true);
});

test('saved, listed and direct video reads and likes respect either party shielding a contact', async () => {
  const repository = new UserRepository();
  const author = await createTestUser(repository);
  const viewer = await createTestUser(repository);
  // Production registration and the legacy migration persist this lookup key.
  await pool.query('UPDATE users SET contact_identity_digest=$2 WHERE id=$1', [author.id, getContactIdentifierDigest('email', author.email)]);
  await pool.query('UPDATE users SET contact_identity_digest=$2 WHERE id=$1', [viewer.id, getContactIdentifierDigest('email', viewer.email)]);
  const videoId = randomUUID();
  const shields = new ContactShieldService();
  const videos = new VideoService(new VideoRepository());
  try {
    await pool.query("INSERT INTO videos(id,author_id,title,video_url,thumbnail_url,type) VALUES($1,$2,'Contact policy fixture','https://example.test/fixture.mp4','https://example.test/fixture.jpg','short')", [videoId, author.id]);
    await pool.query('INSERT INTO video_bookmarks(video_id,user_id) VALUES($1,$2)', [videoId, viewer.id]);
    assert.ok(await videos.getVideo(videoId, viewer.id, false));
    assert.ok((await videos.listBookmarkedVideosPage(viewer.id)).data.some(video => video.id === videoId));
    const added = await shields.add(viewer.id, [{ type: 'email', value: author.email }]);
    const assertDenied = async () => {
      assert.equal(await videos.getVideo(videoId, viewer.id, false), undefined);
      assert.equal(await videos.toggleLike(videoId, viewer.id), undefined);
      assert.equal((await videos.listVideos(viewer.id)).some(video => video.id === videoId), false);
      assert.equal((await videos.listBookmarkedVideosPage(viewer.id)).data.some(video => video.id === videoId), false);
      assert.deepEqual((await pool.query('SELECT liked_by FROM videos WHERE id=$1', [videoId])).rows[0].liked_by, []);
    };
    await assertDenied();
    await shields.remove(viewer.id, added[0].id);
    await shields.add(author.id, [{ type: 'email', value: viewer.email }]);
    await assertDenied();
  } finally {
    await pool.query('DELETE FROM users WHERE id=ANY($1::uuid[])', [[author.id, viewer.id]]);
  }
});
