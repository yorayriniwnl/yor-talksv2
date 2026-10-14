import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import { authenticator } from "otplib";
import { randomUUID, randomBytes, randomInt } from "node:crypto";
import { env } from "../config/env.js";
import { logger } from "../lib/logger.js";
import { RedisRepository } from "../repositories/redis-repository.js";
import { UserRepository } from "../repositories/user-repository.js";
import { db, type DbTransaction } from "@workspace/db";
import { userFollowsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { SecurityService } from "./security-service.js";
import { EmailService } from "./email-service.js";
import type { AuthTokens, UserRecord } from "../types/index.js";
import type { EligibilityDecision } from "../eligibility/types.js";
import { isAllowedEmail } from "../validators/auth.js";
import { getContactIdentifierDigest } from "../utils/contact-shield.js";
import { decryptSecret, encryptSecret } from "../lib/secret-box.js";
import { AssuranceService } from "./assurance-service.js";
import { EligibilityEnrollmentService } from "./eligibility-enrollment-service.js";
import { EligibilityService } from "./eligibility-service.js";

export class TooManyAttemptsError extends Error {}
export type LoginApprovalChallenge = {
  challengeId: string;
  matchingNumber: number;
  expiresAt: string;
};

type StoredLoginApprovalChallenge = LoginApprovalChallenge & {
  userId: string;
  authVersion: number;
  status: "pending" | "approved";
  attempts: number;
  createdAt: string;
  approvedAt?: string;
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
export class EligibilityDecisionUnavailableError extends Error { constructor() { super("Current eligibility is unavailable"); } }
export class RegistrationNotAllowedError extends Error {}
export class UserAlreadyExistsError extends Error {}
export type AuthenticatedSession = { user: UserRecord; tokens: AuthTokens; eligibility: EligibilityDecision };

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
    private readonly enrollmentService = new EligibilityEnrollmentService(new AssuranceService()),
    private readonly googleClientFactory: (clientId: string) => OAuth2Client = clientId => new OAuth2Client(clientId),
    private readonly transactionRunner: <T>(operation: (tx: DbTransaction) => Promise<T>) => Promise<T> = operation => db.transaction(operation),
    private readonly eligibilityService = new EligibilityService(),
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
    enrollmentId: string;
    registrationNonce: string;
  }): Promise<{ user: UserRecord; verificationToken?: string }> {
    const normalizedUsername = input.username.trim().toLowerCase();
    const email = input.email.trim().toLowerCase();
    const userId = randomUUID();
    const user = await this.transactionRunner(async tx => {
      // Lock and validate the one-time enrollment before querying or storing
      // ordinary child/profile identifiers. The enrollment is consumed in the
      // same transaction as account creation, so concurrent attempts cannot
      // both create a user.
      const authorization = await this.enrollmentService.consumeAuthorizedEnrollment(input.enrollmentId,input.registrationNonce,tx);
      if (input.acceptedTerms !== true) throw new RegistrationNotAllowedError("You must accept the current terms and privacy notice");
      if (!isAllowedEmail(email)) throw new RegistrationNotAllowedError("This email domain is not allowed for this deployment");
      const existingEmail = await this.userRepository.findByEmail(email,tx);
      const existingUsername = await this.userRepository.findByUsername(normalizedUsername,tx);
      if (existingEmail || existingUsername) throw new UserAlreadyExistsError("An account already exists for that email or username");

      const passwordHash = await bcrypt.hash(input.password,10);
      const consentTimestamp = new Date().toISOString();
      const minor = authorization.experience !== 'adult_18_plus';
      const record: UserRecord = {
        id: userId,
        username: normalizedUsername,
        email,
        passwordHash,
        termsVersion: env.TERMS_VERSION,
        termsAcceptedAt: consentTimestamp,
        // This legacy field remains a self-attestation in old accounts. A
        // verified enrollment is recorded only in the private eligibility tables.
        ageConfirmedAt: null,
        fullName: input.fullName,
        bio: "",
        avatarUrl: null,
        role: "user",
        permissions: ["read:profile"],
        createdAt: consentTimestamp,
        updatedAt: consentTimestamp,
        settings: {
          theme: "light",
          notificationsEnabled: false,
          privateAccount: true,
          allowMentions: false,
          autoplayEnabled: !minor,
          readReceiptsEnabled: !minor,
          streaksEnabled: !minor,
          sharePreciseLocation: !minor,
          contentFilter: minor ? "child_safe" : "regular",
          onboardingCompleted: false,
        },
        emailVerified: false,
        contactIdentityDigest: getContactIdentifierDigest("email",email),
        passwordResetRequired: false,
        lastLoginAt: null,
        devices: [],
        blockedUsers: [],
        mutedUsers: [],
        privacy: { profileVisibility: "private",messageRequests: false,allowDmFromStrangers: false },
      };
      const created = await this.userRepository.create(record,tx);
      await this.enrollmentService.bindAuthorizedEnrollment(authorization,input.registrationNonce,userId,tx);
      return created;
    });
    // Email delivery happens after the atomic account/enrollment commit. If a
    // provider is temporarily unavailable the unverified account can use the
    // existing resend path; deleting it would also destroy its consumed proof.
    const verificationToken = await this.requestEmailVerification(user.id);
    return {
      user,
      verificationToken,
    };
  }

  async login(input: { identifier: string; password: string; totpCode?: string; challengeId?: string }): Promise<AuthenticatedSession> {
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
    this.assertSessionAvailable(user);

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

  async loginWithGoogle(input: { credential: string; totpCode?: string; challengeId?: string }): Promise<AuthenticatedSession> {
    if (!env.GOOGLE_CLIENT_ID) {
      throw new GoogleSignInNotConfiguredError("Google sign-in is not configured");
    }

    const googleClient = this.googleClientFactory(env.GOOGLE_CLIENT_ID);
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
    this.assertSessionAvailable(finalUser);

    const totpSecret = await this.readTotpSecret(finalUser);
    if (totpSecret) {
      if (!input.totpCode) {
        throw new TwoFactorRequiredError(
          "Approve this sign-in in your Yor app",
          await this.createLoginApprovalChallenge(finalUser),
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
    const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
    const expiresAt = Date.now() + 5 * 60 * 1000;
    const reserved = await this.redisRepository.setIfAbsentStrict(key, JSON.stringify({
      userId: user.id,
      codeHash: await this.redisRepository.hashToken(code),
      authVersion: user.authVersion ?? 0,
      attempts: 0,
      expiresAt,
    }), 5 * 60);
    if (!reserved) {
      throw new TooManyAttemptsError("A sign-in code was already sent. Please wait a minute before requesting another.");
    }
    try {
      await this.emailService.sendEmailLoginCode(user.email, code);
    } catch (error) {
      await this.redisRepository.delStrict(key);
      throw error;
    }
    logger.info({ userId: user.id }, "Email login code dispatched");
    return true;
  }

  async loginWithEmailOtp(input: { email: string; code: string; totpCode?: string; challengeId?: string }): Promise<AuthenticatedSession> {
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

    const user = await this.userRepository.findById(state.userId);
    if (!user || user.email !== normalizedEmail || !isAllowedEmail(user.email)) {
      await this.redisRepository.delStrict(key);
      throw new EmailOtpInvalidError("The sign-in code is invalid or expired");
    }
    this.assertSessionAvailable(user);
    const totpSecret = await this.readTotpSecret(user);
    if (totpSecret && input.totpCode && !authenticator.check(input.totpCode, totpSecret)) {
      throw new EmailOtpInvalidError("Invalid two-factor authentication code");
    }

    const suppliedHash = await this.redisRepository.hashToken(input.code);
    if (!(await this.redisRepository.verifyAndConsumeEmailOtpStrict(key, suppliedHash, user.authVersion ?? 0))) {
      throw new EmailOtpInvalidError("The sign-in code is invalid or expired");
    }
    if (totpSecret) {
      if (!input.totpCode) {
        throw new TwoFactorRequiredError(
          "Approve this sign-in in your Yor app",
          await this.createLoginApprovalChallenge(user),
        );
      }
      if (input.challengeId) await this.cancelLoginApprovalChallenge(user.id, input.challengeId);
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

  async completeTwoFactorLogin(challengeId: string): Promise<AuthenticatedSession | undefined> {
    const raw = await this.redisRepository.consumeApprovedStrict(this.loginApprovalKey(challengeId), new Date().toISOString());
    if (!raw) return undefined;

    let challenge: StoredLoginApprovalChallenge;
    try {
      challenge = JSON.parse(raw) as StoredLoginApprovalChallenge;
    } catch {
      return undefined;
    }
    await this.redisRepository.removeFromSetStrict(this.loginApprovalIndexKey(challenge.userId), challengeId);
    const user = await this.userRepository.findById(challenge.userId);
    if (!user || !this.isSessionAvailable(user) || (user.authVersion ?? 0) !== (challenge.authVersion ?? 0) || !(await this.readTotpSecret(user))) return undefined;
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
      if (!user || !this.isSessionAvailable(user) || (payload.authVersion ?? 0) !== (user.authVersion ?? 0)) {
        return undefined;
      }
      const storedTokenHash = await this.redisRepository.getStrict(`session:${user.id}:${deviceId}`);
      const refreshTokenHash = await this.redisRepository.hashToken(refreshToken);
      if (!storedTokenHash || storedTokenHash !== refreshTokenHash) {
        return undefined;
      }
      await this.currentEligibilityDecision(user.id);
      const currentUser = await this.userRepository.findById(user.id);
      if (!currentUser || !this.isSessionAvailable(currentUser) || (payload.authVersion ?? 0) !== (currentUser.authVersion ?? 0)) return undefined;
      const nextRefreshToken = this.issueRefreshToken(currentUser, deviceId);
      const nextRefreshTokenHash = await this.redisRepository.hashToken(nextRefreshToken);
      const rotated = await this.redisRepository.rotateValueStrict(
        `session:${user.id}:${deviceId}`,
        refreshTokenHash,
        nextRefreshTokenHash,
        7 * 24 * 60 * 60,
      );
      if (!rotated) return undefined;
      return this.issueTokens(currentUser, nextRefreshToken, deviceId);
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
    const decision = await this.currentEligibilityDecision(userId);
    const mayChooseVisibility = decision.activated && decision.experience === "adult_18_plus" && decision.capabilities.social;
    const effectivePrivacy = mayChooseVisibility ? privacy : {
      ...privacy,
      profileVisibility: "private" as const,
      messageRequests: false,
      allowDmFromStrangers: false,
    };
    return this.userRepository.patchPrivacy(userId, effectivePrivacy);
  }

  async acceptCurrentTerms(userId: string, input: { acceptedTerms: boolean; confirmedAge?: boolean }): Promise<UserRecord | undefined> {
    if (input.acceptedTerms !== true) {
      throw new RegistrationNotAllowedError("You must accept the current terms and privacy notice");
    }
    const now = new Date().toISOString();
    return this.userRepository.update(userId, {
      termsVersion: env.TERMS_VERSION,
      termsAcceptedAt: now,
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

  private async createLoginApprovalChallenge(user: UserRecord): Promise<LoginApprovalChallenge> {
    const userId = user.id;
    const challengeId = randomUUID();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    const challenge: StoredLoginApprovalChallenge = {
      challengeId,
      matchingNumber: randomInt(1, 100),
      expiresAt,
      userId,
      authVersion: user.authVersion ?? 0,
      status: "pending",
      attempts: 0,
      createdAt: new Date().toISOString(),
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
  ): Promise<AuthenticatedSession> {
    const current = await this.userRepository.findById(user.id);
    if (!current || !this.isSessionAvailable(current) || (current.authVersion ?? 0) !== (user.authVersion ?? 0)) {
      throw new Error("Account is unavailable or credentials changed");
    }
    const updatedUser = await this.userRepository.recordLogin(current, updates);
    if (!updatedUser) throw new Error('Credentials changed; sign in again');
    // Resolve current proof, policy, consent and moderation state after all
    // identity/MFA checks and the login write. A restricted result still gets
    // an identity session; request middleware applies the route boundary.
    const eligibility = await this.currentEligibilityDecision(updatedUser.id);
    const finalIdentity = await this.userRepository.findById(updatedUser.id);
    if (!finalIdentity || !this.isSessionAvailable(finalIdentity) || (finalIdentity.authVersion ?? 0) !== (updatedUser.authVersion ?? 0)) {
      throw new Error("Account is unavailable or credentials changed");
    }
    const deviceId = randomUUID();
    const refreshToken = this.issueRefreshToken(finalIdentity, deviceId);
    await this.redisRepository.setStrict(
      `session:${finalIdentity.id}:${deviceId}`,
      await this.redisRepository.hashToken(refreshToken),
      7 * 24 * 60 * 60,
    );
    const finalUser = { ...finalIdentity, ...(await this.userRepository.getOwnRelationships(finalIdentity.id)) };
    return { user: finalUser, tokens: this.issueTokens(finalUser, refreshToken, deviceId), eligibility };
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

  private isSessionAvailable(user: UserRecord): boolean {
    return (user.accountStatus ?? 'active') !== 'deleted';
  }

  private async currentEligibilityDecision(userId: string): Promise<EligibilityDecision> {
    try {
      return await this.eligibilityService.decisionFor(userId);
    } catch {
      throw new EligibilityDecisionUnavailableError();
    }
  }

  private assertSessionAvailable(user: UserRecord): void {
    if (!this.isSessionAvailable(user)) throw new Error("Account is unavailable");
  }
}
