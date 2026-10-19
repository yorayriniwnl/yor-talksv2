import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import { authenticator } from "otplib";
import { randomUUID, randomBytes, randomInt } from "node:crypto";
import { env } from "../config/env.js";
import { logger } from "../lib/logger.js";
import { RedisRepository } from "../repositories/redis-repository.js";
import { UserRepository } from "../repositories/user-repository.js";
import { db } from "@workspace/db";
import { userFollowsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { SecurityService } from "./security-service.js";
import { EmailService } from "./email-service.js";
import type { AuthTokens, UserRecord } from "../types/index.js";
import { isAllowedEmail } from "../validators/auth.js";
import { getContactIdentifierDigest } from "../utils/contact-shield.js";
import { decryptSecret, encryptSecret } from "../lib/secret-box.js";
import { z } from 'zod';

export class TooManyAttemptsError extends Error {}
export type LoginApprovalChallenge = {
  challengeId: string;
  matchingNumber: number;
  expiresAt: string;
};

type StoredLoginApprovalChallenge = LoginApprovalChallenge & {
  schemaVersion: 1;
  expiresAtMs: number;
  userId: string;
  authVersion: number;
  status: "pending" | "approved";
  attempts: number;
  createdAt: string;
  approvedAt?: string;
  emailOtpKey?: string;
  emailOtpChallengeId?: string;
  googleSubject?: string;
  googleEmail?: string;
};

const emailOtpSchema = z.object({
  schemaVersion: z.literal(1), challengeId: z.string().uuid(), userId: z.string().uuid(),
  email: z.string().email().refine(value => value === value.trim().toLowerCase()),
  authVersion: z.number().int().min(0).max(2147483647), codeHash: z.string().regex(/^[a-f0-9]{64}$/),
  attempts: z.number().int().min(0).max(5), expiresAt: z.number().int().positive().safe(),
  status: z.enum(['issued', 'approval']), approvalChallengeId: z.string().uuid().optional(),
}).refine(state => state.status !== 'approval' || Boolean(state.approvalChallengeId));

const loginApprovalSchema = z.object({
  schemaVersion: z.literal(1), challengeId: z.string().uuid(), userId: z.string().uuid(),
  authVersion: z.number().int().min(0).max(2147483647), attempts: z.number().int().min(0).max(5),
  matchingNumber: z.number().int().min(1).max(99), expiresAt: z.string().datetime(),
  expiresAtMs: z.number().int().positive().safe(), createdAt: z.string().datetime(),
  status: z.enum(['pending', 'approved']), approvedAt: z.string().datetime().optional(),
  emailOtpKey: z.string().regex(/^email-login-otp:[a-f0-9]{64}$/).optional(), emailOtpChallengeId: z.string().uuid().optional(),
  googleSubject: z.string().min(1).optional(), googleEmail: z.string().email().optional(),
}).refine(state => Date.parse(state.expiresAt) === state.expiresAtMs
  && Boolean(state.emailOtpKey) === Boolean(state.emailOtpChallengeId)
  && Boolean(state.googleSubject) === Boolean(state.googleEmail));

export type LoginApprovalChallengeStatus = {
  challengeId: string;
  status: "pending" | "approved" | "expired";
  expiresAt: string;
};

export class TwoFactorRequiredError extends Error {
  constructor(message: string, public readonly challenge?: LoginApprovalChallenge) {
    super(message);
    this.name = "TwoFactorRequiredError";
  }
}
export class EmailOtpInvalidError extends Error {}
export class EmailVerificationRequiredError extends Error {}
export class GoogleSignInNotConfiguredError extends Error {}
export class GoogleLinkVerificationRequiredError extends Error {}
export class RegistrationNotAllowedError extends Error {}

/**
 * For Google sign-in, Gmail addresses and hosted-domain (Workspace) addresses
 * can be treated as Google-authoritative. email_verified on a third-party
 * Google Account does NOT establish current ownership of its email address.
 */
export function isGoogleAuthoritativeEmail(email: string, hostedDomain?: string): boolean {
  const normalized = email.trim().toLowerCase();
  const lastAtIndex = normalized.lastIndexOf("@");
  if (lastAtIndex <= 0) return false;
  const domain = normalized.slice(lastAtIndex + 1);
  if (!domain) return false;
  const normalizedHd = hostedDomain ? hostedDomain.trim().toLowerCase().replace(/\.$/, "") : undefined;
  return domain === "gmail.com" || domain === "googlemail.com"
    || Boolean(normalizedHd && normalizedHd === domain);
}
export class UserAlreadyExistsError extends Error {}

export class AuthService {
  private readonly userRepository: UserRepository;
  private readonly redisRepository: RedisRepository;
  private readonly securityService: SecurityService;
  private readonly emailService: EmailService;

  constructor(
    userRepository: UserRepository,
    redisRepository = new RedisRepository(),
    securityService?: SecurityService,
    emailService = new EmailService(),
  ) {
    this.userRepository = userRepository;
    this.redisRepository = redisRepository;
    this.securityService = securityService ?? new SecurityService(redisRepository);
    this.emailService = emailService;
  }

  async register(input: {
    username: string;
    email: string;
    password: string;
    fullName: string;
    acceptedTerms: boolean;
    confirmedAge: boolean;
  }): Promise<{ user: UserRecord; verificationToken?: string }> {
    if (input.acceptedTerms !== true || input.confirmedAge !== true) {
      throw new RegistrationNotAllowedError("You must accept the current terms and confirm the minimum age");
    }
    const email = input.email.trim().toLowerCase();
    if (!isAllowedEmail(email)) {
      throw new RegistrationNotAllowedError("This email domain is not allowed for this deployment");
    }

    const existingEmail = await this.userRepository.findByEmail(email);
    const normalizedUsername = input.username.trim().toLowerCase();
    const existingUsername = await this.userRepository.findByUsername(normalizedUsername);
    const existing = existingEmail ?? existingUsername;
    
    if (existing) {
      throw new UserAlreadyExistsError("An account already exists for that email or username");
    }

    const passwordHash = await bcrypt.hash(input.password, 10);
    const consentTimestamp = new Date().toISOString();
    const user: UserRecord = {
      id: randomUUID(),
      username: normalizedUsername,
      email,
      passwordHash,
      termsVersion: env.TERMS_VERSION,
      termsAcceptedAt: consentTimestamp,
      ageConfirmedAt: consentTimestamp,
      fullName: input.fullName,
      bio: "",
      avatarUrl: null,
      role: "user",
      permissions: ["read:profile", "write:post"],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      settings: {
        theme: "light",
        notificationsEnabled: true,
        privateAccount: false,
        allowMentions: true,
        contentFilter: "regular",
        onboardingCompleted: false,
      },
      emailVerified: false,
      contactIdentityDigest: getContactIdentifierDigest("email", email),
      passwordResetRequired: false,
      lastLoginAt: null,
      devices: [],
      blockedUsers: [],
      mutedUsers: [],
      privacy: {
        profileVisibility: "public",
        messageRequests: true,
        allowDmFromStrangers: true,
      },
    };

    await this.userRepository.create(user);
    let verificationToken: string | undefined;
    try {
      verificationToken = await this.requestEmailVerification(user.id);
    } catch (error) {
      // Do not leave an account that can never complete onboarding when the
      // production email provider rejects the first verification message.
      await this.userRepository.deleteById(user.id);
      throw error;
    }
    return {
      user,
      verificationToken,
    };
  }

  async login(input: { identifier: string; password: string; totpCode?: string; challengeId?: string }): Promise<{ user: UserRecord; tokens: AuthTokens }> {
    const normalizedIdentifier = input.identifier.trim().toLowerCase();
    if (await this.securityService.detectAbuse(normalizedIdentifier, "login_failure")) {
      throw new TooManyAttemptsError("Too many failed login attempts. Please try again later.");
    }

    const byEmail = await this.userRepository.findByEmail(normalizedIdentifier);
    const user = byEmail ?? await this.userRepository.findByUsername(normalizedIdentifier);
    if (!user) {
      this.securityService.createAuditEvent("login_failure", "Unknown identifier", normalizedIdentifier);
      throw new Error("Invalid credentials");
    }

    if (!isAllowedEmail(user.email)) {
      this.securityService.createAuditEvent("login_failure", "Disallowed account", normalizedIdentifier);
      throw new Error("Invalid credentials");
    }

    const valid = await bcrypt.compare(input.password, user.passwordHash);
    if (!valid) {
      this.securityService.createAuditEvent("login_failure", "Wrong password", normalizedIdentifier);
      throw new Error("Invalid credentials");
    }

    if (!user.emailVerified) {
      this.securityService.createAuditEvent("login_failure", "Email not verified", normalizedIdentifier);
        throw new EmailVerificationRequiredError("Verify your email before signing in");
    }
    this.assertAccountActive(user);

    const totpSecret = await this.readTotpSecret(user);
    if (totpSecret) {
      if (!input.totpCode) {
        throw new TwoFactorRequiredError(
          "Approve this sign-in in your Yor app",
          await this.createLoginApprovalChallenge(user),
        );
      }
      if (!authenticator.check(input.totpCode, totpSecret)) {
        this.securityService.createAuditEvent("login_failure", "Wrong 2FA code", normalizedIdentifier);
        throw new Error("Invalid two-factor code");
      }
      if (input.challengeId) await this.cancelLoginApprovalChallenge(user.id, input.challengeId);
    }

    return this.createSession(user);
  }

  async loginWithGoogle(input: { credential: string; totpCode?: string; challengeId?: string }): Promise<{ user: UserRecord; tokens: AuthTokens }> {
    if (!env.GOOGLE_CLIENT_ID) {
      throw new GoogleSignInNotConfiguredError("Google sign-in is not configured");
    }

    const googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID);
    let payload;
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: input.credential,
        audience: env.GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } catch {
      this.securityService.createAuditEvent("login_failure", "Invalid or expired Google credential");
      throw new Error("The Google credential is invalid or expired");
    }

    if (!payload) {
      this.securityService.createAuditEvent("login_failure", "Missing Google credential payload");
      throw new Error("The Google credential is invalid or expired");
    }

    if (payload.aud) {
      const aud: unknown = payload.aud;
      const matchesAudience = typeof aud === "string" ? aud === env.GOOGLE_CLIENT_ID : Array.isArray(aud) && (aud as string[]).includes(env.GOOGLE_CLIENT_ID);
      if (!matchesAudience) {
        this.securityService.createAuditEvent("login_failure", "Google credential audience mismatch", payload.email);
        throw new Error("The Google credential audience is invalid");
      }
    }

    if (payload.iss && payload.iss !== "accounts.google.com" && payload.iss !== "https://accounts.google.com") {
      this.securityService.createAuditEvent("login_failure", "Invalid Google token issuer", payload.email);
      throw new Error("The Google credential issuer is invalid");
    }

    if (typeof payload.exp === "number" && payload.exp <= Math.floor(Date.now() / 1000)) {
      this.securityService.createAuditEvent("login_failure", "Expired Google token", payload.email);
      throw new Error("The Google credential is invalid or expired");
    }

    const googleSubject = payload.sub?.trim();
    const googleEmail = payload.email?.trim().toLowerCase();
    if (!googleSubject || !googleEmail || payload.email_verified !== true || !isAllowedEmail(googleEmail)) {
      this.securityService.createAuditEvent("login_failure", "Disallowed, incomplete, or unverified Google account", googleEmail || "unknown");
      throw new Error("Use a verified Google account from an allowed email domain");
    }

    if (await this.securityService.detectAbuse(googleEmail, "login_failure")) {
      throw new TooManyAttemptsError("Too many failed attempts. Try again later.");
    }

    const linkedUser = await this.userRepository.findByGoogleSubject(googleSubject);
    const user = linkedUser ?? await this.userRepository.findByEmail(googleEmail);
    if (!user) {
      this.securityService.createAuditEvent("login_failure", "No Yor account for Google identity", googleEmail);
      throw new Error("No Yor account exists for this Google email. Create an account first.");
    }
    if (user.email.trim().toLowerCase() !== googleEmail || (user.googleSubject && user.googleSubject !== googleSubject)) {
      this.securityService.createAuditEvent("login_failure", "Google identity does not match Yor account", googleEmail);
      throw new Error("Google identity does not match the Yor account");
    }
    // A third-party Google Account may retain email_verified after losing
    // ownership of that mailbox. Never silently link it to a Yor account.
    if (!linkedUser && !isGoogleAuthoritativeEmail(googleEmail, payload.hd)) {
      this.securityService.createAuditEvent("login_failure", "Untrusted Google email automatic linking rejected", googleEmail);
      throw new GoogleLinkVerificationRequiredError(
        "This Google email cannot be linked automatically. Sign in using your Yor password or email code.",
      );
    }
    this.assertAccountActive(user);

    // Do not write the Google subject until the account's second factor has
    // succeeded. Persist the verified identity inside the short-lived pending
    // device approval so completion can link it securely as well.
    const totpSecret = await this.readTotpSecret(user);
    if (totpSecret) {
      if (!input.totpCode) {
        throw new TwoFactorRequiredError(
          "Approve this sign-in in your Yor app",
          await this.createLoginApprovalChallenge(user, { subject: googleSubject, email: googleEmail }),
        );
      }
      if (!authenticator.check(input.totpCode, totpSecret)) {
        this.securityService.createAuditEvent("login_failure", "Invalid two-factor code for Google login", googleEmail);
        throw new Error("Invalid two-factor code");
      }
      if (input.challengeId) await this.cancelLoginApprovalChallenge(user.id, input.challengeId);
    }

    const finalUser = await this.finishGoogleLink(user, googleSubject, googleEmail);
    this.securityService.createAuditEvent("login_success", "Google sign-in succeeded", googleEmail);
    return this.createSession(finalUser, { emailVerified: true });
  }

  async requestEmailOtp(email: string): Promise<boolean> {
    const normalizedEmail = email.trim().toLowerCase();
    if (!isAllowedEmail(normalizedEmail)) {
      throw new EmailOtpInvalidError("This email domain is not allowed for this deployment");
    }
    const user = await this.userRepository.findByEmail(normalizedEmail);
    if (!user) {
      // Avoid account enumeration. The controller returns the same accepted
      // response whether the address is registered or not.
      return false;
    }

    const keyHash = await this.redisRepository.hashToken(normalizedEmail);
    const key = `email-login-otp:${keyHash}`;
    const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
    const expiresAt = Date.now() + 5 * 60 * 1000;
    const challengeId = randomUUID();
    const reserved = await this.redisRepository.reserveExpiringValueStrict(key, JSON.stringify({
      schemaVersion: 1, challengeId, status: 'issued', email: normalizedEmail,
      userId: user.id,
      authVersion: user.authVersion ?? 0,
      codeHash: await this.redisRepository.hashToken(code),
      attempts: 0,
      expiresAt,
    }), expiresAt);
    if (!reserved) {
      throw new TooManyAttemptsError("A sign-in code was already sent. Please wait before requesting another.");
    }
    try {
      await this.emailService.sendEmailLoginCode(user.email, code);
    } catch (error) {
      await this.redisRepository.deleteChallengeStrict(key, challengeId);
      throw error;
    }
    logger.info({ userId: user.id }, "Email login code dispatched");
    return true;
  }

  async loginWithEmailOtp(input: { email: string; code: string; totpCode?: string; challengeId?: string }): Promise<{ user: UserRecord; tokens: AuthTokens }> {
    const normalizedEmail = input.email.trim().toLowerCase();
    const keyHash = await this.redisRepository.hashToken(normalizedEmail);
    const key = `email-login-otp:${keyHash}`;
    const raw = await this.redisRepository.getStrict(key);
    if (!raw) {
      throw new EmailOtpInvalidError("The sign-in code is invalid or expired");
    }

    let state: z.infer<typeof emailOtpSchema>;
    try {
      state = emailOtpSchema.parse(JSON.parse(raw));
    } catch {
      throw new EmailOtpInvalidError("The sign-in code is invalid or expired");
    }
    if (state.email !== normalizedEmail || state.expiresAt <= Date.now() || state.attempts >= 5) {
      throw new EmailOtpInvalidError("The sign-in code is invalid or expired");
    }

    const suppliedHash = await this.redisRepository.hashToken(input.code);
    const reservation = { key, challengeId: state.challengeId, userId: state.userId,
      email: normalizedEmail, authVersion: state.authVersion, codeHash: suppliedHash };
    if (suppliedHash !== state.codeHash) {
      await this.redisRepository.redeemEmailOtpStrict({ ...reservation, action: 'attempt' });
      throw new EmailOtpInvalidError("The sign-in code is invalid or expired");
    }

    const user = await this.userRepository.findById(state.userId);
    if (!user || !this.isAccountActive(user) || user.email.trim().toLowerCase() !== normalizedEmail || !isAllowedEmail(user.email)
      || (user.authVersion ?? 0) !== state.authVersion) {
      throw new EmailOtpInvalidError("The sign-in code is invalid or expired");
    }
    this.assertAccountActive(user);
    const totpSecret = await this.readTotpSecret(user);
    if (totpSecret) {
      if (!input.totpCode) {
        const candidate = this.buildLoginApprovalChallenge(user, state.expiresAt, { key, challengeId: state.challengeId });
        const approvalRaw = await this.redisRepository.redeemEmailOtpStrict({ ...reservation, action: 'approval',
          approval: { challengeId: candidate.challengeId, value: JSON.stringify(candidate) } });
        if (!approvalRaw) throw new EmailOtpInvalidError("The sign-in code is invalid or expired");
        const challenge = loginApprovalSchema.parse(JSON.parse(approvalRaw));
        throw new TwoFactorRequiredError(
          "Approve this sign-in in your Yor app",
          this.publicLoginApprovalChallenge(challenge),
        );
      }
      if (!authenticator.check(input.totpCode, totpSecret)) {
        throw new EmailOtpInvalidError("Invalid two-factor authentication code");
      }
    }

    // TOTP and device approval consume the same first-factor authority. After
    // consumption a downstream failure burns the code; requesting a new code
    // is safer than restoring a credential whose completion is uncertain.
    if (!(await this.redisRepository.redeemEmailOtpStrict({ ...reservation, action: 'consume' }))) {
      throw new EmailOtpInvalidError("The sign-in code is invalid or expired");
    }
    return this.createSession(user, { emailVerified: true });
  }

  async listPendingTwoFactorChallenges(userId: string): Promise<LoginApprovalChallenge[]> {
    const indexKey = this.loginApprovalIndexKey(userId);
    const ids = await this.redisRepository.getSetStrict(indexKey);
    const now = Date.now();
    const pending = await Promise.all(ids.map(async (challengeId) => {
      const challenge = await this.readLoginApprovalChallenge(challengeId);
      if (!challenge || challenge.userId !== userId) {
        if (!challenge) await this.redisRepository.removeFromSetStrict(indexKey, challengeId);
        return null;
      }
      if (Date.parse(challenge.expiresAt) <= now || challenge.status !== "pending" || challenge.attempts >= 5) {
        if (Date.parse(challenge.expiresAt) <= now) {
          await this.removeLoginApprovalChallenge(challenge);
        }
        return null;
      }
      return this.publicLoginApprovalChallenge(challenge);
    }));

    return pending
      .filter((challenge): challenge is LoginApprovalChallenge => Boolean(challenge))
      .sort((a, b) => Date.parse(a.expiresAt) - Date.parse(b.expiresAt));
  }

  async getTwoFactorChallengeStatus(challengeId: string): Promise<LoginApprovalChallengeStatus | null> {
    const challenge = await this.readLoginApprovalChallenge(challengeId);
    if (!challenge) return null;
    if (Date.parse(challenge.expiresAt) <= Date.now()) {
      await this.removeLoginApprovalChallenge(challenge);
      return { challengeId, status: "expired", expiresAt: challenge.expiresAt };
    }
    return { challengeId, status: challenge.status, expiresAt: challenge.expiresAt };
  }

  async approveTwoFactorChallenge(userId: string, challengeId: string, matchingNumber: number): Promise<boolean> {
    const challenge = await this.readLoginApprovalChallenge(challengeId);
    if (!challenge || challenge.userId !== userId || challenge.status !== "pending") return false;
    const user = await this.userRepository.findById(userId);
    if (!user || !this.isAccountActive(user) || (user.authVersion ?? 0) !== challenge.authVersion
      || !(await this.readTotpSecret(user))) return false;
    return this.redisRepository.approveLoginChallengeStrict(challengeId, userId, challenge.authVersion, matchingNumber);
  }

  async denyTwoFactorChallenge(userId: string, challengeId: string): Promise<boolean> {
    const challenge = await this.readLoginApprovalChallenge(challengeId);
    if (!challenge || challenge.userId !== userId || challenge.status !== "pending") return false;
    await this.removeLoginApprovalChallenge(challenge);
    return true;
  }

  async completeTwoFactorLogin(challengeId: string): Promise<{ user: UserRecord; tokens: AuthTokens } | undefined> {
    const candidate = await this.readLoginApprovalChallenge(challengeId);
    if (!candidate) return undefined;
    const raw = await this.redisRepository.consumeLoginApprovalStrict(challengeId, candidate.userId, candidate.emailOtpKey);
    if (!raw) return undefined;

    let challenge: StoredLoginApprovalChallenge;
    try {
      challenge = loginApprovalSchema.parse(JSON.parse(raw));
    } catch {
      return undefined;
    }
    const user = await this.userRepository.findById(challenge.userId);
    if (!user || !this.isAccountActive(user) || (user.authVersion ?? 0) !== challenge.authVersion || !(await this.readTotpSecret(user))) return undefined;
    if (challenge.googleSubject && challenge.googleEmail) {
      // The Google credential was validated when this short-lived approval was
      // created. Enforce that its identity still matches the same account.
      if (user.email.trim().toLowerCase() !== challenge.googleEmail) return undefined;
      try {
        const linked = await this.finishGoogleLink(user, challenge.googleSubject, challenge.googleEmail);
        this.securityService.createAuditEvent("login_success", "Google sign-in completed via two-factor approval", challenge.googleEmail);
        return this.createSession(linked, { emailVerified: true });
      } catch {
        return undefined;
      }
    }
    return this.createSession(user, { emailVerified: true });
  }

  async logoutAllDevices(userId: string): Promise<void> {
    // The database epoch is the revocation boundary. Cleanup failure cannot
    // restore an old session or an approved login challenge.
    await this.userRepository.revokeAllCredentials(userId);
    await this.cleanRevokedCredentials(userId);
  }

  private async cleanRevokedCredentials(userId: string): Promise<void> {
    try {
      const keys = await this.redisRepository.scanStrict(`session:${userId}:*`);
      await Promise.all(keys.map(key => this.redisRepository.delStrict(key)));
      await this.invalidateLoginApprovalChallenges(userId);
    } catch {
      logger.warn({ userId }, 'Revoked credentials await Redis expiry; database epoch prevents access');
    }
  }

  async logout(userId: string, deviceId: string): Promise<void> {
    await this.redisRepository.delStrict(`session:${userId}:${deviceId}`);
  }

  async logoutByToken(refreshToken: string): Promise<void> {
    let payload: jwt.JwtPayload;
    try {
      payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET, { algorithms: ['HS256'] }) as jwt.JwtPayload;
    } catch {
      return;
    }
    if (payload.type === 'refresh' && payload.sub && typeof payload.deviceId === 'string') {
      await this.logout(payload.sub, payload.deviceId);
    }
  }

  async refreshAccessToken(refreshToken: string): Promise<AuthTokens | undefined> {
    let payload: jwt.JwtPayload;
    try {
      payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET, { algorithms: ['HS256'] }) as jwt.JwtPayload;
    } catch {
      return undefined;
    }
      const userId = payload.sub;
      const deviceId = payload.deviceId;
      if (!userId || typeof deviceId !== 'string' || payload.type !== 'refresh') {
        return undefined;
      }
      const user = await this.userRepository.findById(userId);
      if (!user || !this.isAccountActive(user) || (payload.authVersion ?? 0) !== (user.authVersion ?? 0)) {
        return undefined;
      }
      const storedTokenHash = await this.redisRepository.getStrict(`session:${user.id}:${deviceId}`);
      const refreshTokenHash = await this.redisRepository.hashToken(refreshToken);
      if (!storedTokenHash || storedTokenHash !== refreshTokenHash) {
        return undefined;
      }
      const nextRefreshToken = this.issueRefreshToken(user, deviceId);
      const nextRefreshTokenHash = await this.redisRepository.hashToken(nextRefreshToken);
      const rotated = await this.redisRepository.rotateValueStrict(
        `session:${user.id}:${deviceId}`,
        refreshTokenHash,
        nextRefreshTokenHash,
        7 * 24 * 60 * 60,
      );
      if (!rotated) return undefined;
      return this.issueTokens(user, nextRefreshToken, deviceId);
  }

  /** Generates a single-use, expiring reset token and dispatches it by email. */
  async requestPasswordReset(email: string): Promise<string | undefined> {
    const normalizedEmail = email.trim().toLowerCase();
    if (!isAllowedEmail(normalizedEmail)) {
      return undefined;
    }
    const user = await this.userRepository.findByEmail(normalizedEmail);
    if (!user) {
      // Don't reveal whether this email is registered.
      return undefined;
    }

    // Prevent email bombing: at most one reset dispatch per email per 2 minutes.
    const throttleHash = await this.redisRepository.hashToken(normalizedEmail);
    const throttleKey = `password-reset-throttle:${throttleHash}`;
    if (!(await this.redisRepository.consumeBudgetStrict(throttleKey, 1, 120))) {
      throw new TooManyAttemptsError("A password reset email was already sent. Please wait before requesting another.");
    }
    const token = randomBytes(32).toString("hex");
    const hashed = await this.redisRepository.hashToken(token);
    await this.userRepository.savePasswordReset(hashed, user);
    try {
      await this.emailService.sendPasswordResetEmail(user.email, token);
    } catch (error) {
      await this.userRepository.cancelPasswordReset(hashed);
      throw error;
    }
    logger.info({ userId: user.id }, "Password reset requested and email dispatched");
    return token;
  }

  async confirmPasswordReset(token: string, newPassword: string): Promise<boolean> {
    const hashed = await this.redisRepository.hashToken(token);
    const passwordHash = await bcrypt.hash(newPassword, 10);
    const userId = await this.userRepository.redeemPasswordReset(hashed, passwordHash);
    if (!userId) return false;
    await this.cleanRevokedCredentials(userId);
    return true;
  }

  /** Same shape as password reset: single-use, expiring, hash-stored token. */
  async requestEmailVerification(userId: string): Promise<string | undefined> {
    const user = await this.userRepository.findById(userId);
    if (!user || user.emailVerified) {
      return undefined;
    }
    const token = randomBytes(32).toString("hex");
    const hashed = await this.redisRepository.hashToken(token);
    await this.redisRepository.setStrict(`email-verify:${hashed}`, userId, 24 * 60 * 60);
    try {
      await this.emailService.sendVerificationEmail(user.email, token);
    } catch (error) {
      await this.redisRepository.delStrict(`email-verify:${hashed}`);
      throw error;
    }
    logger.info({ userId }, "Email verification requested and email dispatched");
    return token;
  }

  async requestEmailVerificationByEmail(email: string): Promise<string | undefined> {
    const normalizedEmail = email.trim().toLowerCase();
    if (!isAllowedEmail(normalizedEmail)) {
      return undefined;
    }
    const user = await this.userRepository.findByEmail(normalizedEmail);
    if (!user || user.emailVerified) {
      return undefined;
    }

    const throttleKey = `email-verify-resend:${await this.redisRepository.hashToken(normalizedEmail)}`;
    if (await this.redisRepository.getStrict(throttleKey)) {
      throw new TooManyAttemptsError("A verification email was already sent. Please wait a minute before requesting another.");
    }
    await this.redisRepository.setStrict(throttleKey, "1", 60);
    try {
      return await this.requestEmailVerification(user.id);
    } catch (error) {
      await this.redisRepository.delStrict(throttleKey);
      throw error;
    }
  }

  async confirmEmailVerification(token: string): Promise<UserRecord | undefined> {
    const hashed = await this.redisRepository.hashToken(token);
    const key = `email-verify:${hashed}`;
    const userId = await this.redisRepository.get(key);
    if (!userId) {
      return undefined;
    }
    await this.redisRepository.del(key);
    return this.verifyEmail(userId);
  }

  async verifyEmail(userId: string): Promise<UserRecord | undefined> {
    return this.userRepository.update(userId, { emailVerified: true });
  }

  async updatePrivacy(userId: string, privacy: Partial<NonNullable<UserRecord["privacy"]>>): Promise<UserRecord | undefined> {
    return this.userRepository.patchPrivacy(userId, privacy);
  }

  async acceptCurrentTerms(userId: string, input: { acceptedTerms: boolean; confirmedAge: boolean }): Promise<UserRecord | undefined> {
    if (input.acceptedTerms !== true || input.confirmedAge !== true) {
      throw new RegistrationNotAllowedError("You must accept the current terms and confirm the minimum age");
    }
    const now = new Date().toISOString();
    return this.userRepository.update(userId, {
      termsVersion: env.TERMS_VERSION,
      termsAcceptedAt: now,
      ageConfirmedAt: now,
    });
  }

  /**
   * Generates a TOTP secret and holds it in Redis (not yet on the user
   * record) until confirmTwoFactorSetup verifies the user actually has it
   * working — standard practice, so a bad scan doesn't lock someone out.
   */
  async beginTwoFactorSetup(userId: string): Promise<{ secret: string; otpauthUrl: string } | undefined> {
    const user = await this.userRepository.findById(userId);
    if (!user) return undefined;
    const secret = authenticator.generateSecret();
    await this.redisRepository.set(
      `totp-setup:${userId}`,
      encryptSecret(secret, env.TOTP_ENCRYPTION_KEY),
      10 * 60,
    );
    const otpauthUrl = authenticator.keyuri(user.email, "Yor Talks", secret);
    return { secret, otpauthUrl };
  }

  async confirmTwoFactorSetup(userId: string, code: string): Promise<boolean> {
    const pendingSecretValue = await this.redisRepository.get(`totp-setup:${userId}`);
    if (!pendingSecretValue) {
      return false;
    }
    let pendingSecret: string;
    try {
      pendingSecret = decryptSecret(pendingSecretValue, env.TOTP_ENCRYPTION_KEY).secret;
    } catch {
      return false;
    }
    if (!authenticator.check(code, pendingSecret)) {
      return false;
    }
    await this.userRepository.update(userId, { totpSecret: encryptSecret(pendingSecret, env.TOTP_ENCRYPTION_KEY) });
    await this.redisRepository.del(`totp-setup:${userId}`);
    return true;
  }

  async disableTwoFactor(userId: string, code: string): Promise<boolean> {
    const user = await this.userRepository.findById(userId);
    const secret = user ? await this.readTotpSecret(user) : null;
    if (!secret || !authenticator.check(code, secret)) {
      return false;
    }
    await this.userRepository.update(userId, { totpSecret: null });
    return true;
  }

  private async readTotpSecret(user: UserRecord): Promise<string | null> {
    if (!user.totpSecret) return null;
    const decrypted = decryptSecret(user.totpSecret, env.TOTP_ENCRYPTION_KEY);
    if (decrypted.needsMigration) {
      await this.userRepository.update(user.id, {
        totpSecret: encryptSecret(decrypted.secret, env.TOTP_ENCRYPTION_KEY),
      });
    }
    return decrypted.secret;
  }

  private buildLoginApprovalChallenge(user: UserRecord, expiresAtMs: number,
    otp?: { key: string; challengeId: string },
    google?: { subject: string; email: string }): StoredLoginApprovalChallenge {
    return {
      schemaVersion: 1,
      challengeId: randomUUID(),
      matchingNumber: randomInt(1, 100),
      expiresAt: new Date(expiresAtMs).toISOString(),
      expiresAtMs,
      userId: user.id,
      authVersion: user.authVersion ?? 0,
      status: "pending",
      attempts: 0,
      createdAt: new Date().toISOString(),
      ...(otp ? { emailOtpKey: otp.key, emailOtpChallengeId: otp.challengeId } : {}),
      ...(google ? { googleSubject: google.subject, googleEmail: google.email } : {}),
    };
  }

  private async createLoginApprovalChallenge(user: UserRecord,
    google?: { subject: string; email: string }): Promise<LoginApprovalChallenge> {
    const challenge = this.buildLoginApprovalChallenge(user, Date.now() + 5 * 60 * 1000, undefined, google);
    if (!(await this.redisRepository.reserveExpiringValueStrict(this.loginApprovalKey(challenge.challengeId),
      JSON.stringify(challenge), challenge.expiresAtMs))) throw new Error('Could not reserve login approval');
    await this.redisRepository.addToSetStrict(this.loginApprovalIndexKey(user.id), challenge.challengeId);
    return this.publicLoginApprovalChallenge(challenge);
  }

  private async readLoginApprovalChallenge(challengeId: string): Promise<StoredLoginApprovalChallenge | null> {
    const raw = await this.redisRepository.getStrict(this.loginApprovalKey(challengeId));
    if (!raw) return null;
    try {
      const state = loginApprovalSchema.parse(JSON.parse(raw));
      return state.challengeId === challengeId ? state : null;
    } catch {
      return null;
    }
  }

  private async removeLoginApprovalChallenge(challenge: StoredLoginApprovalChallenge): Promise<void> {
    await Promise.all([
      this.redisRepository.deleteChallengeStrict(this.loginApprovalKey(challenge.challengeId), challenge.challengeId),
      this.redisRepository.removeFromSetStrict(this.loginApprovalIndexKey(challenge.userId), challenge.challengeId),
    ]);
  }

  private async cancelLoginApprovalChallenge(userId: string, challengeId: string): Promise<void> {
    const challenge = await this.readLoginApprovalChallenge(challengeId);
    if (challenge?.userId === userId) await this.removeLoginApprovalChallenge(challenge);
  }

  private publicLoginApprovalChallenge(challenge: StoredLoginApprovalChallenge): LoginApprovalChallenge {
    return {
      challengeId: challenge.challengeId,
      matchingNumber: challenge.matchingNumber,
      expiresAt: challenge.expiresAt,
    };
  }

  private loginApprovalKey(challengeId: string): string {
    return `login-approval:${challengeId}`;
  }

  private loginApprovalIndexKey(userId: string): string {
    return `login-approvals:user:${userId}`;
  }

  /** Removes all pending login-approval challenges for a user.
   *  Called after password reset and logout-all to prevent pre-staged
   *  two-factor challenges from being completed after a credential change. */
  private async invalidateLoginApprovalChallenges(userId: string): Promise<void> {
    const indexKey = this.loginApprovalIndexKey(userId);
    const challengeIds = await this.redisRepository.getSetStrict(indexKey);
    if (challengeIds.length === 0) return;
    await Promise.all([
      ...challengeIds.map((id) => this.redisRepository.delStrict(this.loginApprovalKey(id))),
      this.redisRepository.delStrict(indexKey),
    ]);
  }

  private async finishGoogleLink(user: UserRecord, subject: string, email: string): Promise<UserRecord> {
    if (user.email.trim().toLowerCase() !== email) throw new Error("Google email changed during sign-in");
    if (user.googleSubject === subject) return user;
    if (user.googleSubject) throw new Error("A different Google identity is already linked");
    // Conditional compare-and-set plus the unique subject constraint guarantee
    // a concurrent link, logout-all or account suspension cannot be overwritten.
    const linked = await this.userRepository.linkGoogleSubjectForLogin(user, subject);
    if (!linked) throw new Error("Google identity could not be linked; retry sign-in");
    return linked;
  }

  private async createSession(
    user: UserRecord,
    updates: Partial<Pick<UserRecord, "emailVerified">> = {},
  ): Promise<{ user: UserRecord; tokens: AuthTokens }> {
    this.assertAccountActive(user);
    const updatedUser = await this.userRepository.recordLogin(user, updates);
    if (!updatedUser) throw new Error('Credentials changed; sign in again');
    const deviceId = randomUUID();
    const refreshToken = this.issueRefreshToken(user, deviceId);
    await this.redisRepository.setStrict(
      `session:${user.id}:${deviceId}`,
      await this.redisRepository.hashToken(refreshToken),
      7 * 24 * 60 * 60,
    );
    const finalUser = { ...updatedUser, ...(await this.userRepository.getOwnRelationships(user.id)) };
    return { user: finalUser, tokens: this.issueTokens(finalUser, refreshToken, deviceId) };
  }

  private issueTokens(user: UserRecord, refreshToken: string, deviceId: string): AuthTokens {
    const accessToken = jwt.sign({ sub: user.id, type: 'access', authVersion: user.authVersion ?? 0, role: user.role, permissions: user.permissions, deviceId }, env.JWT_SECRET, {
      expiresIn: "15m",
    });
    return { accessToken, refreshToken, expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString() };
  }

  private issueRefreshToken(user: UserRecord, deviceId: string): string {
    return jwt.sign({ sub: user.id, type: "refresh", authVersion: user.authVersion ?? 0, deviceId, jti: randomUUID() }, env.JWT_REFRESH_SECRET, {
      expiresIn: "7d",
    });
  }

  private isAccountActive(user: UserRecord): boolean {
    return !['suspended', 'deactivated', 'deleted'].includes(user.accountStatus ?? 'active');
  }

  private assertAccountActive(user: UserRecord): void {
    if (!this.isAccountActive(user)) throw new Error("Account is unavailable");
  }
}
