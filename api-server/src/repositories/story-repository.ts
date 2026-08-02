import { eq, gt, desc } from "drizzle-orm";
import { storiesTable } from "@workspace/db/schema";
import { db } from "@workspace/db";
import type { StoryRecord } from "../types/index.js";

export class StoryRepository {
  async create(story: StoryRecord): Promise<StoryRecord> {
    const [created] = await db.insert(storiesTable).values(story).returning();
    return created as StoryRecord;
  }

  /** Only stories that haven't expired yet — matches the 24-hour-expiry pattern of the feature itself. */
  async listActive(): Promise<StoryRecord[]> {
    return (await db
      .select()
      .from(storiesTable)
      .where(gt(storiesTable.expiresAt, new Date().toISOString()))
      .orderBy(desc(storiesTable.createdAt))) as StoryRecord[];
  }

  async findById(id: string): Promise<StoryRecord | undefined> {
    const [story] = await db.select().from(storiesTable).where(eq(storiesTable.id, id));
    return story as StoryRecord | undefined;
  }

  async update(id: string, updates: Partial<StoryRecord>): Promise<StoryRecord | undefined> {
    const [updated] = await db.update(storiesTable).set(updates).where(eq(storiesTable.id, id)).returning();
    return updated as StoryRecord | undefined;
  }

  async delete(id: string): Promise<boolean> {
    const result = await db.delete(storiesTable).where(eq(storiesTable.id, id)).returning();
    return result.length > 0;
  }
}
