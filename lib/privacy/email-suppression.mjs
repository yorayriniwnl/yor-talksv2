import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export class PromotionalEmailDisabledError extends Error {
  constructor(message = "Promotional email dispatch is disabled for this deployment") {
    super(message);
    this.name = "PromotionalEmailDisabledError";
  }
}

export class EmailSuppressedError extends Error {
  constructor(purpose) {
    super(`Email is suppressed for purpose: ${purpose}`);
    this.name = "EmailSuppressedError";
  }
}

export class ConsentMissingError extends Error {
  constructor(purpose) {
    super(`Active consent is missing or withdrawn for purpose: ${purpose}`);
    this.name = "ConsentMissingError";
  }
}

export class EmailSuppressionEngine {
  constructor(options = {}) {
    this.secret = options.secret || process.env.CONTACT_SHIELD_SECRET || "development-suppression-secret-32-chars-min";
    this.promotionalEnabled = options.promotionalEnabled ?? (process.env.PROMOTIONAL_EMAIL_ENABLED === "true");
    this.store = options.store || null;
  }

  hashEmail(email) {
    return createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
  }

  createUnsubscribeToken(email, purpose = "launch_updates") {
    const normalized = email.trim().toLowerCase();
    const signature = createHmac("sha256", this.secret)
      .update(`${normalized}:${purpose}`)
      .digest("hex");
    return `${purpose}.${signature}`;
  }

  verifyUnsubscribeToken(email, token) {
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

  async isSuppressed(email, purpose = "launch_updates") {
    if (!this.store) return false;
    return this.store.isSuppressed(this.hashEmail(email), purpose);
  }

  async checkCanEnqueue(email, purpose = "launch_updates") {
    if (!this.promotionalEnabled) {
      return { allowed: false, reason: "promotional_email_disabled" };
    }
    if (await this.isSuppressed(email, purpose)) {
      return { allowed: false, reason: "email_suppressed" };
    }
    if (this.store && !(await this.store.hasConsent(this.hashEmail(email), purpose))) {
      return { allowed: false, reason: "consent_missing_or_withdrawn" };
    }
    return { allowed: true };
  }

  async checkCanProcess(email, purpose = "launch_updates") {
    return this.checkCanEnqueue(email, purpose);
  }

  async checkCanSend(email, purpose = "launch_updates") {
    return this.checkCanEnqueue(email, purpose);
  }
}
