import { eq, sql } from "drizzle-orm";
import { ledgerTransactionsTable, subscriptionsTable, usersTable } from "@workspace/db/schema";
import { db } from "@workspace/db";

export class EconomyService {
  async getCreatorWallet(userId: string) {
    const credits = await db
      .select({ total: sql<number>`sum(amount_minor)` })
      .from(ledgerTransactionsTable)
      .where(eq(ledgerTransactionsTable.creditAccountId, userId));

    const debits = await db
      .select({ total: sql<number>`sum(amount_minor)` })
      .from(ledgerTransactionsTable)
      .where(eq(ledgerTransactionsTable.debitAccountId, userId));

    const totalCredit = credits[0]?.total || 0;
    const totalDebit = debits[0]?.total || 0;
    
    return {
      balanceMinor: totalCredit - totalDebit,
      currency: "INR",
    };
  }
}
