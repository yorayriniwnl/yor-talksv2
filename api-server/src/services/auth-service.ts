import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
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
import { isKiitCollegeEmail } from "../validators/auth.js";
import { getContactIdentifierDigest } from "../utils/contact-shield.js";

export class TooManyAttemptsError extends Error {}
export class TwoFactorRequiredError extends Error {}
export class EmailOtpInvalidError extends Error {}
export class EmailVerificationRequiredError extends Error {}

export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly redisRepository: RedisRepository = new RedisRepository(),
    private readonly securityService: SecurityService = new SecurityService(),
    private readonly emailService: EmailService = new EmailService(),
  ) {}

  async register(input: {
    username: string;
    email: string;
    password: string;
    fullName: string;
  }): Promise<{ user: UserRecord; verificationToken?: string }> {
    const email = input.email.trim().toLowerCase();
    if (!isKiitCollegeEmail(email)) {
      throw new Error("Only seven-digit @kiit.ac.in college emails can join this beta");
    }

    const existingEmail = await this.userRepository.findByEmail(email);
    const existingUsername = await this.userRepository.findByUsername(input.username);
    const existing = existingEmail ?? existingUsername;
    
    if (existing) {
      throw new Error("User already exists");
    }

    const passwordHash = await bcrypt.hash(input.password, 10);
    const user: UserRecord = {
      id: randomUUID(),
      username: input.username,
      email,
      passwordHash,
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

  async login(input: { identifier: string; password: string; totpCode?: string }): Promise<{ user: UserRecord; tokens: AuthTokens }> {
    const normalizedIdentifier = input.identifier.toLowerCase();
    if (this.securityService.detectAbuse(normalizedIdentifier, "login_failure")) {
      throw new TooManyAttemptsError("Too many failed login attempts. Please try again later.");
    }

    const byEmail = await this.userRepository.findByEmail(input.identifier);
    const user = byEmail ?? await this.userRepository.findByUsername(input.identifier);
    if (!user) {
      this.securityService.createAuditEvent("login_failure", `${normalizedIdentifier} — unknown identifier`);
      throw new Error("Invalid credentials");
    }

    if (!isKiitCollegeEmail(user.email)) {
      this.securityService.createAuditEvent("login_failure", `${normalizedIdentifier} — non-KIIT account`);
      throw new Error("Invalid credentials");
    }

    const valid = await bcrypt.compare(input.password, user.passwordHash);
    if (!valid) {
      this.securityService.createAuditEvent("login_failure", `${normalizedIdentifier} — wrong password`);
      throw new Error("Invalid credentials");
    }

    if (!user.emailVerified) {
      this.securityService.createAuditEvent("login_failure", `${normalizedIdentifier} — email not verified`);
      throw new EmailVerificationRequiredError("Verify your KIIT email before signing in");
    }

    if (user.totpSecret) {
      if (!input.totpCode) {
        throw new TwoFactorRequiredError("Two-factor authentication code required");
      }
      if (!authenticator.check(input.totpCode, user.totpSecret)) {
        this.securityService.createAuditEvent("login_failure", `${normalizedIdentifier} — wrong 2FA code`);
        throw new Error("Invalid two-factor code");
      }
    }

    const deviceId = randomUUID();
    const refreshToken = this.issueRefreshToken(user, deviceId);
    await this.redisRepository.set(`session:${user.id}:${deviceId}`, refreshToken, 7 * 24 * 60 * 60);
    const updatedUser = await this.userRepository.update(user.id, { lastLoginAt: new Date().toISOString() });
    return {
      user: updatedUser ?? user,
      tokens: this.issueTokens(updatedUser ?? user, refreshToken, deviceId),
    };
  }

  async requestEmailOtp(email: string): Promise<boolean> {
    const normalizedEmail = email.trim().toLowerCase();
    if (!isKiitCollegeEmail(normalizedEmail)) {
      throw new EmailOtpInvalidError("Only seven-digit KIIT college emails can request a sign-in code");
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

  async loginWithEmailOtp(input: { email: string; code: string; totpCode?: string }): Promise<{ user: UserRecord; tokens: AuthTokens }> {
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
    if (!user || user.email !== normalizedEmail || !isKiitCollegeEmail(user.email)) {
      await this.redisRepository.delStrict(key);
      throw new EmailOtpInvalidError("The sign-in code is invalid or expired");
    }
    if (user.totpSecret) {
      if (!input.totpCode) throw new TwoFactorRequiredError("Two-factor authentication code required");
      if (!authenticator.check(input.totpCode, user.totpSecret)) {
        throw new EmailOtpInvalidError("Invalid two-factor authentication code");
      }
    }

    await this.redisRepository.delStrict(key);
    const deviceId = randomUUID();
    const refreshToken = this.issueRefreshToken(user, deviceId);
    await this.redisRepository.setStrict(`session:${user.id}:${deviceId}`, refreshToken, 7 * 24 * 60 * 60);
    const updatedUser = await this.userRepository.update(user.id, { lastLoginAt: new Date().toISOString(), emailVerified: true });
    const finalUser = updatedUser ?? user;
    return { user: finalUser, tokens: this.issueTokens(finalUser, refreshToken, deviceId) };
  }

  async logoutAllDevices(userId: string): Promise<void> {
    // We would need a way to list and delete all keys, but for now we can rely on standard del if redis supports pattern matching or we can just leave it as is if redis doesn't.
    // Wait, with multiple devices we can't just del `session:${userId}`. 
    // We can fetch all keys `session:${userId}:*` and delete them.
    const keys = await this.redisRepository.keys(`session:${userId}:*`);
    if (keys.length > 0) {
      await Promise.all(keys.map(key => this.redisRepository.del(key)));
    }
  }

  async logout(userId: string, deviceId: string): Promise<void> {
    await this.redisRepository.del(`session:${userId}:${deviceId}`);
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
      if (!user) {
        return undefined;
      }
      const storedToken = await this.redisRepository.get(`session:${user.id}:${deviceId}`);
      if (!storedToken || storedToken !== refreshToken) {
        return undefined;
      }
      return this.issueTokens(user, refreshToken, deviceId);
    } catch {
      return undefined;
    }
  }

  /** Generates a single-use, expiring reset token and dispatches it by email. */
  async requestPasswordReset(email: string): Promise<string | undefined> {
    if (!isKiitCollegeEmail(email)) {
      return undefined;
    }
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      // Don't reveal whether this email is registered.
      return undefined;
    }
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
    const userId = await this.redisRepository.get(key);
    if (!userId) {
      return false;
    }
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.userRepository.update(userId, { passwordHash, passwordResetRequired: false });
    await this.redisRepository.del(key);
    // A password reset is a meaningful security event — invalidate every existing
    // session (including any an attacker might hold) and require fresh logins.
    await this.logoutAllDevices(userId);
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
    if (!isKiitCollegeEmail(normalizedEmail)) {
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
    return this.userRepository.update(userId, { privacy });
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
    await this.redisRepository.set(`totp-setup:${userId}`, secret, 10 * 60);
    const otpauthUrl = authenticator.keyuri(user.email, "Yor Talks", secret);
    return { secret, otpauthUrl };
  }

  async confirmTwoFactorSetup(userId: string, code: string): Promise<boolean> {
    const pendingSecret = await this.redisRepository.get(`totp-setup:${userId}`);
    if (!pendingSecret || !authenticator.check(code, pendingSecret)) {
      return false;
    }
    await this.userRepository.update(userId, { totpSecret: pendingSecret });
    await this.redisRepository.del(`totp-setup:${userId}`);
    return true;
  }

  async disableTwoFactor(userId: string, code: string): Promise<boolean> {
    const user = await this.userRepository.findById(userId);
    if (!user?.totpSecret || !authenticator.check(code, user.totpSecret)) {
      return false;
    }
    await this.userRepository.update(userId, { totpSecret: null });
    return true;
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
}
