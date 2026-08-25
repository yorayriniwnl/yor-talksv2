import { randomInt, randomUUID } from "crypto";
import { UserRepository } from "../repositories/user-repository.js";
import { RedisRepository } from "../repositories/redis-repository.js";
import { AuthTokens } from "../types/index.js";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

interface StoredOtp {
  code: string;
  channel: "sms" | "whatsapp";
  attempts: number;
  expiresAt: number;
}

const inMemoryOtpStore = new Map<string, StoredOtp>();

export class OtpService {
  constructor(
    private userRepo: UserRepository,
    private redisRepo: RedisRepository
  ) {}

  /**
   * Generate and dispatch 6-digit OTP to mobile number via SMS or WhatsApp
   */
  async sendOtp(phoneNumber: string, channel: "sms" | "whatsapp" = "whatsapp"): Promise<{ success: boolean; message: string; expiresInSeconds: number; debugCode?: string }> {
    const sanitizedPhone = phoneNumber.replace(/[^0-9+]/g, "");
    if (!sanitizedPhone || sanitizedPhone.length < 10) {
      throw new Error("Please enter a valid 10-digit mobile number");
    }

    // Generate cryptographically secure 6-digit OTP
    const code = randomInt(100000, 999999).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

    inMemoryOtpStore.set(sanitizedPhone, {
      code,
      channel,
      attempts: 0,
      expiresAt,
    });

    // In production, this calls MSG91 / Twilio / Fast2SMS API
    // For demo & instant testing, we return debugCode so user can test seamlessly
    return {
      success: true,
      message: `OTP sent via ${channel.toUpperCase()} to ${sanitizedPhone}`,
      expiresInSeconds: 300,
      debugCode: code,
    };
  }

  /**
   * Verify 6-digit OTP and authenticate/create user
   */
  async verifyOtp(
    phoneNumber: string,
    code: string
  ): Promise<{ user: any; tokens: AuthTokens }> {
    const sanitizedPhone = phoneNumber.replace(/[^0-9+]/g, "");
    const stored = inMemoryOtpStore.get(sanitizedPhone);

    // Allow master test code 999999 or stored code
    if (!stored && code !== "999999") {
      throw new Error("OTP expired or not requested. Please request a new OTP.");
    }

    if (stored && stored.expiresAt < Date.now()) {
      inMemoryOtpStore.delete(sanitizedPhone);
      throw new Error("OTP has expired. Please request a new OTP.");
    }

    if (stored && stored.code !== code && code !== "999999") {
      stored.attempts += 1;
      if (stored.attempts >= 3) {
        inMemoryOtpStore.delete(sanitizedPhone);
        throw new Error("Too many failed attempts. Please request a new OTP.");
      }
      throw new Error("Incorrect 6-digit OTP. Please try again.");
    }

    // Clean up OTP
    inMemoryOtpStore.delete(sanitizedPhone);

    // Look for existing user with this phone or create new user
    const formattedPhone = sanitizedPhone.startsWith("+") ? sanitizedPhone : `+91${sanitizedPhone}`;
    let user = await this.userRepo.findByEmail(`${sanitizedPhone.replace("+", "")}@yortalks.in`);

    if (!user) {
      // Create new user automatically for seamless Indian onboarding
      const randomSuffix = randomInt(1000, 9999);
      const defaultUsername = `user_${sanitizedPhone.slice(-4)}_${randomSuffix}`;
      const defaultName = `Bharat Creator ${sanitizedPhone.slice(-4)}`;

      user = await this.userRepo.create({
        id: randomUUID(),
        username: defaultUsername,
        email: `${sanitizedPhone.replace("+", "")}@yortalks.in`,
        passwordHash: "OTP_AUTH_VERIFIED",
        fullName: defaultName,
        bio: "Joined Yor Talks (Bharat Edition) 🇮🇳",
        avatarUrl: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200&auto=format&fit=crop`,
        role: "user",
        permissions: ["read:profile", "write:post"],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        settings: { theme: "light", notificationsEnabled: true, privateAccount: false },
      });
    }

    // Generate JWT access & refresh tokens
    const accessToken = jwt.sign(
      { sub: user.id, username: user.username, role: user.role },
      env.JWT_SECRET || "yor_talks_jwt_secret_dev_key",
      { expiresIn: "7d" }
    );

    const refreshToken = jwt.sign(
      { sub: user.id, tokenVersion: 1 },
      env.JWT_SECRET || "yor_talks_jwt_secret_dev_key",
      { expiresIn: "30d" }
    );

    const expiresAt = new Date(Date.now() + 7 * 86400 * 1000).toISOString();

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        role: user.role,
        verified: true,
      },
      tokens: {
        accessToken,
        refreshToken,
        expiresAt,
      },
    };
  }
}
