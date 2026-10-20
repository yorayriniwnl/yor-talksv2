import { createHash, randomBytes } from "node:crypto";
import { db } from "@workspace/db";
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
import { RedisRepository } from "../repositories/redis-repository.js";
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
    private readonly emailService: EmailService = new EmailService(),
    private readonly redisRepository: RedisRepository = new RedisRepository()
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
    const ttlSeconds = 900; // 15 minutes

    // Store in Redis for fast verification and single-use invalidation
    await this.redisRepository.setStrict(
      `privacy_challenge:${tokenHash}`,
      JSON.stringify({ email: normalizedEmail, emailHash, purpose }),
      ttlSeconds
    ).catch(() => {});

    // Also store audit record in database
    await db
      .insert(privacyRightsRequestsTable)
      .values({
        requestType: purpose,
        emailHash,
        status: "pending_verification",
        verificationTokenHash: tokenHash,
        verificationExpiresAt: sql`clock_timestamp() + interval '15 minutes'`,
        details: { purpose },
      })
      .catch((err) => {
        logger.error({ err }, "Failed to record privacy rights request");
      });

    // Send verification email
    try {
      await this.emailService.sendPrivacyChallengeEmail(normalizedEmail, token, purpose);
    } catch (err) {
      logger.error({ err }, "Failed to send privacy challenge email");
    }

    // Always generic response
    return { challengeInitiated: true };
  }

  /** Verifies a single-use challenge token */
  async verifyChallengeToken(
    token: string
  ): Promise<{ valid: boolean; email?: string; emailHash?: string; purpose?: PrivacyRequestType }> {
    if (!token || typeof token !== "string" || token.length < 32) {
      return { valid: false };
    }
    const tokenHash = this.hashToken(token);

    // Check Redis first
    const cached = await this.redisRepository.getStrict(`privacy_challenge:${tokenHash}`).catch(() => null);
    if (cached) {
      try {
        const payload = JSON.parse(cached);
        return { valid: true, email: payload.email, emailHash: payload.emailHash, purpose: payload.purpose };
      } catch {
        return { valid: false };
      }
    }

    // Fallback to database
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

    return {
      valid: true,
      emailHash: rows[0].emailHash,
      purpose: rows[0].requestType as PrivacyRequestType,
    };
  }

  /** Executes verified privacy rights request */
  async executeRightsRequest(input: {
    token: string;
    requestType: PrivacyRequestType;
    details?: Record<string, unknown>;
  }): Promise<RightsRequestResult> {
    const verified = await this.verifyChallengeToken(input.token);
    if (!verified.valid || !verified.emailHash) {
      return {
        executed: false,
        requestType: input.requestType,
        message: "Invalid, expired, or previously consumed verification challenge token",
      };
    }

    const email = verified.email;
    const emailHash = verified.emailHash;
    const tokenHash = this.hashToken(input.token);

    // Invalidate single-use challenge token
    await this.redisRepository.delStrict(`privacy_challenge:${tokenHash}`).catch(() => {});
    await db
      .update(privacyRightsRequestsTable)
      .set({
        status: "verified",
        verifiedAt: sql`clock_timestamp()`,
      })
      .where(eq(privacyRightsRequestsTable.verificationTokenHash, tokenHash))
      .catch(() => {});

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
          await db.execute(sql`DELETE FROM waitlist WHERE lower(email) = lower(${email})`).catch(() => {});
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
            message: `Records associated with this identity were permanently erased on ${journal[0].erasedAt}. No active account data remains.`,
          };
        }

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
    const res = await db.execute(
      sql`UPDATE users SET processing_restricted = true,
          restriction_reason = ${reason || "user_request"},
          restricted_at = clock_timestamp()
          WHERE id = ${userId}::uuid`
    );
    return Number(res.rowCount ?? 0) > 0;
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
