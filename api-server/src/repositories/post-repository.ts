import { randomUUID } from "node:crypto";
import { eq, desc, ilike, lt, and, notInArray, inArray, or } from "drizzle-orm";
import {
  postsTable,
  postLikesTable,
  postBookmarksTable,
  postRepostsTable,
  postPollsTable,
  postPollOptionsTable,
  postPollVotesTable,
} from "@workspace/db/schema";
import { db, pool } from "@workspace/db";
import type { PostRecord } from "../types/index.js";

import { sql } from "drizzle-orm";
import type { ContentRating } from "../utils/content-safety.js";

type PostCursor = { createdAt: string; id: string };
type TrendingCursor = { score: number; createdAt: string; id: string };

export function encodePostCursor(post: Pick<PostRecord, "id" | "createdAt">): string {
  return Buffer.from(JSON.stringify({ createdAt: post.createdAt, id: post.id }), "utf8").toString("base64url");
}

export function encodeTrendingCursor(post: Pick<PostRecord, "id" | "createdAt"> & { score?: number }): string {
  return Buffer.from(JSON.stringify({ score: post.score ?? 0, createdAt: post.createdAt, id: post.id }), "utf8").toString("base64url");
}

function decodeCursor(value: string | undefined): PostCursor | undefined {
  if (!value) return undefined;
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Partial<PostCursor>;
    if (typeof parsed.createdAt === "string" && typeof parsed.id === "string") return { createdAt: parsed.createdAt, id: parsed.id };
  } catch { /* malformed cursors are treated as the first page */ }
  return undefined;
}

function decodeTrendingCursor(value: string | undefined): TrendingCursor | undefined {
  if (!value) return undefined;
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Partial<TrendingCursor>;
    if (typeof parsed.score === "number" && typeof parsed.createdAt === "string" && typeof parsed.id === "string") return parsed as TrendingCursor;
  } catch { /* malformed cursors are treated as the first page */ }
  return undefined;
}

export class PostRepository {

  async likePost(postId: string, userId: string): Promise<void> {
    const inserted = await db.insert(postLikesTable).values({ postId, userId }).onConflictDoNothing().returning({ postId: postLikesTable.postId });
    if (inserted.length > 0) {
      await db.execute(sql`
        UPDATE posts
        SET likes_count = likes_count + 1,
            score = ((likes_count + 1) * 3) + (comments_count * 2) + (share_count * 5),
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
            score = (GREATEST(0, likes_count - 1) * 3) + (comments_count * 2) + (share_count * 5),
            updated_at = NOW()
        WHERE id = ${postId}
      `);
    }
  }

