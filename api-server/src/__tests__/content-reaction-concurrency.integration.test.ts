import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, test } from 'node:test';
import { pool } from '@workspace/db';
import { VideoRepository } from '../repositories/video-repository.js';
import { VideoCommentRepository } from '../repositories/video-comment-repository.js';
import { UserRepository } from '../repositories/user-repository.js';
import { PostService } from '../services/post-service.js';
import { createTestUser } from './test-helpers.js';

after(() => pool.end());

test('video and comment likes append typed actors, preserve concurrent likes and toggle only the current actor', async t => {
  const users = await Promise.all(Array.from({ length: 3 }, () => createTestUser(new UserRepository())));
  const actorIds = users.map(user => user.id);
  const videoId = randomUUID();
  const videoCommentId = randomUUID();
  const postId = randomUUID();
  const commentId = randomUUID();
  const postService = new PostService(
    {} as any, {} as any, {} as any, undefined, {} as any, {} as any,
    { canView: async () => true } as any,
    { isVisible: async () => true } as any,
    {} as any,
  );
  t.mock.method(postService, 'getPost', async () => ({ id: postId } as any));
  try {
    await pool.query("INSERT INTO videos(id,author_id,title,video_url,thumbnail_url,type) VALUES($1,$2,'Reaction fixture','https://example.test/fixture.mp4','https://example.test/fixture.jpg','short')", [videoId, actorIds[0]]);
    await pool.query("INSERT INTO video_comments(id,video_id,author_id,content) VALUES($1,$2,$3,'Reaction fixture')", [videoCommentId, videoId, actorIds[0]]);
    await pool.query("INSERT INTO posts(id,author_id,content) VALUES($1,$2,'Reaction fixture')", [postId, actorIds[0]]);
    await pool.query("INSERT INTO comments(id,post_id,author_id,content) VALUES($1,$2,$3,'Reaction fixture')", [commentId, postId, actorIds[0]]);
    const videos = new VideoRepository();
    const videoComments = new VideoCommentRepository();
    for (const fixture of [
      { table: 'videos', id: videoId, toggle: (actor: string) => videos.toggleLike(videoId, actor) },
      { table: 'video_comments', id: videoCommentId, toggle: (actor: string) => videoComments.toggleLike(videoId, videoCommentId, actor) },
      { table: 'comments', id: commentId, toggle: (actor: string) => postService.toggleCommentLike(postId, commentId, actor) },
    ]) {
      await t.test(fixture.table, async () => {
        const readActors = async () => {
          // Table names are fixed test fixtures, never request input.
          const result = await pool.query<{ liked_by: string[] }>(`SELECT liked_by FROM ${fixture.table} WHERE id=$1`, [fixture.id]);
          return result.rows[0].liked_by.sort();
        };
        assert.ok(await fixture.toggle(actorIds[0]));
        assert.deepEqual(await readActors(), [actorIds[0]]);
        await Promise.all([fixture.toggle(actorIds[1]), fixture.toggle(actorIds[2])]);
        assert.deepEqual(await readActors(), [...actorIds].sort());
        assert.ok(await fixture.toggle(actorIds[0]));
        assert.deepEqual(await readActors(), actorIds.slice(1).sort());
      });
    }
  } finally {
    postService.close();
    await pool.query('DELETE FROM users WHERE id=ANY($1::uuid[])', [actorIds]);
  }
});
