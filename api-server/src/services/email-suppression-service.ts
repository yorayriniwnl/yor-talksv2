import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { db } from "@workspace/db";
import { emailSuppressionsTable, consentRecordsTable } from "@workspace/db/schema";
import { eq, or, and, sql } from "drizzle-orm";
import { env } from "../config/env.js";
import { logger } from "../lib/logger.js";

export class PromotionalEmailDisabledError extends Error {
  constructor(message = "Promotional email dispatch is disabled for this deployment") {
    super(message);
    this.name = "PromotionalEmailDisabledError";
  }
}

export class EmailSuppressedError extends Error {
  constructor(purpose: string) {
    super(`Email is suppressed for purpose: ${purpose}`);
    this.name = "EmailSuppressedError";
  }
}

export class ConsentMissingError extends Error {
  constructor(purpose: string) {
    super(`Active consent is missing or withdrawn for purpose: ${purpose}`);
    this.name = "ConsentMissingError";
  }
}

export class EmailSuppressionService {
  private get secret(): string {
    return env.CONTACT_SHIELD_SECRET || "development-suppression-secret-32-chars-min";
  }

  hashEmail(email: string): string {
    return createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
  }

  createUnsubscribeToken(email: string, purpose = "launch_updates"): string {
    const normalized = email.trim().toLowerCase();
    const signature = createHmac("sha256", this.secret)
      .update(`${normalized}:${purpose}`)
      .digest("hex");
    return `${purpose}.${signature}`;
  }

  verifyUnsubscribeToken(email: string, token: string): { valid: boolean; purpose?: string } {
    if (!token || typeof token !== "string" || !token.includes(".")) {
      return { valid: false };
    }
    const [purpose, signature] = token.split(".", 2);
    if (!purpose || !signature || signature.length !== 64) {
      return { valid: false };
    }
    const normalized = email.trim().toLowerCase();
    const expected = createHmac("sha256", this.secret)
      .update(`${normalized}:${purpose}`)
      .digest("hex");

    const expectedBuf = Buffer.from(expected, "hex");
    const actualBuf = Buffer.from(signature, "hex");
    if (expectedBuf.length !== actualBuf.length || !timingSafeEqual(expectedBuf, actualBuf)) {
      return { valid: false };
    }
    return { valid: true, purpose };
  }

  async isSuppressed(email: string, purpose: string): Promise<boolean> {
    const emailHash = this.hashEmail(email);
    const rows = await db
      .select({ id: emailSuppressionsTable.id })
      .from(emailSuppressionsTable)
      .where(
        and(
          eq(emailSuppressionsTable.emailHash, emailHash),
          or(
            eq(emailSuppressionsTable.purpose, purpose),
            eq(emailSuppressionsTable.purpose, "all_promotional")
          )
        )
      )
      .limit(1);

    return rows.length > 0;
  }

  async suppressEmail(
    email: string,
    purpose = "all_promotional",
    reason = "user_unsubscribe",
    metadata: Record<string, unknown> = {}
  ): Promise<void> {
    const emailHash = this.hashEmail(email);
    const normalizedEmail = email.trim().toLowerCase();

    await db.transaction(async (tx) => {
      // 1. Record in email_suppressions
      await tx
        .insert(emailSuppressionsTable)
        .values({
          emailHash,
          purpose,
          reason,
          metadata,
        })
        .onConflictDoNothing();

      // 2. If launch_updates or all_promotional, update preregistrations
      if (purpose === "launch_updates" || purpose === "all_promotional") {
        await tx.execute(
          sql`UPDATE preregistrations SET unsubscribed_at = clock_timestamp()
              WHERE lower(email) = ${normalizedEmail} AND unsubscribed_at IS NULL`
        );
      }

      // 3. Mark matching consent records withdrawn
      const consentPurpose = purpose === "all_promotional" ? "launch_updates" : purpose;
      await tx.execute(
        sql`UPDATE consent_records SET granted = false, withdrawn_at = clock_timestamp()
            WHERE subject_digest = ${emailHash}
              AND (purpose = ${consentPurpose} OR ${purpose} = 'all_promotional')
              AND granted = true`
      );
    });

    logger.info({ emailHash, purpose, reason }, "Email suppressed and consent revoked");
  }

  /** Stage 1: Enqueue check */
  async checkCanEnqueue(
    email: string,
    purpose: string
  ): Promise<{ allowed: boolean; reason?: string }> {
    if (!env.PROMOTIONAL_EMAIL_ENABLED) {
      return { allowed: false, reason: "promotional_email_disabled" };
    }

    if (await this.isSuppressed(email, purpose)) {
      return { allowed: false, reason: "email_suppressed" };
    }

    const hasConsent = await this.hasActiveConsent(email, purpose);
    if (!hasConsent) {
      return { allowed: false, reason: "consent_missing_or_withdrawn" };
    }

    return { allowed: true };
  }

  /** Stage 2: Worker retry check */
  async checkCanProcess(
    email: string,
    purpose: string
  ): Promise<{ allowed: boolean; reason?: string }> {
    return this.checkCanEnqueue(email, purpose);
  }

  /** Stage 3: Send-time enforcement */
  async checkCanSend(
    email: string,
    purpose: string
  ): Promise<{ allowed: boolean; reason?: string }> {
    return this.checkCanEnqueue(email, purpose);
  }

  private async hasActiveConsent(email: string, purpose: string): Promise<boolean> {
    const emailHash = this.hashEmail(email);
    // The versioned ledger is authoritative. A legacy signup timestamp must
    // never override a later withdrawal. The migration backfills old grants.

    // Check consent_records table
    const records = await db
      .select({ granted: consentRecordsTable.granted, withdrawnAt: consentRecordsTable.withdrawnAt })
      .from(consentRecordsTable)
      .where(
        and(
          eq(consentRecordsTable.subjectDigest, emailHash),
          eq(consentRecordsTable.purpose, purpose)
        )
      )
      .orderBy(sql`${consentRecordsTable.grantedAt} DESC`,sql`${consentRecordsTable.granted} ASC`,sql`${consentRecordsTable.id} DESC`)
      .limit(1);

    if (records.length > 0) {
      return Boolean(records[0].granted && !records[0].withdrawnAt);
    }

    return false;
  }
}

export const emailSuppressionService = new EmailSuppressionService();
