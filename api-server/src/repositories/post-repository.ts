import { eq, desc, ilike } from "drizzle-orm";
import { postsTable } from "@workspace/db/schema";
import { db } from "@workspace/db";
import type { PostRecord } from "../types/index.js";

export class PostRepository {
  async create(post: PostRecord): Promise<PostRecord> {
    const [created] = await db.insert(postsTable).values(post).returning();
    return created as PostRecord;
  }

  async findById(id: string): Promise<PostRecord | undefined> {
    const [post] = await db.select().from(postsTable).where(eq(postsTable.id, id));
    return post as PostRecord | undefined;
  }

  async listByUser(userId: string): Promise<PostRecord[]> {
    return (await db.select().from(postsTable).where(eq(postsTable.authorId, userId)).orderBy(desc(postsTable.createdAt))) as PostRecord[];
  }

  async list(): Promise<PostRecord[]> {
    return (await db.select().from(postsTable).orderBy(desc(postsTable.createdAt))) as PostRecord[];
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
    const [updated] = await db.update(postsTable)
      .set({ ...updates, updatedAt: new Date().toISOString() })
      .where(eq(postsTable.id, id))
      .returning();
    return updated as PostRecord | undefined;
  }

  async delete(id: string): Promise<boolean> {
    const [deleted] = await db.delete(postsTable).where(eq(postsTable.id, id)).returning({ id: postsTable.id });
    return !!deleted;
  }
}
