import { eq, desc, sql, inArray, and } from "drizzle-orm";
import { videosTable } from "@workspace/db/schema";
import { db } from "@workspace/db";
import type { VideoRecord } from "../types/index.js";
import { lockActiveUser } from "../utils/active-user-lock.js";

export class VideoRepository {
  async create(video: VideoRecord): Promise<VideoRecord> {
    const [created] = await db.insert(videosTable).values(video).returning();
    return created as VideoRecord;
  }

  async list(): Promise<VideoRecord[]> {
    return (await db
      .select()
      .from(videosTable)
      .where(
        sql`not exists (select 1 from moderation_enforcements me
          where me.target_type = 'video' and me.target_id = ${videosTable.id}::text
            and (me.expires_at is null or me.expires_at > clock_timestamp()))`
      )
      .orderBy(desc(videosTable.createdAt))
      .limit(100)) as VideoRecord[];
  }

  async findById(id: string): Promise<VideoRecord | undefined> {
    const [video] = await db.select().from(videosTable).where(eq(videosTable.id, id));
    return video as VideoRecord | undefined;
  }

  async listByIds(ids: string[]): Promise<VideoRecord[]> {
    if (ids.length === 0) return [];
    return (await db
      .select()
      .from(videosTable)
      .where(
        and(
          inArray(videosTable.id, ids),
          sql`not exists (select 1 from moderation_enforcements me
            where me.target_type = 'video' and me.target_id = ${videosTable.id}::text
              and (me.expires_at is null or me.expires_at > clock_timestamp()))`
        )
      )) as VideoRecord[];
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

  async toggleLike(id: string, userId: string): Promise<VideoRecord | undefined> {
    return db.transaction(async tx => {
      if (!(await lockActiveUser(tx, userId))) return undefined;
      const [updated] = await tx.update(videosTable).set({
        likedBy: sql`CASE
          WHEN COALESCE(${videosTable.likedBy}, '[]'::jsonb) ? ${userId}
            THEN COALESCE(${videosTable.likedBy}, '[]'::jsonb) - ${userId}
          ELSE COALESCE(${videosTable.likedBy}, '[]'::jsonb) || jsonb_build_array(${userId}::text)
        END`,
      }).where(eq(videosTable.id, id)).returning();
      return updated as VideoRecord | undefined;
    });
  }

  async delete(id: string): Promise<boolean> {
    const result = await db.delete(videosTable).where(eq(videosTable.id, id)).returning();
    return result.length > 0;
  }
}
