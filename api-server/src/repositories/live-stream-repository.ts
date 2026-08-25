import { eq, desc } from "drizzle-orm";
import { liveStreamsTable } from "@workspace/db/schema";
import { db } from "@workspace/db";
import type { LiveStreamRecord } from "../types/index.js";

export class LiveStreamRepository {
  async create(stream: LiveStreamRecord): Promise<LiveStreamRecord> {
    const [created] = await db.insert(liveStreamsTable).values(stream).returning();
    return created as LiveStreamRecord;
  }

  async list(): Promise<LiveStreamRecord[]> {
    return (await db.select().from(liveStreamsTable).orderBy(desc(liveStreamsTable.startsAt)).limit(100)) as LiveStreamRecord[];
  }

  async findById(id: string): Promise<LiveStreamRecord | undefined> {
    const [stream] = await db.select().from(liveStreamsTable).where(eq(liveStreamsTable.id, id));
    return stream as LiveStreamRecord | undefined;
  }

  async update(id: string, updates: Partial<LiveStreamRecord>): Promise<LiveStreamRecord | undefined> {
    const [updated] = await db.update(liveStreamsTable).set(updates).where(eq(liveStreamsTable.id, id)).returning();
    return updated as LiveStreamRecord | undefined;
  }
}
