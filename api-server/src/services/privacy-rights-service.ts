import { createHash, randomBytes } from "node:crypto";
import { db, runInDatabaseTransaction } from "@workspace/db";
import {
  privacyRightsRequestsTable,
  usersTable,
  preregistrationsTable,
  deletionJournalTable,
} from "@workspace/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { EmailService } from "./email-service.js";
import { emailSuppressionService } from "./email-suppression-service.js";
import { consentService } from "./consent-service.js";
import { logger } from "../lib/logger.js";

export type PrivacyRequestType = "correction" | "restriction" | "objection" | "erasure" | "access";

export interface RightsRequestResult {
  executed: boolean;
  requestType: PrivacyRequestType;
  recordStatus?: string;
  erasedAt?: string;
  details?: Record<string, unknown>;
  message: string;
}

export class PrivacyRightsService {
  constructor(
    private readonly emailService: EmailService = new EmailService()
  ) {}

  private hashEmail(email: string): string {
    return createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
  }

  private hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  /**
   * Generates a cryptographic verification challenge sent strictly to the provided address.
   * ALWAYS returns a generic response so knowledge of an email address never establishes ownership
   * or confirms whether records exist.
   */
  async initiateChallenge(
    email: string,
    purpose: PrivacyRequestType = "access"
  ): Promise<{ challengeInitiated: true }> {
    const normalizedEmail = email.trim().toLowerCase();
    const emailHash = this.hashEmail(normalizedEmail);
    const token = randomBytes(32).toString("hex");
    const tokenHash = this.hashToken(token);

    // Persist the authority before sending anything. Per-address locking limits
    // inbox abuse across API instances without disclosing whether records exist.
    const issued = await runInDatabaseTransaction(async tx => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${'privacy-challenge:' + emailHash}, 0))`);
      const recent = await tx.execute(sql`SELECT count(*)::int AS n FROM privacy_rights_requests
        WHERE email_hash=${emailHash} AND created_at>clock_timestamp()-interval '15 minutes'`);
      if (Number(recent.rows[0].n) >= 3) return false;
      await tx.insert(privacyRightsRequestsTable).values({ requestType: purpose, emailHash,
        status: 'pending_verification', verificationTokenHash: tokenHash,
        verificationExpiresAt: sql`clock_timestamp() + interval '15 minutes'`, details: { purpose } });
      return true;
    });
    if (!issued) return { challengeInitiated: true };
    let delivered = false;
    try { delivered = await this.emailService.sendPrivacyChallengeEmail(normalizedEmail, token, purpose); }
    catch (err) { logger.error({ err }, 'Failed to send privacy challenge email'); }
    if (!delivered) await db.update(privacyRightsRequestsTable)
      .set({ status: 'rejected', verificationTokenHash: null, verificationExpiresAt: null })
      .where(eq(privacyRightsRequestsTable.verificationTokenHash, tokenHash));

    // Always generic response
    return { challengeInitiated: true };
  }

  /** Verifies a single-use challenge token */
  async verifyChallengeToken(
    token: string
  ): Promise<{ valid: boolean; email?: string; emailHash?: string; purpose?: PrivacyRequestType }> {
    if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) {
      return { valid: false };
    }
    const tokenHash = this.hashToken(token);

    // Redis is never a token authority; the same database row is consumed atomically.
    const rows = await db
      .select()
      .from(privacyRightsRequestsTable)
      .where(
        and(
          eq(privacyRightsRequestsTable.verificationTokenHash, tokenHash),
          eq(privacyRightsRequestsTable.status, "pending_verification"),
          sql`${privacyRightsRequestsTable.verificationExpiresAt} > clock_timestamp()`
        )
      )
      .limit(1);

    if (rows.length === 0) return { valid: false };

    return { valid: true, emailHash: rows[0].emailHash, purpose: rows[0].requestType as PrivacyRequestType };
  }

  private async resolveEmail(emailHash: string): Promise<string | undefined> {
    // Retain only a digest with the challenge. Resolve current records even when
    // Redis is unavailable, and prefer a newly registered account over old erasure history.
    const result = await db.execute(sql`SELECT email FROM (
      SELECT email,0 AS priority FROM users WHERE encode(sha256(lower(btrim(email))::bytea),'hex')=${emailHash}
      UNION ALL SELECT email,1 AS priority FROM preregistrations WHERE encode(sha256(lower(btrim(email))::bytea),'hex')=${emailHash}
      UNION ALL SELECT email,2 AS priority FROM waitlist WHERE encode(sha256(lower(btrim(email))::bytea),'hex')=${emailHash}
    ) owned ORDER BY priority LIMIT 1`);
    return typeof result.rows[0]?.email === 'string' ? result.rows[0].email : undefined;
  }

  /** Executes verified privacy rights request */
  async executeRightsRequest(input: {
    token: string;
    requestType: PrivacyRequestType;
    details?: Record<string, unknown>;
  }): Promise<RightsRequestResult> {
    const invalid = (): RightsRequestResult => ({ executed: false, requestType: input.requestType,
      message: 'Invalid, expired, mismatched or previously consumed verification challenge token' });
    if (typeof input.token !== 'string' || !/^[a-f0-9]{64}$/.test(input.token)) return invalid();
    if (input.requestType === 'correction' && (typeof input.details?.preferredUsername !== 'string'
      || !/^[a-zA-Z0-9_][a-zA-Z0-9_-]{2,23}$/.test(input.details.preferredUsername.trim()))) {
      return { executed: false, requestType: input.requestType, message: 'A valid preferred username is required' };
    }
    if (input.details?.reason !== undefined && (typeof input.details.reason !== 'string' || input.details.reason.length > 500)) {
      return { executed: false, requestType: input.requestType, message: 'Restriction reason must be at most 500 characters' };
    }
    return runInDatabaseTransaction(async tx => {
      const tokenHash = this.hashToken(input.token);
      const [request] = await tx.update(privacyRightsRequestsTable)
        .set({ status: 'verified', verifiedAt: sql`clock_timestamp()` })
        .where(and(eq(privacyRightsRequestsTable.verificationTokenHash, tokenHash),
          eq(privacyRightsRequestsTable.requestType, input.requestType), eq(privacyRightsRequestsTable.status, 'pending_verification'),
          sql`${privacyRightsRequestsTable.verificationExpiresAt}>clock_timestamp()`)).returning();
      if (!request) return invalid();
      const email = await this.resolveEmail(request.emailHash);
      const [subject] = email ? await tx.select({ id: usersTable.id }).from(usersTable)
        .where(sql`lower(${usersTable.email})=lower(${email})`).limit(1) : [];
      const result = await this.executeVerifiedRequest(input, { email, emailHash: request.emailHash, tokenHash });
      if (result.executed && input.requestType === 'erasure' && !subject) {
        await tx.insert(deletionJournalTable).values({ id: request.id, accountId: null,
          stableIdentityDigest: request.emailHash, reason: 'verified_unbound_erasure' });
      }
      if (result.executed && ['erasure','restriction','objection'].includes(input.requestType)) {
        await tx.execute(sql`INSERT INTO email_suppressions(email_hash,purpose,reason)
          VALUES(${request.emailHash},'all_promotional','verified_privacy_request'),(${request.emailHash},'launch_updates','verified_privacy_request')
          ON CONFLICT(email_hash,purpose) DO NOTHING`);
        await tx.execute(sql`UPDATE consent_records SET granted=false,withdrawn_at=clock_timestamp()
          WHERE subject_digest=${request.emailHash} AND granted=true`);
      }
      await tx.update(privacyRightsRequestsTable).set({ status: result.executed ? 'completed' : 'rejected',
        subjectId: subject?.id ?? null,
        completedAt: sql`clock_timestamp()`, verificationTokenHash: null, verificationExpiresAt: null,
        details: { purpose: input.requestType, recordStatus: result.recordStatus ?? (result.executed ? 'completed' : 'not_executed') } })
        .where(eq(privacyRightsRequestsTable.id, request.id));
      return result;
    });
  }

  private async executeVerifiedRequest(input: { requestType: PrivacyRequestType; details?: Record<string, unknown> },
    verified: { email?: string; emailHash: string; tokenHash: string }): Promise<RightsRequestResult> {
    const { email, emailHash, tokenHash } = verified;
    switch (input.requestType) {
      case "erasure": {
        // Check if an active account exists
        let activeUser = null;
        if (email) {
          const users = await db
            .select({ id: usersTable.id })
            .from(usersTable)
            .where(sql`lower(${usersTable.email}) = lower(${email})`)
            .limit(1);
          activeUser = users[0];
        }

        if (activeUser) {
          return {
            executed: false,
            requestType: "erasure",
            recordStatus: "active_account_requires_authenticated_deletion",
            message:
              "An active registered account exists for this address. To prevent unauthorized deletion, account erasure must be requested directly while signed in via Settings > Delete Account with current password confirmation.",
          };
        }

        // Unbound erasure: erase preregistrations and waitlists
        if (email) {
          await db.execute(sql`DELETE FROM preregistrations WHERE lower(email) = lower(${email})`);
          await db.execute(sql`DELETE FROM waitlist WHERE lower(email) = lower(${email})`);
          await emailSuppressionService.suppressEmail(email, "all_promotional", "user_rights_erasure");
          await consentService.withdrawConsent({ email, purpose: "launch_updates" });
        }

        await db
          .update(privacyRightsRequestsTable)
          .set({ status: "completed", completedAt: sql`clock_timestamp()` })
          .where(eq(privacyRightsRequestsTable.verificationTokenHash, tokenHash));

        return {
          executed: true,
          requestType: "erasure",
          recordStatus: "unbound_records_erased",
          message: "All unbound records have been permanently erased and communication preferences suppressed.",
        };
      }

      case "restriction":
      case "objection": {
        if (email) {
          // If active user exists, mark processing_restricted
          await db.execute(
            sql`UPDATE users SET processing_restricted = true,
                restriction_reason = ${typeof input.details?.reason === "string" ? input.details.reason : "user_objection"},
                restricted_at = clock_timestamp()
                WHERE lower(email) = lower(${email})`
          );

          await emailSuppressionService.suppressEmail(email, "all_promotional", "user_rights_restriction");
          await consentService.withdrawConsent({ email, purpose: "launch_updates" });
        }

        await db
          .update(privacyRightsRequestsTable)
          .set({ status: "completed", completedAt: sql`clock_timestamp()` })
          .where(eq(privacyRightsRequestsTable.verificationTokenHash, tokenHash));

        return {
          executed: true,
          requestType: input.requestType,
          recordStatus: "processing_restricted",
          message: "Processing restriction has been applied to records associated with this address.",
        };
      }

      case "correction": {
        let updated = false;
        if (email && typeof input.details?.preferredUsername === "string") {
          const newUsername = input.details.preferredUsername.trim().toLowerCase();
          // Check username availability
          const existingUser = await db
            .select({ id: usersTable.id })
            .from(usersTable)
            .where(sql`lower(${usersTable.username}) = ${newUsername}`)
            .limit(1);

          if (existingUser.length === 0) {
            const res = await db.execute(
              sql`UPDATE preregistrations SET username = ${newUsername} WHERE lower(email) = lower(${email})`
            );
            updated = Number(res.rowCount ?? 0) > 0;
          }
        }

        await db
          .update(privacyRightsRequestsTable)
          .set({ status: "completed", completedAt: sql`clock_timestamp()` })
          .where(eq(privacyRightsRequestsTable.verificationTokenHash, tokenHash));

        return {
          executed: updated,
          requestType: "correction",
          message: updated
            ? "Record corrections have been saved successfully."
            : "No update was made or requested username was unavailable.",
        };
      }

      case "access": {
        // 2. Check active user
        if (email) {
          const users = await db
            .select({ id: usersTable.id, username: usersTable.username, createdAt: usersTable.createdAt })
            .from(usersTable)
            .where(sql`lower(${usersTable.email}) = lower(${email})`)
            .limit(1);

          if (users.length > 0) {
            return {
              executed: true,
              requestType: "access",
              recordStatus: "active_account",
              message:
                "An active account exists for this address. Please sign in and navigate to Settings > Export Account to download your complete data archive.",
            };
          }

          // 3. Check preregistrations
          const preregs = await db
            .select({
              username: preregistrationsTable.username,
              perks: preregistrationsTable.perks,
              consentedAt: preregistrationsTable.launchUpdatesConsentedAt,
              unsubscribedAt: preregistrationsTable.unsubscribedAt,
              createdAt: preregistrationsTable.createdAt,
            })
            .from(preregistrationsTable)
            .where(sql`lower(${preregistrationsTable.email}) = lower(${email})`)
            .limit(1);

          if (preregs.length > 0) {
            return {
              executed: true,
              requestType: "access",
              recordStatus: "unbound_preregistration",
              details: {
                username: preregs[0].username,
                perks: preregs[0].perks,
                consentedAt: preregs[0].consentedAt,
                unsubscribedAt: preregs[0].unsubscribedAt,
                createdAt: preregs[0].createdAt,
              },
              message: "An unbound launch pre-registration record exists for this address.",
            };
          }
          const waitlist = await db.execute(sql`SELECT status,created_at FROM waitlist WHERE lower(email)=lower(${email}) LIMIT 1`);
          if (waitlist.rows[0]) return { executed: true, requestType: 'access', recordStatus: 'unbound_waitlist',
            details: { status: waitlist.rows[0].status, createdAt: waitlist.rows[0].created_at }, message: 'A waitlist record exists for this address.' };
        }

        // 1. Check deletion journal
        const journal = await db
          .select({ erasedAt: deletionJournalTable.erasedAt })
          .from(deletionJournalTable)
          .where(eq(deletionJournalTable.stableIdentityDigest, emailHash))
          .orderBy(sql`${deletionJournalTable.erasedAt} DESC`)
          .limit(1);

        if (journal.length > 0) {
          return {
            executed: true,
            requestType: "access",
            recordStatus: "previously_erased",
            erasedAt: journal[0].erasedAt,
            message: `Records associated with this identity were permanently erased on ${journal[0].erasedAt}. This is historical erasure evidence.`,
          };
        }

        return {
          executed: true,
          requestType: "access",
          recordStatus: "no_records_found",
          message: "No active or journaled records exist for this identity.",
        };
      }
    }
  }

  /** Restrict account processing for an authenticated user */
  async restrictAccount(userId: string, reason?: string): Promise<boolean> {
    return runInDatabaseTransaction(async () => {
    const res = await db.execute(
      sql`UPDATE users SET processing_restricted = true,
          restriction_reason = ${reason || "user_request"},
          restricted_at = clock_timestamp()
          WHERE id = ${userId}::uuid RETURNING email`
    );
    const email = res.rows[0]?.email;
    if (typeof email === 'string') {
      await emailSuppressionService.suppressEmail(email, 'all_promotional', 'user_processing_restriction');
      await consentService.withdrawConsent({ subjectId: userId, email, purpose: 'launch_updates' });
    }
    return Number(res.rowCount ?? 0) > 0;
    });
  }

  async withdrawAccountConsent(userId: string, purpose: string): Promise<boolean> {
    return runInDatabaseTransaction(async tx => {
      const [user] = await tx.select({ email: usersTable.email }).from(usersTable).where(eq(usersTable.id, userId)).for('update');
      if (!user) return false;
      await consentService.withdrawConsent({ subjectId: userId, email: user.email, purpose: purpose === 'all_promotional' ? 'launch_updates' : purpose });
      if (purpose === 'launch_updates' || purpose === 'all_promotional') {
        await emailSuppressionService.suppressEmail(user.email, purpose, 'user_consent_withdrawal');
        await tx.update(preregistrationsTable).set({ unsubscribedAt: sql`clock_timestamp()` })
          .where(sql`lower(${preregistrationsTable.email})=lower(${user.email})`);
      }
      return true;
    });
  }

  /** Lift account processing restriction for an authenticated user */
  async unrestrictAccount(userId: string): Promise<boolean> {
    const res = await db.execute(
      sql`UPDATE users SET processing_restricted = false,
          restriction_reason = NULL,
          restricted_at = NULL
          WHERE id = ${userId}::uuid`
    );
    return Number(res.rowCount ?? 0) > 0;
  }
}

export const privacyRightsService = new PrivacyRightsService();
