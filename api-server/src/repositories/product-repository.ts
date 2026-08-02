import { eq, desc } from "drizzle-orm";
import { productsTable } from "@workspace/db/schema";
import { db } from "@workspace/db";
import type { ProductRecord } from "../types/index.js";

export class ProductRepository {
  async create(product: ProductRecord): Promise<ProductRecord> {
    const [created] = await db.insert(productsTable).values(product).returning();
    return created as ProductRecord;
  }

  async list(): Promise<ProductRecord[]> {
    return (await db.select().from(productsTable).orderBy(desc(productsTable.createdAt))) as ProductRecord[];
  }

  async findById(id: string): Promise<ProductRecord | undefined> {
    const [product] = await db.select().from(productsTable).where(eq(productsTable.id, id));
    return product as ProductRecord | undefined;
  }

  async update(id: string, updates: Partial<ProductRecord>): Promise<ProductRecord | undefined> {
    const [updated] = await db.update(productsTable).set(updates).where(eq(productsTable.id, id)).returning();
    return updated as ProductRecord | undefined;
  }

  async delete(id: string): Promise<boolean> {
    const result = await db.delete(productsTable).where(eq(productsTable.id, id)).returning();
    return result.length > 0;
  }
}
