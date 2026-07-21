import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import { env } from "../config/env.js";
import { RedisRepository } from "../repositories/redis-repository.js";
import { UserRepository } from "../repositories/user-repository.js";
import type { AuthTokens, UserRecord } from "../types/index.js";

export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly redisRepository: RedisRepository = new RedisRepository(),
  ) {}

  async register(input: {
    username: string;
    email: string;
    password: string;
    fullName: string;
  }): Promise<{ user: UserRecord; tokens: AuthTokens }> {
    const existingEmail = await this.userRepository.findByEmail(input.email);
    const existingUsername = await this.userRepository.findByUsername(input.username);
    const existing = existingEmail ?? existingUsername;
    
    if (existing) {
      throw new Error("User already exists");
    }

    const passwordHash = await bcrypt.hash(input.password, 10);
    const user: UserRecord = {
      id: randomUUID(),
      username: input.username,
      email: input.email,
      passwordHash,
      fullName: input.fullName,
      bio: "",
      avatarUrl: null,
      role: "user",
      permissions: ["read:profile", "write:post"],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      followers: [],
      following: [],
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
      tokens: this.issueTokens(user, refreshToken),
    };
  }

  async login(input: { identifier: string; password: string }): Promise<{ user: UserRecord; tokens: AuthTokens }> {
    const byEmail = await this.userRepository.findByEmail(input.identifier);
    const user = byEmail ?? await this.userRepository.findByUsername(input.identifier);
    if (!user) {
      throw new Error("Invalid credentials");
    }

    const valid = await bcrypt.compare(input.password, user.passwordHash);
    if (!valid) {
      throw new Error("Invalid credentials");
    }

    const deviceId = randomUUID();
    const refreshToken = this.issueRefreshToken(user, deviceId);
    await this.redisRepository.set(`session:${user.id}:${deviceId}`, refreshToken, 7 * 24 * 60 * 60);
    const updatedUser = await this.userRepository.update(user.id, { lastLoginAt: new Date().toISOString() });
    return {
      user: updatedUser ?? user,
      tokens: this.issueTokens(updatedUser ?? user, refreshToken),
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
      return this.issueTokens(user, refreshToken);
    } catch {
      return undefined;
    }
  }

  async resetPassword(email: string): Promise<void> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      return;
    }
    await this.userRepository.update(user.id, { passwordResetRequired: true });
  }

  async verifyEmail(userId: string): Promise<UserRecord | undefined> {
    return this.userRepository.update(userId, { emailVerified: true });
  }

  async updatePrivacy(userId: string, privacy: UserRecord["privacy"]): Promise<UserRecord | undefined> {
    return this.userRepository.update(userId, { privacy });
  }

  private issueTokens(user: UserRecord, refreshToken: string): AuthTokens {
    const accessToken = jwt.sign({ sub: user.id, role: user.role, permissions: user.permissions }, env.JWT_SECRET, {
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
