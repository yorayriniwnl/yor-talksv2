import { eq, or, ilike } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
export class UserRepository {
    async create(user) {
        const [created] = await db.insert(usersTable).values(user).returning();
        return created;
    }
    async findByEmail(email) {
        const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
        return user;
    }
    async findByUsername(username) {
        const [user] = await db.select().from(usersTable).where(eq(usersTable.username, username));
        return user;
    }
    async findById(id) {
        const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
        return user;
    }
    async update(id, updates) {
        const [updated] = await db.update(usersTable)
            .set({ ...updates, updatedAt: new Date() })
            .where(eq(usersTable.id, id))
            .returning();
        return updated;
    }
    async list(search = "") {
        if (!search) {
            return (await db.select().from(usersTable));
        }
        const query = `%${search}%`;
        return (await db.select().from(usersTable).where(or(ilike(usersTable.username, query), ilike(usersTable.fullName, query))));
    }
}
//# sourceMappingURL=user-repository.js.map