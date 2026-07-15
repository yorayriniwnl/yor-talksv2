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
    const existing = this.userRepository.findByEmail(input.email) ?? this.userRepository.findByUsername(input.username);
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
      },
    };

    this.userRepository.create(user);
    await this.redisRepository.set(`session:${user.id}`, this.issueRefreshToken(user), 7 * 24 * 60 * 60);
    return {
      user,
      tokens: this.issueTokens(user),
    };
  }

  async login(input: { identifier: string; password: string }): Promise<{ user: UserRecord; tokens: AuthTokens }> {
    const user = this.userRepository.findByEmail(input.identifier) ?? this.userRepository.findByUsername(input.identifier);
    if (!user) {
      throw new Error("Invalid credentials");
    }

    const valid = await bcrypt.compare(input.password, user.passwordHash);
    if (!valid) {
      throw new Error("Invalid credentials");
    }

    await this.redisRepository.set(`session:${user.id}`, this.issueRefreshToken(user), 7 * 24 * 60 * 60);
    return {
      user,
      tokens: this.issueTokens(user),
    };
  }

  async logoutAllDevices(userId: string): Promise<void> {
    await this.redisRepository.del(`session:${userId}`);
  }

  async resetPassword(_email: string): Promise<void> {
    return undefined;
  }

  private issueTokens(user: UserRecord): AuthTokens {
    const accessToken = jwt.sign({ sub: user.id, role: user.role, permissions: user.permissions }, env.JWT_SECRET, {
      expiresIn: "15m",
    });
    const refreshToken = this.issueRefreshToken(user);
    return { accessToken, refreshToken };
  }

  private issueRefreshToken(user: UserRecord): string {
    return jwt.sign({ sub: user.id, type: "refresh" }, env.JWT_REFRESH_SECRET, {
      expiresIn: "7d",
    });
  }
}
