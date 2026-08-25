import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { authenticator } from "otplib";
import { randomUUID, randomBytes } from "node:crypto";
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

export class TooManyAttemptsError extends Error {}
export class TwoFactorRequiredError extends Error {}

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
  }): Promise<{ user: UserRecord; tokens: AuthTokens }> {
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
      },
      emailVerified: false,
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
    const deviceId = randomUUID();
    const refreshToken = this.issueRefreshToken(user, deviceId);
    await this.redisRepository.set(`session:${user.id}:${deviceId}`, refreshToken, 7 * 24 * 60 * 60);
    return {
      user,
      tokens: this.issueTokens(user, refreshToken, deviceId),
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

  /**
   * Generates a single-use, expiring reset token and returns it so the caller
   * (controller) can send it — this service has no email transport configured,
   * so nothing is actually emailed yet. Only the hash is stored, matching how
   * passwords themselves are never stored raw.
   */
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
    await this.redisRepository.set(`password-reset:${hashed}`, user.id, 60 * 60);
    await this.userRepository.update(user.id, { passwordResetRequired: true });
    await this.emailService.sendPasswordResetEmail(user.email, token);
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

  /** Same shape as password reset: single-use, expiring, hash-stored token. No email transport configured yet. */
  async requestEmailVerification(userId: string): Promise<string | undefined> {
    const user = await this.userRepository.findById(userId);
    if (!user || user.emailVerified) {
      return undefined;
    }
    const token = randomBytes(32).toString("hex");
    const hashed = await this.redisRepository.hashToken(token);
    await this.redisRepository.set(`email-verify:${hashed}`, userId, 24 * 60 * 60);
    await this.emailService.sendVerificationEmail(user.email, token);
    logger.info({ userId }, "Email verification requested and email dispatched");
    return token;
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
