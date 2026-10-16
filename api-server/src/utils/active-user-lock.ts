import { eq } from "drizzle-orm";
import { usersTable } from "@workspace/db/schema";
import type { DbTransaction } from "@workspace/db";

/**
 * Serialize writes that embed a user ID in legacy JSON columns with account
 * deletion. Deletion holds FOR UPDATE on this row while scrubbing those
 * columns; a key-share lock either makes the write finish before that scrub,
 * or observes the account as gone after deletion commits.
 */
export async function lockActiveUser(tx: DbTransaction, userId: string): Promise<boolean> {
  const [user] = await tx.select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .for("key share")
    .limit(1);
  return Boolean(user);
}
