import { eq, desc } from "drizzle-orm";
import { db, postsTable } from "@workspace/db";
export class PostRepository {
    async create(post) {
        const [created] = await db.insert(postsTable).values(post).returning();
        return created;
    }
    async findById(id) {
        const [post] = await db.select().from(postsTable).where(eq(postsTable.id, id));
        return post;
    }
    async listByUser(userId) {
        return (await db.select().from(postsTable).where(eq(postsTable.authorId, userId)).orderBy(desc(postsTable.createdAt)));
    }
    async list() {
        return (await db.select().from(postsTable).orderBy(desc(postsTable.createdAt)));
    }
    async update(id, updates) {
        const [updated] = await db.update(postsTable)
            .set({ ...updates, updatedAt: new Date() })
            .where(eq(postsTable.id, id))
            .returning();
        return updated;
    }
    async delete(id) {
        const [deleted] = await db.delete(postsTable).where(eq(postsTable.id, id)).returning({ id: postsTable.id });
        return !!deleted;
    }
}
//# sourceMappingURL=post-repository.js.map