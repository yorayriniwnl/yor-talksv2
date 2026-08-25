import { eq, desc, ilike, lt, and } from "drizzle-orm";
import { postsTable, postLikesTable, postBookmarksTable } from "@workspace/db/schema";
import { db } from "@workspace/db";
import type { PostRecord } from "../types/index.js";

import { sql } from "drizzle-orm";
export class PostRepository {

  async likePost(postId: string, userId: string): Promise<void> {
    const existing = await db.select().from(postLikesTable).where(and(eq(postLikesTable.postId, postId), eq(postLikesTable.userId, userId)));
    if (existing.length === 0) {
      await db.insert(postLikesTable).values({ postId, userId });
      await db.execute(sql`
        UPDATE posts
        SET likes_count = likes_count + 1,
            score = ((likes_count + 1) * 2) + (comments_count * 3) + (share_count * 5),
            updated_at = NOW()
        WHERE id = ${postId}
      `);
    }
  }

  async unlikePost(postId: string, userId: string): Promise<void> {
    const deleted = await db.delete(postLikesTable).where(and(eq(postLikesTable.postId, postId), eq(postLikesTable.userId, userId))).returning();
    if (deleted.length > 0) {
      await db.execute(sql`
        UPDATE posts
        SET likes_count = GREATEST(0, likes_count - 1),
            score = (GREATEST(0, likes_count - 1) * 2) + (comments_count * 3) + (share_count * 5),
            updated_at = NOW()
        WHERE id = ${postId}
      `);
    }
  }

  async bookmarkPost(postId: string, userId: string): Promise<void> {
    const existing = await db.select().from(postBookmarksTable).where(and(eq(postBookmarksTable.postId, postId), eq(postBookmarksTable.userId, userId)));
    if (existing.length === 0) {
      await db.insert(postBookmarksTable).values({ postId, userId });
      await db.execute(sql`UPDATE posts SET bookmarks_count = bookmarks_count + 1 WHERE id = ${postId}`);
    }
  }

  async removeBookmark(postId: string, userId: string): Promise<void> {
    const deleted = await db.delete(postBookmarksTable).where(and(eq(postBookmarksTable.postId, postId), eq(postBookmarksTable.userId, userId))).returning();
    if (deleted.length > 0) {
      await db.execute(sql`UPDATE posts SET bookmarks_count = GREATEST(0, bookmarks_count - 1) WHERE id = ${postId}`);
    }
  }

  async toggleBookmark(postId: string, userId: string): Promise<boolean> {
    const existing = await db
      .select()
      .from(postBookmarksTable)
      .where(and(eq(postBookmarksTable.postId, postId), eq(postBookmarksTable.userId, userId)));
    if (existing.length > 0) {
      await this.removeBookmark(postId, userId);
      return false;
    }
    await this.bookmarkPost(postId, userId);
    return true;
  }

  async create(post: PostRecord): Promise<PostRecord> {
    const { likedBy: _likedBy, bookmarkedBy: _bookmarkedBy, comments: _comments, ...persistedPost } = post;
    const [created] = await db.insert(postsTable).values(persistedPost).returning();
    return created as PostRecord;
  }

  async findById(id: string): Promise<PostRecord | undefined> {
    const [post] = await db.select().from(postsTable).where(eq(postsTable.id, id));
    return post as PostRecord | undefined;
  }

  async listByUser(userId: string, cursor?: string, limit: number = 20): Promise<PostRecord[]> {
    const filters = [eq(postsTable.authorId, userId)];
    if (cursor) filters.push(lt(postsTable.createdAt, cursor));
    return (await db.select().from(postsTable).where(and(...filters)).orderBy(desc(postsTable.createdAt)).limit(limit)) as PostRecord[];
  }

  async list(cursor?: string, limit: number = 20): Promise<PostRecord[]> {
    const filters: any[] = [];
    if (cursor) filters.push(lt(postsTable.createdAt, cursor));
    let q = db.select().from(postsTable).$dynamic();
    if (filters.length > 0) q = q.where(and(...filters));
    return (await q.orderBy(desc(postsTable.createdAt)).limit(limit)) as PostRecord[];
  }

  async listTrending(cursor?: number, limit: number = 20): Promise<PostRecord[]> {
    const filters: any[] = [];
    if (cursor) filters.push(lt(postsTable.score, cursor));
    let q = db.select().from(postsTable).$dynamic();
    if (filters.length > 0) q = q.where(and(...filters));
    return (await q.orderBy(desc(postsTable.score), desc(postsTable.createdAt)).limit(limit)) as PostRecord[];
  }

  /** DB-level content search, so this doesn't pull the whole table into memory to filter in JS. */
  async search(query: string): Promise<PostRecord[]> {
    return (await db
      .select()
      .from(postsTable)
      .where(ilike(postsTable.content, `%${query}%`))
      .orderBy(desc(postsTable.createdAt))) as PostRecord[];
  }

  async update(id: string, updates: Partial<PostRecord>): Promise<PostRecord | undefined> {
    const { likedBy: _likedBy, bookmarkedBy: _bookmarkedBy, comments: _comments, ...persistedUpdates } = updates;
    const [updated] = await db.update(postsTable)
      .set({ ...persistedUpdates, updatedAt: new Date().toISOString() })
      .where(eq(postsTable.id, id))
      .returning();
    return updated as PostRecord | undefined;
  }

  async delete(id: string): Promise<boolean> {
    const [deleted] = await db.delete(postsTable).where(eq(postsTable.id, id)).returning({ id: postsTable.id });
    return !!deleted;
  }
}
