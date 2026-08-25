import { eq, desc, sql } from "drizzle-orm";
import { articlesTable } from "@workspace/db/schema";
import { db } from "@workspace/db";
import type { ArticleRecord } from "../types/index.js";

export class ArticleRepository {
  async create(article: ArticleRecord): Promise<ArticleRecord> {
    const [created] = await db.insert(articlesTable).values(article).returning();
    return created as ArticleRecord;
  }

  async list(): Promise<ArticleRecord[]> {
    return (await db.select().from(articlesTable).orderBy(desc(articlesTable.createdAt)).limit(100)) as ArticleRecord[];
  }

  async findById(id: string): Promise<ArticleRecord | undefined> {
    const [article] = await db.select().from(articlesTable).where(eq(articlesTable.id, id));
    return article as ArticleRecord | undefined;
  }

  async incrementClaps(id: string, by: number): Promise<ArticleRecord | undefined> {
    const [updated] = await db.update(articlesTable).set({ claps: sql`${articlesTable.claps} + ${by}` }).where(eq(articlesTable.id, id)).returning();
    return updated as ArticleRecord | undefined;
  }

  async delete(id: string): Promise<boolean> {
    const result = await db.delete(articlesTable).where(eq(articlesTable.id, id)).returning();
    return result.length > 0;
  }
}
