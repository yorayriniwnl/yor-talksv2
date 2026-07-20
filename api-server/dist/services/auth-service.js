import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import { env } from "../config/env.js";
import { RedisRepository } from "../repositories/redis-repository.js";
export class AuthService {
    userRepository;
    redisRepository;
    constructor(userRepository, redisRepository = new RedisRepository()) {
        this.userRepository = userRepository;
        this.redisRepository = redisRepository;
    }
    async register(input) {
        const existingEmail = await this.userRepository.findByEmail(input.email);
        const existingUsername = await this.userRepository.findByUsername(input.username);
        const existing = existingEmail ?? existingUsername;
        if (existing) {
            throw new Error("User already exists");
        }
        const passwordHash = await bcrypt.hash(input.password, 10);
        const user = {
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
        const refreshToken = this.issueRefreshToken(user);
        await this.redisRepository.set(`session:${user.id}`, refreshToken, 7 * 24 * 60 * 60);
        return {
            user,
            tokens: this.issueTokens(user, refreshToken),
        };
    }
    async login(input) {
        const byEmail = await this.userRepository.findByEmail(input.identifier);
        const user = byEmail ?? await this.userRepository.findByUsername(input.identifier);
        if (!user) {
            throw new Error("Invalid credentials");
        }
        const valid = await bcrypt.compare(input.password, user.passwordHash);
        if (!valid) {
            throw new Error("Invalid credentials");
        }
        const refreshToken = this.issueRefreshToken(user);
        await this.redisRepository.set(`session:${user.id}`, refreshToken, 7 * 24 * 60 * 60);
        const updatedUser = await this.userRepository.update(user.id, { lastLoginAt: new Date().toISOString() });
        return {
            user: updatedUser ?? user,
            tokens: this.issueTokens(updatedUser ?? user, refreshToken),
        };
    }
    async logoutAllDevices(userId) {
        await this.redisRepository.del(`session:${userId}`);
    }
    async refreshAccessToken(refreshToken) {
        try {
            const payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET);
            const userId = payload.sub;
            if (!userId) {
                return undefined;
            }
            const user = await this.userRepository.findById(userId);
            if (!user) {
                return undefined;
            }
            const storedToken = await this.redisRepository.get(`session:${user.id}`);
            if (!storedToken || storedToken !== refreshToken) {
                return undefined;
            }
            return this.issueTokens(user, refreshToken);
        }
        catch {
            return undefined;
        }
    }
    async resetPassword(email) {
        const user = await this.userRepository.findByEmail(email);
        if (!user) {
            return;
        }
        await this.userRepository.update(user.id, { passwordResetRequired: true });
    }
    async verifyEmail(userId) {
        return this.userRepository.update(userId, { emailVerified: true });
    }
    async updatePrivacy(userId, privacy) {
        return this.userRepository.update(userId, { privacy });
    }
    issueTokens(user, refreshToken) {
        const accessToken = jwt.sign({ sub: user.id, role: user.role, permissions: user.permissions }, env.JWT_SECRET, {
            expiresIn: "15m",
        });
        return { accessToken, refreshToken, expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString() };
    }
    issueRefreshToken(user) {
        return jwt.sign({ sub: user.id, type: "refresh" }, env.JWT_REFRESH_SECRET, {
            expiresIn: "7d",
        });
    }
}
//# sourceMappingURL=auth-service.js.map