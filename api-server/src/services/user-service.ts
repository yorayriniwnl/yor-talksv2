import { randomUUID } from "node:crypto";
import { emitToUser } from "../lib/realtime.js";
import { NotificationRepository } from "../repositories/notification-repository.js";
import { UserRepository } from "../repositories/user-repository.js";
import { QueueService } from "./queue-service.js";
import type { UserRecord, UserSettings } from "../types/index.js";
import { ContactShieldService } from "./contact-shield-service.js";

export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly notificationRepository?: NotificationRepository,
    private readonly queueService?: QueueService,
    private readonly contactShieldService: ContactShieldService = new ContactShieldService(),
  ) {}

  async getProfile(userId: string, viewerId?: string): Promise<UserRecord | undefined> {
    const user = await this.userRepository.findById(userId);
    if (!user || !(await this.contactShieldService.canView(viewerId ?? userId, userId))) {
      return undefined;
    }
    return user;
  }

  async updateProfile(userId: string, updates: Partial<UserRecord>): Promise<UserRecord | undefined> {
    return this.userRepository.update(userId, updates);
  }

  async uploadAvatar(userId: string, avatarUrl: string): Promise<UserRecord | undefined> {
    return this.userRepository.update(userId, { avatarUrl });
  }

  async searchUsers(search: string, viewerId?: string): Promise<UserRecord[]> {
    return this.contactShieldService.filterVisibleUsers(viewerId, await this.userRepository.list(search));
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
    if (!(await this.contactShieldService.canView(userId, targetId))) {
      return undefined;
    }
    const created = await this.userRepository.followUser(userId, targetId);
    if (created) {
      const followNotification = await this.notificationRepository?.create({
        id: randomUUID(),
        recipientId: targetId,
        type: "follow",
        title: "New follower",
        message: `${follower.username} started following you`,
        relatedId: null,
        createdAt: new Date().toISOString(),
        readAt: null,
        metadata: { actorId: userId },
      });
      if (followNotification) {
        await this.queueService?.enqueue("notification:deliver", followNotification);
        emitToUser(targetId, "notification:new", followNotification);
      }
    }
    return {
      follower: (await this.userRepository.findById(userId)) ?? follower,
      target: (await this.userRepository.findById(targetId)) ?? target,
    };
  }

  async unfollowUser(userId: string, targetId: string): Promise<{ follower: UserRecord; target: UserRecord } | undefined> {
    const follower = await this.userRepository.findById(userId);
    const target = await this.userRepository.findById(targetId);
    if (!follower || !target) {
      return undefined;
    }
    await this.userRepository.unfollowUser(userId, targetId);
    return {
      follower: (await this.userRepository.findById(userId)) ?? follower,
      target: (await this.userRepository.findById(targetId)) ?? target,
    };
  }

  async getFollowers(userId: string, viewerId?: string): Promise<UserRecord[]> {
    return this.contactShieldService.filterVisibleUsers(viewerId, await this.userRepository.listFollowers(userId));
  }

  async getFollowing(userId: string, viewerId?: string): Promise<UserRecord[]> {
    return this.contactShieldService.filterVisibleUsers(viewerId, await this.userRepository.listFollowing(userId));
  }

  async updateSettings(userId: string, settings: UserSettings): Promise<UserRecord | undefined> {
    return this.userRepository.update(userId, { settings });
  }

  async blockUser(userId: string, targetId: string): Promise<UserRecord | undefined> {
    if (userId === targetId) {
      throw new Error("Cannot block yourself");
    }
    const user = await this.userRepository.findById(userId);
    if (!user) return undefined;
    const blockedUsers = user.blockedUsers ?? [];
    if (!blockedUsers.includes(targetId)) {
      blockedUsers.push(targetId);
    }
    return this.userRepository.update(userId, { blockedUsers });
  }

  async unblockUser(userId: string, targetId: string): Promise<UserRecord | undefined> {
    const user = await this.userRepository.findById(userId);
    if (!user) return undefined;
    const blockedUsers = (user.blockedUsers ?? []).filter((id) => id !== targetId);
    return this.userRepository.update(userId, { blockedUsers });
  }

  async muteUser(userId: string, targetId: string): Promise<UserRecord | undefined> {
    if (userId === targetId) {
      throw new Error("Cannot mute yourself");
    }
    const user = await this.userRepository.findById(userId);
    if (!user) return undefined;
    const mutedUsers = user.mutedUsers ?? [];
    if (!mutedUsers.includes(targetId)) {
      mutedUsers.push(targetId);
    }
    return this.userRepository.update(userId, { mutedUsers });
  }

  async unmuteUser(userId: string, targetId: string): Promise<UserRecord | undefined> {
    const user = await this.userRepository.findById(userId);
    if (!user) return undefined;
    const mutedUsers = (user.mutedUsers ?? []).filter((id) => id !== targetId);
    return this.userRepository.update(userId, { mutedUsers });
  }
}
