import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export class PrivacyRightsEngine {
  constructor(options = {}) {
    this.tokenTtlMs = options.tokenTtlMs || 15 * 60 * 1000; // 15 minutes
    this.store = options.store || new InMemoryPrivacyStore();
  }

  hashEmail(email) {
    return createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
  }

  hashToken(token) {
    return createHash("sha256").update(token).digest("hex");
  }

  /**
   * Challenge initiation. Always returns a generic confirmation.
   * Knowledge of an email address must NEVER reveal whether records exist.
   */
  async initiateChallenge(email, purpose = "access") {
    const normalizedEmail = email.trim().toLowerCase();
    const emailHash = this.hashEmail(normalizedEmail);
    const token = randomBytes(32).toString("hex");
    const tokenHash = this.hashToken(token);
    const expiresAt = Date.now() + this.tokenTtlMs;

    await this.store.saveChallenge({
      tokenHash,
      email: normalizedEmail,
      emailHash,
      purpose,
      expiresAt,
    });

    return {
      challengeInitiated: true,
      // The token is sent ONLY via email to the address owner, never in the HTTP response
      _deliveryPayloadForEmailOnly: { email: normalizedEmail, token, expiresAt },
    };
  }

  async verifyChallengeToken(token) {
    if (!token || typeof token !== "string" || token.length < 32) {
      return { valid: false, reason: "malformed_token" };
    }
    const tokenHash = this.hashToken(token);
    const challenge = await this.store.getChallenge(tokenHash);

    if (!challenge) {
      return { valid: false, reason: "challenge_not_found" };
    }
    if (challenge.consumed) {
      return { valid: false, reason: "challenge_already_consumed" };
    }
    if (Date.now() > challenge.expiresAt) {
      return { valid: false, reason: "challenge_expired" };
    }

    return {
      valid: true,
      email: challenge.email,
      emailHash: challenge.emailHash,
      purpose: challenge.purpose,
      tokenHash,
    };
  }

  async executeRightsRequest({ token, requestType, details = {} }) {
    const verified = await this.verifyChallengeToken(token);
    if (!verified.valid) {
      return {
        executed: false,
        requestType,
        error: verified.reason,
        message: "Invalid, expired, or previously consumed verification challenge token",
      };
    }

    // Mark single-use token consumed
    await this.store.consumeChallenge(verified.tokenHash);

    const email = verified.email;
    const emailHash = verified.emailHash;

    switch (requestType) {
      case "erasure": {
        // Protection against account takeover: An unauthenticated email challenge
        // cannot delete an active user account. Full deletion requires signed-in password confirmation.
        const activeUser = await this.store.findActiveUserByEmail(email);
        if (activeUser) {
          return {
            executed: false,
            requestType: "erasure",
            recordStatus: "active_account_requires_authenticated_deletion",
            message:
              "An active registered account exists for this address. To prevent unauthorized deletion, account erasure must be requested directly while signed in via Settings > Delete Account with password confirmation.",
          };
        }

        // Erase unbound records (preregistrations, waitlist)
        await this.store.eraseUnboundRecords(email);
        await this.store.suppressEmail(emailHash, "all_promotional", "user_rights_erasure");
        await this.store.withdrawConsent(emailHash, "all");

        return {
          executed: true,
          requestType: "erasure",
          recordStatus: "unbound_records_erased",
          message: "All unbound records have been permanently erased and communication preferences suppressed.",
        };
      }

      case "restriction":
      case "objection": {
        await this.store.restrictProcessing(email, details.reason || "user_objection");
        await this.store.suppressEmail(emailHash, "all_promotional", "user_rights_restriction");
        await this.store.withdrawConsent(emailHash, "all");

        return {
          executed: true,
          requestType,
          recordStatus: "processing_restricted",
          message: "Processing restriction has been applied to records associated with this address.",
        };
      }

      case "correction": {
        const result = await this.store.correctUnboundRecord(email, details);
        return {
          executed: result.updated,
          requestType: "correction",
          message: result.updated
            ? "Record corrections have been saved successfully."
            : "No update was made or requested values were unavailable.",
        };
      }

      case "access": {
        // 1. Check deletion journal
        const journalEntry = await this.store.findDeletionJournal(emailHash);
        if (journalEntry) {
          return {
            executed: true,
            requestType: "access",
            recordStatus: "previously_erased",
            erasedAt: journalEntry.erasedAt,
            message: `Records associated with this identity were permanently erased on ${journalEntry.erasedAt}. No active account data remains.`,
          };
        }

        // 2. Check active user
        const activeUser = await this.store.findActiveUserByEmail(email);
        if (activeUser) {
          return {
            executed: true,
            requestType: "access",
            recordStatus: "active_account",
            message:
              "An active account exists for this address. Please sign in and navigate to Settings > Export Account to download your complete data archive.",
          };
        }

        // 3. Check unbound preregistrations
        const prereg = await this.store.findPreregistration(email);
        if (prereg) {
          return {
            executed: true,
            requestType: "access",
            recordStatus: "unbound_preregistration",
            details: {
              username: prereg.username,
              perks: prereg.perks,
              consentedAt: prereg.launchUpdatesConsentedAt,
              unsubscribedAt: prereg.unsubscribedAt,
            },
            message: "An unbound launch pre-registration record exists for this address.",
          };
        }

        return {
          executed: true,
          requestType: "access",
          recordStatus: "no_records_found",
          message: "No active or journaled records exist for this identity.",
        };
      }

      default:
        return {
          executed: false,
          requestType,
          message: `Unsupported request type: ${requestType}`,
        };
    }
  }
}

export class InMemoryPrivacyStore {
  constructor() {
    this.challenges = new Map();
    this.activeUsers = new Map();
    this.preregistrations = new Map();
    this.deletionJournal = new Map();
    this.suppressions = new Set();
    this.consents = new Map();
  }

  async saveChallenge(data) {
    this.challenges.set(data.tokenHash, { ...data, consumed: false });
  }

  async getChallenge(tokenHash) {
    return this.challenges.get(tokenHash) || null;
  }

  async consumeChallenge(tokenHash) {
    const item = this.challenges.get(tokenHash);
    if (item) item.consumed = true;
  }

  async findActiveUserByEmail(email) {
    return this.activeUsers.get(email.trim().toLowerCase()) || null;
  }

  async eraseUnboundRecords(email) {
    this.preregistrations.delete(email.trim().toLowerCase());
  }

  async suppressEmail(emailHash, purpose, reason) {
    this.suppressions.add(`${emailHash}:${purpose}`);
  }

  async withdrawConsent(emailHash, purpose) {
    this.consents.set(emailHash, { granted: false, withdrawnAt: new Date().toISOString() });
  }

  async restrictProcessing(email, reason) {
    const user = this.activeUsers.get(email.trim().toLowerCase());
    if (user) {
      user.processingRestricted = true;
      user.restrictionReason = reason;
    }
  }

  async correctUnboundRecord(email, details) {
    const record = this.preregistrations.get(email.trim().toLowerCase());
    if (!record) return { updated: false };
    if (details.preferredUsername) {
      record.username = details.preferredUsername;
      return { updated: true };
    }
    return { updated: false };
  }

  async findDeletionJournal(emailHash) {
    return this.deletionJournal.get(emailHash) || null;
  }

  async findPreregistration(email) {
    return this.preregistrations.get(email.trim().toLowerCase()) || null;
  }
}
