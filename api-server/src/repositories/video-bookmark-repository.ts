import { and, desc, eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { videoBookmarksTable, videosTable } from "@workspace/db/schema";
import type { VideoRecord } from '../types/index.js';
import { collectionAfter, type CollectionCandidate, type CollectionPosition } from '../utils/saved-collection-page.js';

export class VideoBookmarkRepository {
  async listPageForUser(userId: string, position: CollectionPosition | undefined, limit: number): Promise<CollectionCandidate<VideoRecord>[]> {
    const rows = await db.select({ item: videosTable, createdAt: videoBookmarksTable.createdAt, id: videoBookmarksTable.videoId })
      .from(videoBookmarksTable).innerJoin(videosTable, eq(videoBookmarksTable.videoId, videosTable.id))
      .where(and(eq(videoBookmarksTable.userId, userId), collectionAfter(videoBookmarksTable.createdAt, videoBookmarksTable.videoId, position)))
      .orderBy(desc(videoBookmarksTable.createdAt), desc(videoBookmarksTable.videoId)).limit(limit);
    return rows as CollectionCandidate<VideoRecord>[];
  }

  async listForUser(userId: string): Promise<string[]> {
    const rows = await db.select({ videoId: videoBookmarksTable.videoId })
      .from(videoBookmarksTable)
      .where(eq(videoBookmarksTable.userId, userId));
    return rows.map((row) => row.videoId);
  }

  async toggle(videoId: string, userId: string): Promise<boolean> {
    const [existing] = await db.select({ videoId: videoBookmarksTable.videoId })
      .from(videoBookmarksTable)
      .where(and(eq(videoBookmarksTable.videoId, videoId), eq(videoBookmarksTable.userId, userId)));
    if (existing) {
      await db.delete(videoBookmarksTable).where(and(
        eq(videoBookmarksTable.videoId, videoId),
        eq(videoBookmarksTable.userId, userId),
      ));
      return false;
    }
    await db.insert(videoBookmarksTable).values({ videoId, userId });
    return true;
  }
}
