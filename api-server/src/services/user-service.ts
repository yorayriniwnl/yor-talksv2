import { randomUUID } from "node:crypto";
import { UserRepository } from "../repositories/user-repository.js";
import type { UserRecord, UserSettings } from "../types/index.js";

export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  getProfile(userId: string): UserRecord | undefined {
    return this.userRepository.findById(userId);
  }

  updateProfile(userId: string, updates: Partial<UserRecord>): UserRecord | undefined {
    return this.userRepository.update(userId, updates);
  }

  uploadAvatar(userId: string, avatarUrl: string): UserRecord | undefined {
    return this.userRepository.update(userId, { avatarUrl });
  }

  searchUsers(search: string): UserRecord[] {
    return this.userRepository.list(search);
  }

  followUser(userId: string, targetId: string): { follower: UserRecord; target: UserRecord } | undefined {
    const follower = this.userRepository.findById(userId);
    const target = this.userRepository.findById(targetId);
    if (!follower || !target) {
      return undefined;
    }
    if (!follower.following.includes(targetId)) {
      follower.following.push(targetId);
      target.followers.push(userId);
      this.userRepository.update(userId, { following: follower.following });
      this.userRepository.update(targetId, { followers: target.followers });
    }
    return { follower, target };
  }

  unfollowUser(userId: string, targetId: string): { follower: UserRecord; target: UserRecord } | undefined {
    const follower = this.userRepository.findById(userId);
    const target = this.userRepository.findById(targetId);
    if (!follower || !target) {
      return undefined;
    }
    follower.following = follower.following.filter((entry) => entry !== targetId);
    target.followers = target.followers.filter((entry) => entry !== userId);
    this.userRepository.update(userId, { following: follower.following });
    this.userRepository.update(targetId, { followers: target.followers });
    return { follower, target };
  }

  getFollowers(userId: string): UserRecord[] {
    const user = this.userRepository.findById(userId);
    if (!user) {
      return [];
    }
    return user.followers.map((id) => this.userRepository.findById(id)).filter(Boolean) as UserRecord[];
  }

  getFollowing(userId: string): UserRecord[] {
    const user = this.userRepository.findById(userId);
    if (!user) {
      return [];
    }
    return user.following.map((id) => this.userRepository.findById(id)).filter(Boolean) as UserRecord[];
  }

  updateSettings(userId: string, settings: UserSettings): UserRecord | undefined {
    return this.userRepository.update(userId, { settings });
  }
}