  async bookmarkPost(postId: string, userId: string): Promise<void> {
    const inserted = await db.insert(postBookmarksTable)
      .values({ postId, userId })
      .onConflictDoNothing()
      .returning({ postId: postBookmarksTable.postId });
    if (inserted.length > 0) {
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

  async create(post: PostRecord, poll?: { id: string; question: string; options: Array<{ id: string; text: string; position: number }> }): Promise<PostRecord> {
    const { likedBy: _likedBy, bookmarkedBy: _bookmarkedBy, comments: _comments, poll: _poll, ...persistedPost } = post;
    const [created] = await db.transaction(async (tx) => {
      const [createdPost] = await tx.insert(postsTable).values(persistedPost).returning();
      if (poll) {
        await tx.insert(postPollsTable).values({
          id: poll.id,
          postId: createdPost.id,
          question: poll.question,
        });
        if (poll.options.length > 0) {
          await tx.insert(postPollOptionsTable).values(poll.options.map((option) => ({
            id: option.id,
            pollId: poll.id,
            text: option.text,
            position: option.position,
          })));
        }
      }
      return [createdPost];
    });
    return created as PostRecord;
  }

  async repostPost(postId: string, userId: string, note?: string): Promise<void> {
    const inserted = await db.insert(postRepostsTable)
      .values({ id: randomUUID(), postId, userId, note: note ?? null })
      .onConflictDoNothing()
      .returning({ id: postRepostsTable.id });
    if (inserted.length > 0) {
      await db.execute(sql`UPDATE posts SET repost_count = repost_count + 1, updated_at = NOW() WHERE id = ${postId}`);
    }
  }

  async unrepostPost(postId: string, userId: string): Promise<void> {
    const deleted = await db.delete(postRepostsTable)
      .where(and(eq(postRepostsTable.postId, postId), eq(postRepostsTable.userId, userId)))
      .returning({ id: postRepostsTable.id });
    if (deleted.length > 0) {
      await db.execute(sql`UPDATE posts SET repost_count = GREATEST(0, repost_count - 1), updated_at = NOW() WHERE id = ${postId}`);
    }
  }

  async hasReposted(postId: string, userId: string): Promise<boolean> {
    const [row] = await db.select({ id: postRepostsTable.id })
      .from(postRepostsTable)
      .where(and(eq(postRepostsTable.postId, postId), eq(postRepostsTable.userId, userId)))
      .limit(1);
    return Boolean(row);
  }

  async votePoll(postId: string, optionId: string, userId: string): Promise<boolean> {
    const [poll] = await db.select({ id: postPollsTable.id })
      .from(postPollsTable)
      .where(eq(postPollsTable.postId, postId))
      .limit(1);
    if (!poll) return false;

    const [option] = await db.select({ id: postPollOptionsTable.id })
      .from(postPollOptionsTable)
      .where(and(eq(postPollOptionsTable.id, optionId), eq(postPollOptionsTable.pollId, poll.id)))
      .limit(1);
    if (!option) return false;

    const inserted = await db.insert(postPollVotesTable)
      .values({ pollId: poll.id, optionId, userId })
      .onConflictDoNothing()
      .returning({ pollId: postPollVotesTable.pollId });
    if (inserted.length > 0) {
      await db.execute(sql`UPDATE post_poll_options SET vote_count = vote_count + 1 WHERE id = ${optionId}`);
    }
    return true;
  }

  async getPolls(postIds: string[], userId?: string): Promise<Map<string, PostRecord["poll"]>> {
    const result = new Map<string, PostRecord["poll"]>();
    if (postIds.length === 0) return result;
    const polls = await db.select().from(postPollsTable).where(inArray(postPollsTable.postId, postIds));
    if (polls.length === 0) return result;
    const pollIds = polls.map((poll) => poll.id);
    const options = await db.select().from(postPollOptionsTable)
      .where(inArray(postPollOptionsTable.pollId, pollIds))
      .orderBy(postPollOptionsTable.position);
    const votes = userId
      ? await db.select({ pollId: postPollVotesTable.pollId, optionId: postPollVotesTable.optionId })
        .from(postPollVotesTable)
        .where(and(inArray(postPollVotesTable.pollId, pollIds), eq(postPollVotesTable.userId, userId)))
      : [];
    const votedOptions = new Map(votes.map((vote) => [vote.pollId, vote.optionId]));
    const optionsByPoll = new Map<string, typeof options>();
    for (const option of options) {
      const current = optionsByPoll.get(option.pollId) ?? [];
      current.push(option);
      optionsByPoll.set(option.pollId, current);
    }
    for (const poll of polls) {
      const pollOptions = optionsByPoll.get(poll.id) ?? [];
      result.set(poll.postId, {
        id: poll.id,
        question: poll.question,
        options: pollOptions.map((option) => ({
          id: option.id,
          text: option.text,
          position: option.position,
          votes: option.voteCount,
        })),
        totalVotes: pollOptions.reduce((total, option) => total + option.voteCount, 0),
        ...(votedOptions.has(poll.id) ? { votedOptionId: votedOptions.get(poll.id) } : {}),
      });
    }
    return result;
  }

  async findById(id: string, excludedAuthorIds: string[] = [], contentFilter?: ContentRating): Promise<PostRecord | undefined> {
    const filters = [eq(postsTable.id, id)];
    if (excludedAuthorIds.length > 0) filters.push(notInArray(postsTable.authorId, excludedAuthorIds));
    if (contentFilter === "child_safe") filters.push(eq(postsTable.contentRating, "child_safe"));
    if (contentFilter === "regular") filters.push(inArray(postsTable.contentRating, ["child_safe", "regular"]));
    const [post] = await db.select().from(postsTable).where(and(...filters));
    return post as PostRecord | undefined;
  }

  async listByUser(userId: string, cursor?: string, limit: number = 20, excludedAuthorIds: string[] = [], contentFilter?: ContentRating): Promise<PostRecord[]> {
    const filters = [eq(postsTable.authorId, userId)];
    const parsedCursor = decodeCursor(cursor);
    if (parsedCursor) {
      const cursorFilter = or(lt(postsTable.createdAt, parsedCursor.createdAt), and(eq(postsTable.createdAt, parsedCursor.createdAt), lt(postsTable.id, parsedCursor.id)));
      if (cursorFilter) filters.push(cursorFilter);
    }
    if (excludedAuthorIds.length > 0) filters.push(notInArray(postsTable.authorId, excludedAuthorIds));
    if (contentFilter === "child_safe") filters.push(eq(postsTable.contentRating, "child_safe"));
    if (contentFilter === "regular") filters.push(inArray(postsTable.contentRating, ["child_safe", "regular"]));
    return (await db.select().from(postsTable).where(and(...filters)).orderBy(desc(postsTable.createdAt)).limit(limit)) as PostRecord[];
  }

  async list(cursor?: string, limit: number = 20, excludedAuthorIds: string[] = [], contentFilter?: ContentRating): Promise<PostRecord[]> {
    const filters: any[] = [];
    const parsedCursor = decodeCursor(cursor);
    if (parsedCursor) filters.push(or(lt(postsTable.createdAt, parsedCursor.createdAt), and(eq(postsTable.createdAt, parsedCursor.createdAt), lt(postsTable.id, parsedCursor.id))));
    if (excludedAuthorIds.length > 0) filters.push(notInArray(postsTable.authorId, excludedAuthorIds));
    if (contentFilter === "child_safe") filters.push(eq(postsTable.contentRating, "child_safe"));
    if (contentFilter === "regular") filters.push(inArray(postsTable.contentRating, ["child_safe", "regular"]));
    let q = db.select().from(postsTable).$dynamic();
    if (filters.length > 0) q = q.where(and(...filters));
    return (await q.orderBy(desc(postsTable.createdAt)).limit(limit)) as PostRecord[];
  }

  async listTrending(cursor?: string, limit: number = 20, excludedAuthorIds: string[] = [], contentFilter?: ContentRating): Promise<PostRecord[]> {
    const filters: any[] = [];
    const parsedCursor = decodeTrendingCursor(cursor);
    if (parsedCursor) {
      filters.push(or(
        lt(postsTable.score, parsedCursor.score),
        and(eq(postsTable.score, parsedCursor.score), lt(postsTable.createdAt, parsedCursor.createdAt)),
        and(eq(postsTable.score, parsedCursor.score), eq(postsTable.createdAt, parsedCursor.createdAt), lt(postsTable.id, parsedCursor.id)),
      ));
    }
    if (excludedAuthorIds.length > 0) filters.push(notInArray(postsTable.authorId, excludedAuthorIds));
    if (contentFilter === "child_safe") filters.push(eq(postsTable.contentRating, "child_safe"));
    if (contentFilter === "regular") filters.push(inArray(postsTable.contentRating, ["child_safe", "regular"]));
    let q = db.select().from(postsTable).$dynamic();
    if (filters.length > 0) q = q.where(and(...filters));
    return (await q.orderBy(desc(postsTable.score), desc(postsTable.createdAt)).limit(limit)) as PostRecord[];
  }

  /** DB-level content search, so this doesn't pull the whole table into memory to filter in JS. */
  async search(query: string, limit: number = 50, excludedAuthorIds: string[] = [], contentFilter?: ContentRating): Promise<PostRecord[]> {
    const indexState = await pool.query<{ is_ready: boolean }>(`
      SELECT EXISTS (
        SELECT 1
        FROM pg_index
        WHERE indexrelid = to_regclass('public.post_content_trgm_idx')
          AND indisvalid
          AND indisready
      ) AS is_ready
    `);

    if (!indexState.rows[0]?.is_ready) {
      const recentPosts = db
        .select()
        .from(postsTable)
        .orderBy(desc(postsTable.createdAt))
        .limit(250)
        .as("recent_searchable_posts");

      const recentFilters: any[] = [ilike(recentPosts.content, `%${query}%`)];
      if (excludedAuthorIds.length > 0) recentFilters.push(notInArray(recentPosts.authorId, excludedAuthorIds));
      if (contentFilter === "child_safe") recentFilters.push(eq(recentPosts.contentRating, "child_safe"));
      if (contentFilter === "regular") recentFilters.push(inArray(recentPosts.contentRating, ["child_safe", "regular"]));
      return (await db
        .select()
        .from(recentPosts)
        .where(and(...recentFilters))
        .orderBy(desc(recentPosts.createdAt))
        .limit(limit)) as PostRecord[];
    }

    const filters: any[] = [ilike(postsTable.content, `%${query}%`)];
    if (excludedAuthorIds.length > 0) filters.push(notInArray(postsTable.authorId, excludedAuthorIds));
    if (contentFilter === "child_safe") filters.push(eq(postsTable.contentRating, "child_safe"));
    if (contentFilter === "regular") filters.push(inArray(postsTable.contentRating, ["child_safe", "regular"]));
    return (await db
      .select()
      .from(postsTable)
      .where(and(...filters))
      .orderBy(desc(postsTable.createdAt))
      .limit(limit)) as PostRecord[];
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
