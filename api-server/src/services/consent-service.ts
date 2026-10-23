import { createHash } from "node:crypto";
import { db } from "@workspace/db";
import { consentRecordsTable } from "@workspace/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { logger } from "../lib/logger.js";

export interface RecordConsentInput {
  subjectId?: string | null;
  email?: string | null;
  purpose: string;
  version: string;
  granted: boolean;
  metadata?: Record<string, unknown>;
}

export class ConsentService {
  private digest(email?: string | null): string | null {
    if (!email) return null;
    return createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
  }

  async recordConsent(input: RecordConsentInput): Promise<string> {
    const subjectDigest = this.digest(input.email);
    if (!input.subjectId && !subjectDigest) throw new Error('Consent requires an identified subject');
    const [inserted] = await db
      .insert(consentRecordsTable)
      .values({
        subjectId: input.subjectId || null,
        subjectDigest,
        purpose: input.purpose,
        version: input.version,
        granted: input.granted,
        withdrawnAt: input.granted ? null : sql`clock_timestamp()`,
        metadata: input.metadata ?? {},
      })
      .returning({ id: consentRecordsTable.id });

    logger.info(
      { purpose: input.purpose, version: input.version, granted: input.granted },
      "Consent state recorded"
    );

    return inserted.id;
  }

  async withdrawConsent(params: {
    subjectId?: string | null;
    email?: string | null;
    purpose: string;
  }): Promise<number> {
    const subjectDigest = this.digest(params.email);
    if (!params.subjectId && !subjectDigest) throw new Error('Consent withdrawal requires an identified subject');

    let whereClause = eq(consentRecordsTable.purpose, params.purpose);
    if (params.subjectId && subjectDigest) {
      whereClause = and(
        eq(consentRecordsTable.purpose, params.purpose),
        sql`(${consentRecordsTable.subjectId} = ${params.subjectId}::uuid OR ${consentRecordsTable.subjectDigest} = ${subjectDigest})`
      )!;
    } else if (params.subjectId) {
      whereClause = and(
        eq(consentRecordsTable.purpose, params.purpose),
        eq(consentRecordsTable.subjectId, params.subjectId)
      )!;
    } else if (subjectDigest) {
      whereClause = and(
        eq(consentRecordsTable.purpose, params.purpose),
        eq(consentRecordsTable.subjectDigest, subjectDigest)
      )!;
    }

    const result = await db
      .update(consentRecordsTable)
      .set({
        granted: false,
        withdrawnAt: sql`clock_timestamp()`,
      })
      .where(and(whereClause, eq(consentRecordsTable.granted, true)));

    return Number(result.rowCount ?? 0);
  }

  async hasConsent(params: {
    subjectId?: string | null;
    email?: string | null;
    purpose: string;
  }): Promise<boolean> {
    const subjectDigest = this.digest(params.email);
    if (!params.subjectId && !subjectDigest) return false;
    let whereClause = eq(consentRecordsTable.purpose, params.purpose);

    if (params.subjectId && subjectDigest) {
      whereClause = and(
        eq(consentRecordsTable.purpose, params.purpose),
        sql`(${consentRecordsTable.subjectId} = ${params.subjectId}::uuid OR ${consentRecordsTable.subjectDigest} = ${subjectDigest})`
      )!;
    } else if (params.subjectId) {
      whereClause = and(
        eq(consentRecordsTable.purpose, params.purpose),
        eq(consentRecordsTable.subjectId, params.subjectId)
      )!;
    } else if (subjectDigest) {
      whereClause = and(
        eq(consentRecordsTable.purpose, params.purpose),
        eq(consentRecordsTable.subjectDigest, subjectDigest)
      )!;
    }

    const rows = await db
      .select({ granted: consentRecordsTable.granted, withdrawnAt: consentRecordsTable.withdrawnAt })
      .from(consentRecordsTable)
      .where(whereClause)
      .orderBy(sql`${consentRecordsTable.grantedAt} DESC`,sql`${consentRecordsTable.granted} ASC`,sql`${consentRecordsTable.id} DESC`)
      .limit(1);

    if (rows.length === 0) return false;
    return Boolean(rows[0].granted && !rows[0].withdrawnAt);
  }
}

export const consentService = new ConsentService();
