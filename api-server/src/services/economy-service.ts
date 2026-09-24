import { and, eq, like, or, sql } from "drizzle-orm";
import { ledgerTransactionsTable } from "@workspace/db/schema";
import { db } from "@workspace/db";

export class EconomyService {
  async getCreatorWallet(userId: string) {
    const credits = await db
      .select({ total: sql<number>`sum(amount_minor)` })
      .from(ledgerTransactionsTable)
      .where(and(
        eq(ledgerTransactionsTable.creditAccountId, userId),
        eq(ledgerTransactionsTable.status, "completed"),
        eq(ledgerTransactionsTable.currency, "INR"),
      ));

    const debits = await db
      .select({ total: sql<number>`sum(amount_minor)` })
      .from(ledgerTransactionsTable)
      .where(and(
        eq(ledgerTransactionsTable.debitAccountId, userId),
        eq(ledgerTransactionsTable.status, "completed"),
        eq(ledgerTransactionsTable.currency, "INR"),
        or(
          like(ledgerTransactionsTable.referenceId, "razorpay:refund:%"),
          like(ledgerTransactionsTable.referenceId, "subscription:refund:%"),
          like(ledgerTransactionsTable.referenceId, "marketplace:refund:%"),
        ),
      ));

    const totalCredit = credits[0]?.total || 0;
    const totalDebit = debits[0]?.total || 0;
    
    return {
      balanceMinor: Number(totalCredit || 0) - Number(totalDebit || 0),
      currency: "INR",
    };
  }
}
