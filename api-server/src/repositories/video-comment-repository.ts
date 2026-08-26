import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { videoCommentsTable } from "@workspace/db/schema";
import type { VideoCommentRecord } from "../types/index.js";

export class VideoCommentRepository {
  async create(comment: VideoCommentRecord): Promise<VideoCommentRecord> {
    const [created] = await db.insert(videoCommentsTable).values({
      id: comment.id,
      videoId: comment.videoId,
      authorId: comment.authorId,
      content: comment.content,
      mediaUrl: comment.mediaUrl,
      mediaType: comment.mediaType,
      mediaDuration: comment.mediaDuration,
      createdAt: comment.createdAt,
      likedBy: comment.likedBy ?? [],
    }).returning();
    return created as VideoCommentRecord;
  }

  async list(videoId: string): Promise<VideoCommentRecord[]> {
    return await db.select().from(videoCommentsTable)
      .where(eq(videoCommentsTable.videoId, videoId))
      .orderBy(asc(videoCommentsTable.createdAt)) as VideoCommentRecord[];
  }

  async toggleLike(videoId: string, commentId: string, userId: string): Promise<VideoCommentRecord | undefined> {
    const [updated] = await db.update(videoCommentsTable).set({
      likedBy: sql`CASE WHEN ${videoCommentsTable.likedBy} ? ${userId} THEN ${videoCommentsTable.likedBy} - ${userId} ELSE ${videoCommentsTable.likedBy} || jsonb_build_array(${userId}) END`,
      updatedAt: new Date().toISOString(),
    }).where(and(
      eq(videoCommentsTable.id, commentId),
      eq(videoCommentsTable.videoId, videoId),
    )).returning();
    return updated as VideoCommentRecord | undefined;
  }
}
