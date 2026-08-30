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

export class TooManyAttemptsError extends Error {}
export type LoginApprovalChallenge = {
  challengeId: string;
  matchingNumber: number;
  expiresAt: string;
};

type StoredLoginApprovalChallenge = LoginApprovalChallenge & {
  userId: string;
  status: "pending" | "approved";
  attempts: number;
  createdAt: string;
  approvedAt?: string;
  emailOtpKey?: string;
};

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
export class RegistrationNotAllowedError extends Error {}
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
          await this.createLoginApprovalChallenge(user.id),
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
      throw new Error("The Google credential is invalid or expired");
    }

    const googleSubject = payload?.sub;
    const googleEmail = payload?.email?.trim().toLowerCase();
    if (!googleSubject || !googleEmail || payload?.email_verified !== true || !isAllowedEmail(googleEmail)) {
      throw new Error("Use a verified Google account from an allowed email domain");
    }

    const linkedUser = await this.userRepository.findByGoogleSubject(googleSubject);
    const user = linkedUser ?? await this.userRepository.findByEmail(googleEmail);
    if (!user) {
      throw new Error("No Yor account exists for this Google email. Create an account first.");
    }
    if (user.googleSubject && user.googleSubject !== googleSubject) {
      throw new Error("This Google account is not linked to the Yor account for that email");
    }

    const linked = user.googleSubject ? user : await this.userRepository.update(user.id, {
      googleSubject,
      emailVerified: true,
    });
    const finalUser = linked ?? user;
    this.assertAccountActive(finalUser);

    const totpSecret = await this.readTotpSecret(finalUser);
    if (totpSecret) {
      if (!input.totpCode) {
        throw new TwoFactorRequiredError(
          "Approve this sign-in in your Yor app",
          await this.createLoginApprovalChallenge(finalUser.id),
        );
      }
      if (!authenticator.check(input.totpCode, totpSecret)) {
        throw new Error("Invalid two-factor code");
      }
      if (input.challengeId) await this.cancelLoginApprovalChallenge(finalUser.id, input.challengeId);
    }

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
    const existing = await this.redisRepository.getStrict(key);
    if (existing) {
      throw new TooManyAttemptsError("A sign-in code was already sent. Please wait a minute before requesting another.");
    }

    const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
    const expiresAt = Date.now() + 5 * 60 * 1000;
    await this.redisRepository.setStrict(key, JSON.stringify({
      userId: user.id,
      codeHash: await this.redisRepository.hashToken(code),
      attempts: 0,
      expiresAt,
    }), 5 * 60);
    try {
      await this.emailService.sendEmailLoginCode(user.email, code);
    } catch (error) {
      await this.redisRepository.delStrict(key);
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

    let state: { userId: string; codeHash: string; attempts: number; expiresAt: number };
    try {
      state = JSON.parse(raw) as typeof state;
    } catch {
      await this.redisRepository.delStrict(key);
      throw new EmailOtpInvalidError("The sign-in code is invalid or expired");
    }
    if (state.expiresAt <= Date.now() || state.attempts >= 5) {
      await this.redisRepository.delStrict(key);
      throw new EmailOtpInvalidError("The sign-in code is invalid or expired");
    }

    const suppliedHash = await this.redisRepository.hashToken(input.code);
    if (suppliedHash !== state.codeHash) {
      const attempts = state.attempts + 1;
      const remainingTtl = Math.max(1, Math.ceil((state.expiresAt - Date.now()) / 1000));
      await this.redisRepository.setStrict(key, JSON.stringify({ ...state, attempts }), remainingTtl);
      throw new EmailOtpInvalidError("The sign-in code is invalid or expired");
    }

    const user = await this.userRepository.findById(state.userId);
    if (!user || user.email !== normalizedEmail || !isAllowedEmail(user.email)) {
      await this.redisRepository.delStrict(key);
      throw new EmailOtpInvalidError("The sign-in code is invalid or expired");
    }
    this.assertAccountActive(user);
    const totpSecret = await this.readTotpSecret(user);
    if (totpSecret) {
      if (!input.totpCode) {
        throw new TwoFactorRequiredError(
          "Approve this sign-in in your Yor app",
          await this.createLoginApprovalChallenge(user.id, key),
        );
      }
      if (!authenticator.check(input.totpCode, totpSecret)) {
        throw new EmailOtpInvalidError("Invalid two-factor authentication code");
      }
      if (input.challengeId) await this.cancelLoginApprovalChallenge(user.id, input.challengeId);
    }

    await this.redisRepository.delStrict(key);
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
      if (Date.parse(challenge.expiresAt) <= now || challenge.status !== "pending") {
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
    if (Date.parse(challenge.expiresAt) <= Date.now()) {
      await this.removeLoginApprovalChallenge(challenge);
      return false;
    }
    if (challenge.matchingNumber !== matchingNumber) {
      const attempts = challenge.attempts + 1;
      if (attempts >= 5) {
        await this.removeLoginApprovalChallenge(challenge);
      } else {
        const ttl = Math.max(1, Math.ceil((Date.parse(challenge.expiresAt) - Date.now()) / 1000));
        await this.redisRepository.setStrict(
          this.loginApprovalKey(challengeId),
          JSON.stringify({ ...challenge, attempts }),
          ttl,
        );
      }
      return false;
    }

    const ttl = Math.max(1, Math.ceil((Date.parse(challenge.expiresAt) - Date.now()) / 1000));
    await this.redisRepository.setStrict(
      this.loginApprovalKey(challengeId),
      JSON.stringify({ ...challenge, status: "approved", approvedAt: new Date().toISOString() }),
      ttl,
    );
    return true;
  }

  async denyTwoFactorChallenge(userId: string, challengeId: string): Promise<boolean> {
    const challenge = await this.readLoginApprovalChallenge(challengeId);
    if (!challenge || challenge.userId !== userId || challenge.status !== "pending") return false;
    await this.removeLoginApprovalChallenge(challenge);
    return true;
  }

  async completeTwoFactorLogin(challengeId: string): Promise<{ user: UserRecord; tokens: AuthTokens } | undefined> {
    const raw = await this.redisRepository.consumeApprovedStrict(this.loginApprovalKey(challengeId), new Date().toISOString());
    if (!raw) return undefined;

    let challenge: StoredLoginApprovalChallenge;
    try {
      challenge = JSON.parse(raw) as StoredLoginApprovalChallenge;
    } catch {
      return undefined;
    }
    await this.redisRepository.removeFromSetStrict(this.loginApprovalIndexKey(challenge.userId), challengeId);
    if (challenge.emailOtpKey) await this.redisRepository.delStrict(challenge.emailOtpKey);

    const user = await this.userRepository.findById(challenge.userId);
    if (!user || !this.isAccountActive(user) || !(await this.readTotpSecret(user))) return undefined;
    return this.createSession(user, { emailVerified: true });
  }

  async logoutAllDevices(userId: string): Promise<void> {
    // We would need a way to list and delete all keys, but for now we can rely on standard del if redis supports pattern matching or we can just leave it as is if redis doesn't.
    // Wait, with multiple devices we can't just del `session:${userId}`. 
    // We can fetch all keys `session:${userId}:*` and delete them.
    const keys = await this.redisRepository.scanStrict(`session:${userId}:*`);
    if (keys.length > 0) {
      await Promise.all(keys.map(key => this.redisRepository.delStrict(key)));
    }
  }

  async logout(userId: string, deviceId: string): Promise<void> {
    await this.redisRepository.delStrict(`session:${userId}:${deviceId}`);
  }

  async logoutByToken(refreshToken: string): Promise<void> {
    try {
      const payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as { sub?: string, deviceId?: string };
      if (payload.sub && payload.deviceId) {
        await this.logout(payload.sub, payload.deviceId);
      }
    } catch {
      // ignore
    }
  }

  async refreshAccessToken(refreshToken: string): Promise<AuthTokens | undefined> {
    try {
      const payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as { sub?: string, deviceId?: string };
      const userId = payload.sub;
      const deviceId = payload.deviceId;
      if (!userId || !deviceId) {
        return undefined;
      }
      const user = await this.userRepository.findById(userId);
      if (!user || !this.isAccountActive(user)) {
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
    } catch {
      return undefined;
    }
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
    if (await this.redisRepository.getStrict(throttleKey)) {
      throw new TooManyAttemptsError("A password reset email was already sent. Please wait before requesting another.");
    }
    await this.redisRepository.setStrict(throttleKey, "1", 120);

    const token = randomBytes(32).toString("hex");
    const hashed = await this.redisRepository.hashToken(token);
    await this.redisRepository.setStrict(`password-reset:${hashed}`, user.id, 60 * 60);
    await this.userRepository.update(user.id, { passwordResetRequired: true });
    try {
      await this.emailService.sendPasswordResetEmail(user.email, token);
    } catch (error) {
      await this.redisRepository.delStrict(`password-reset:${hashed}`);
      await this.userRepository.update(user.id, { passwordResetRequired: false });
      throw error;
    }
    logger.info({ userId: user.id }, "Password reset requested and email dispatched");
    return token;
  }

  async confirmPasswordReset(token: string, newPassword: string): Promise<boolean> {
    const hashed = await this.redisRepository.hashToken(token);
    const key = `password-reset:${hashed}`;
    const userId = await this.redisRepository.getStrict(key);
    if (!userId) {
      return false;
    }
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.userRepository.update(userId, { passwordHash, passwordResetRequired: false });
    await this.redisRepository.delStrict(key);
    // A password reset is a meaningful security event — invalidate every existing
    // session (including any an attacker might hold) and require fresh logins.
    await this.logoutAllDevices(userId);
    // Also invalidate any pending login-approval challenges so a pre-staged
    // two-factor challenge cannot be completed after the password changes.
    await this.invalidateLoginApprovalChallenges(userId);
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

  async updatePrivacy(userId: string, privacy: UserRecord["privacy"]): Promise<UserRecord | undefined> {
    const user = await this.userRepository.findById(userId);
    if (!user) return undefined;
    const current = user.privacy ?? { profileVisibility: "public" as const, messageRequests: true, allowDmFromStrangers: true };
    return this.userRepository.update(userId, {
      privacy: {
        profileVisibility: privacy?.profileVisibility ?? current.profileVisibility,
        messageRequests: privacy?.messageRequests ?? current.messageRequests,
        allowDmFromStrangers: privacy?.allowDmFromStrangers ?? current.allowDmFromStrangers,
      },
    });
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

  private async createLoginApprovalChallenge(userId: string, emailOtpKey?: string): Promise<LoginApprovalChallenge> {
    const challengeId = randomUUID();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    const challenge: StoredLoginApprovalChallenge = {
      challengeId,
      matchingNumber: randomInt(1, 100),
      expiresAt,
      userId,
      status: "pending",
      attempts: 0,
      createdAt: new Date().toISOString(),
      ...(emailOtpKey ? { emailOtpKey } : {}),
    };
    await this.redisRepository.setStrict(this.loginApprovalKey(challengeId), JSON.stringify(challenge), 5 * 60);
    await this.redisRepository.addToSetStrict(this.loginApprovalIndexKey(userId), challengeId);
    return this.publicLoginApprovalChallenge(challenge);
  }

  private async readLoginApprovalChallenge(challengeId: string): Promise<StoredLoginApprovalChallenge | null> {
    const raw = await this.redisRepository.getStrict(this.loginApprovalKey(challengeId));
    if (!raw) return null;
    try {
      return JSON.parse(raw) as StoredLoginApprovalChallenge;
    } catch {
      await this.redisRepository.delStrict(this.loginApprovalKey(challengeId));
      return null;
    }
  }

  private async removeLoginApprovalChallenge(challenge: StoredLoginApprovalChallenge): Promise<void> {
    await Promise.all([
      this.redisRepository.delStrict(this.loginApprovalKey(challenge.challengeId)),
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

  private async createSession(
    user: UserRecord,
    updates: Partial<Pick<UserRecord, "emailVerified">> = {},
  ): Promise<{ user: UserRecord; tokens: AuthTokens }> {
    this.assertAccountActive(user);
    const deviceId = randomUUID();
    const refreshToken = this.issueRefreshToken(user, deviceId);
    await this.redisRepository.setStrict(
      `session:${user.id}:${deviceId}`,
      await this.redisRepository.hashToken(refreshToken),
      7 * 24 * 60 * 60,
    );
    const updatedUser = await this.userRepository.update(user.id, { ...updates, lastLoginAt: new Date().toISOString() });
    const finalUser = updatedUser ?? user;
    return { user: finalUser, tokens: this.issueTokens(finalUser, refreshToken, deviceId) };
  }

  private issueTokens(user: UserRecord, refreshToken: string, deviceId: string): AuthTokens {
    const accessToken = jwt.sign({ sub: user.id, role: user.role, permissions: user.permissions, deviceId }, env.JWT_SECRET, {
      expiresIn: "15m",
    });
    return { accessToken, refreshToken, expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString() };
  }

  private issueRefreshToken(user: UserRecord, deviceId: string): string {
    return jwt.sign({ sub: user.id, type: "refresh", deviceId }, env.JWT_REFRESH_SECRET, {
      expiresIn: "7d",
    });
  }

  private isAccountActive(user: UserRecord): boolean {
    return user.accountStatus !== "suspended" && user.accountStatus !== "deactivated";
  }

  private assertAccountActive(user: UserRecord): void {
    if (!this.isAccountActive(user)) throw new Error("Account is unavailable");
  }
}
