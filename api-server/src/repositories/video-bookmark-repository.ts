import { and, eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { videoBookmarksTable } from "@workspace/db/schema";

export class VideoBookmarkRepository {
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
