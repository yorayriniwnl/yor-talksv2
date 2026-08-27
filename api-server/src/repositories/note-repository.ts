import { and, desc, eq, gt } from "drizzle-orm";
import { db, userNotesTable } from "@workspace/db";
import type { NoteRecord } from "../types/index.js";

export class NoteRepository {
  async replaceForAuthor(note: NoteRecord): Promise<NoteRecord> {
    const [created] = await db.transaction(async (tx) => {
      // Notes intentionally have no public history: publishing a new one
      // replaces the previous active status for a clean, deterministic UI.
      await tx.delete(userNotesTable).where(eq(userNotesTable.authorId, note.authorId));
      return tx.insert(userNotesTable).values(note).returning();
    });
    return created as NoteRecord;
  }

  async listActive(): Promise<NoteRecord[]> {
    return (await db
      .select()
      .from(userNotesTable)
      .where(gt(userNotesTable.expiresAt, new Date().toISOString()))
      .orderBy(desc(userNotesTable.createdAt))
      .limit(100)) as NoteRecord[];
  }

  async deleteOwned(id: string, authorId: string): Promise<boolean> {
    const deleted = await db.delete(userNotesTable).where(and(
      eq(userNotesTable.id, id),
      eq(userNotesTable.authorId, authorId),
    )).returning({ id: userNotesTable.id });
    return deleted.length > 0;
  }
}
