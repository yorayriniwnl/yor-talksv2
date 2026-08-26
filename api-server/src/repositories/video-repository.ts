import { eq, desc, sql, inArray } from "drizzle-orm";
import { videosTable } from "@workspace/db/schema";
import { db } from "@workspace/db";
import type { VideoRecord } from "../types/index.js";

export class VideoRepository {
  async create(video: VideoRecord): Promise<VideoRecord> {
    const [created] = await db.insert(videosTable).values(video).returning();
    return created as VideoRecord;
  }

  async list(): Promise<VideoRecord[]> {
    return (await db.select().from(videosTable).orderBy(desc(videosTable.createdAt)).limit(100)) as VideoRecord[];
  }

  async findById(id: string): Promise<VideoRecord | undefined> {
    const [video] = await db.select().from(videosTable).where(eq(videosTable.id, id));
    return video as VideoRecord | undefined;
  }

  async listByIds(ids: string[]): Promise<VideoRecord[]> {
    if (ids.length === 0) return [];
    return await db.select().from(videosTable).where(inArray(videosTable.id, ids)) as VideoRecord[];
  }

  async incrementViews(id: string): Promise<VideoRecord | undefined> {
    const [updated] = await db
      .update(videosTable)
      .set({ views: sql`${videosTable.views} + 1` })
      .where(eq(videosTable.id, id))
      .returning();
    return updated as VideoRecord | undefined;
  }

  async update(id: string, updates: Partial<VideoRecord>): Promise<VideoRecord | undefined> {
    const [updated] = await db.update(videosTable).set(updates).where(eq(videosTable.id, id)).returning();
    return updated as VideoRecord | undefined;
  }

  async delete(id: string): Promise<boolean> {
    const result = await db.delete(videosTable).where(eq(videosTable.id, id)).returning();
    return result.length > 0;
  }
}
