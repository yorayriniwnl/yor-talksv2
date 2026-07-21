import { randomUUID } from "node:crypto";
import { UserRepository } from "../repositories/user-repository.js";
import type { UserRecord, UserSettings } from "../types/index.js";

export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  async getProfile(userId: string): Promise<UserRecord | undefined> {
    return this.userRepository.findById(userId);
  }

  async updateProfile(userId: string, updates: Partial<UserRecord>): Promise<UserRecord | undefined> {
    return this.userRepository.update(userId, updates);
  }

  async uploadAvatar(userId: string, avatarUrl: string): Promise<UserRecord | undefined> {
    return this.userRepository.update(userId, { avatarUrl });
  }

  async searchUsers(search: string): Promise<UserRecord[]> {
    return this.userRepository.list(search);
  }

  async followUser(userId: string, targetId: string): Promise<{ follower: UserRecord; target: UserRecord } | undefined> {
    if (userId === targetId) {
      throw new Error("Cannot follow yourself");
    }
    const follower = await this.userRepository.findById(userId);
    const target = await this.userRepository.findById(targetId);
    if (!follower || !target) {
      return undefined;
    }
    if (!follower.following.includes(targetId)) {
      follower.following.push(targetId);
      target.followers.push(userId);
      await this.userRepository.update(userId, { following: follower.following });
      await this.userRepository.update(targetId, { followers: target.followers });
    }
    return { follower, target };
  }

  async unfollowUser(userId: string, targetId: string): Promise<{ follower: UserRecord; target: UserRecord } | undefined> {
    const follower = await this.userRepository.findById(userId);
    const target = await this.userRepository.findById(targetId);
    if (!follower || !target) {
      return undefined;
    }
    follower.following = follower.following.filter((entry: string) => entry !== targetId);
    target.followers = target.followers.filter((entry: string) => entry !== userId);
    await this.userRepository.update(userId, { following: follower.following });
    await this.userRepository.update(targetId, { followers: target.followers });
    return { follower, target };
  }

  async getFollowers(userId: string): Promise<UserRecord[]> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      return [];
    }
    const followers = await Promise.all(user.followers.map((id: string) => this.userRepository.findById(id)));
    return followers.filter(Boolean) as UserRecord[];
  }

  async getFollowing(userId: string): Promise<UserRecord[]> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      return [];
    }
    const following = await Promise.all(user.following.map((id: string) => this.userRepository.findById(id)));
    return following.filter(Boolean) as UserRecord[];
  }

  async updateSettings(userId: string, settings: UserSettings): Promise<UserRecord | undefined> {
    return this.userRepository.update(userId, { settings });
  }
}
