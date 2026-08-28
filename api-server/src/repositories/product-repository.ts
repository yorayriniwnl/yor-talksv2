import { and, desc, eq, inArray } from "drizzle-orm";
import { productSavesTable, productsTable } from "@workspace/db/schema";
import { db } from "@workspace/db";
import type { ProductRecord } from "../types/index.js";

export class ProductRepository {
  async create(product: ProductRecord): Promise<ProductRecord> {
    const { savedBy: _savedBy, ...persistedProduct } = product;
    const [created] = await db.insert(productsTable).values(persistedProduct).returning();
    return { ...(created as ProductRecord), savedBy: [] };
  }

  async list(viewerId?: string): Promise<ProductRecord[]> {
    return this.hydrateViewerSave((await db.select().from(productsTable).orderBy(desc(productsTable.createdAt)).limit(100)) as ProductRecord[], viewerId);
  }

  async findById(id: string, viewerId?: string): Promise<ProductRecord | undefined> {
    const [product] = await db.select().from(productsTable).where(eq(productsTable.id, id));
    return product ? (await this.hydrateViewerSave([product as ProductRecord], viewerId))[0] : undefined;
  }

  async update(id: string, updates: Partial<ProductRecord>): Promise<ProductRecord | undefined> {
    const { savedBy: _savedBy, ...persistedUpdates } = updates;
    const [updated] = await db.update(productsTable).set(persistedUpdates).where(eq(productsTable.id, id)).returning();
    return updated ? (await this.hydrateViewerSave([updated as ProductRecord]))[0] : undefined;
  }

  async toggleSaved(id: string, userId: string): Promise<ProductRecord | undefined> {
    await db.transaction(async (tx) => {
      const removed = await tx.delete(productSavesTable).where(and(
        eq(productSavesTable.productId, id),
        eq(productSavesTable.userId, userId),
      )).returning({ productId: productSavesTable.productId });
      if (removed.length === 0) {
        await tx.insert(productSavesTable).values({ productId: id, userId }).onConflictDoNothing();
      }
    });
    return this.findById(id, userId);
  }

  async delete(id: string): Promise<boolean> {
    const result = await db.delete(productsTable).where(eq(productsTable.id, id)).returning();
    return result.length > 0;
  }

  private async hydrateViewerSave(products: ProductRecord[], viewerId?: string): Promise<ProductRecord[]> {
    if (products.length === 0) return [];
    const savedProductIds = viewerId
      ? new Set((await db.select({ productId: productSavesTable.productId }).from(productSavesTable).where(and(
        eq(productSavesTable.userId, viewerId),
        inArray(productSavesTable.productId, products.map((product) => product.id)),
      ))).map((save) => save.productId))
      : new Set<string>();
    return products.map((product) => ({
      ...product,
      savedBy: viewerId && savedProductIds.has(product.id) ? [viewerId] : [],
    }));
  }
}
