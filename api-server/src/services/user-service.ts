import { randomUUID } from "node:crypto";
import { emitToUser } from "../lib/realtime.js";
import { NotificationRepository } from "../repositories/notification-repository.js";
import { UserRepository } from "../repositories/user-repository.js";
import { QueueService } from "./queue-service.js";
import type { FollowRequestRecord, UserRecord, UserSettings } from "../types/index.js";
import { ContactShieldService } from "./contact-shield-service.js";
import { CreatorAnalyticsService } from "./creator-analytics-service.js";

export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly notificationRepository?: NotificationRepository,
    private readonly queueService?: QueueService,
    private readonly contactShieldService: ContactShieldService = new ContactShieldService(),
    private readonly creatorAnalyticsService: CreatorAnalyticsService = new CreatorAnalyticsService(),
  ) {}

  async getProfile(userId: string, viewerId?: string): Promise<UserRecord | undefined> {
    const user = await this.userRepository.findById(userId);
    if (!user || !(await this.canViewProfile(user, viewerId))) {
      return undefined;
    }
    if (viewerId && viewerId !== userId) void this.creatorAnalyticsService.recordProfileView(userId, viewerId);
    if (viewerId === userId) return { ...user, following: await this.userRepository.listFollowingIds(userId) };
    return user;
  }

  async getProfileByUsername(username: string, viewerId?: string): Promise<UserRecord | undefined> {
    const user = await this.userRepository.findByUsername(username.trim().toLowerCase());
    if (!user || !(await this.canViewProfile(user, viewerId))) {
      return undefined;
    }
    if (viewerId && viewerId !== user.id) void this.creatorAnalyticsService.recordProfileView(user.id, viewerId);
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

  async followUser(userId: string, targetId: string): Promise<{ follower: UserRecord; target: UserRecord; status: "accepted" | "pending" } | undefined> {
    if (userId === targetId) {
      throw new Error("Cannot follow yourself");
    }
    const follower = await this.userRepository.findById(userId);
    const target = await this.userRepository.findById(targetId);
    if (!follower || !target) {
      return undefined;
    }
    if (!(await this.contactShieldService.canView(userId, targetId)) || (target.blockedUsers ?? []).includes(userId)) {
      return undefined;
    }
    if (await this.userRepository.isFollowing(userId, targetId)) {
      return {
        follower: (await this.userRepository.findById(userId)) ?? follower,
        target: (await this.userRepository.findById(targetId)) ?? target,
        status: "accepted",
      };
    }

    const requiresApproval = target.settings?.privateAccount === true
      || target.privacy?.profileVisibility === "private"
      || target.privacy?.profileVisibility === "followers";
    if (requiresApproval) {
      const existingRequest = await this.userRepository.findFollowRequest(userId, targetId);
      const request = await this.userRepository.createFollowRequest(userId, targetId);
      if (request.status === "pending" && existingRequest?.status !== "pending") {
        const followNotification = await this.notificationRepository?.create({
          id: randomUUID(),
          recipientId: targetId,
          type: "follow_request",
          title: "Follow request",
          message: `${follower.username} requested to follow you`,
          relatedId: request.id,
          createdAt: new Date().toISOString(),
          readAt: null,
          metadata: { actorId: userId, requestId: request.id },
        });
        if (followNotification) {
          await this.queueService?.enqueue("notification:deliver", followNotification);
          emitToUser(targetId, "notification:new", followNotification);
        }
      }
      return {
        follower: (await this.userRepository.findById(userId)) ?? follower,
        target: (await this.userRepository.findById(targetId)) ?? target,
        status: "pending",
      };
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
      status: "accepted",
    };
  }

  async unfollowUser(userId: string, targetId: string): Promise<{ follower: UserRecord; target: UserRecord } | undefined> {
    const follower = await this.userRepository.findById(userId);
    const target = await this.userRepository.findById(targetId);
    if (!follower || !target) {
      return undefined;
    }
    await this.userRepository.unfollowUser(userId, targetId);
    await this.userRepository.removeFollowRequest(userId, targetId);
    return {
      follower: (await this.userRepository.findById(userId)) ?? follower,
      target: (await this.userRepository.findById(targetId)) ?? target,
    };
  }

  async getFollowers(userId: string, viewerId?: string): Promise<UserRecord[]> {
    const owner = await this.userRepository.findById(userId);
    if (!owner || !(await this.canViewProfile(owner, viewerId))) return [];
    return this.contactShieldService.filterVisibleUsers(viewerId, await this.userRepository.listFollowers(userId));
  }

  async listFollowRequests(targetId: string): Promise<Array<{ request: FollowRequestRecord; requester: UserRecord }>> {
    return this.userRepository.listPendingFollowRequests(targetId);
  }

  async acceptFollowRequest(requestId: string, targetId: string): Promise<{ request: FollowRequestRecord; follower: UserRecord; target: UserRecord } | undefined> {
    const request = await this.userRepository.findFollowRequestById(requestId, targetId);
    if (!request || request.status !== "pending") return undefined;
    const requester = await this.userRepository.findById(request.requesterId);
    const target = await this.userRepository.findById(targetId);
    if (!requester || !target) return undefined;
    await this.userRepository.followUser(request.requesterId, targetId);
    const updatedRequest = await this.userRepository.setFollowRequestStatus(requestId, targetId, "accepted");
    if (!updatedRequest) return undefined;
    const notification = await this.notificationRepository?.create({
      id: randomUUID(),
      recipientId: request.requesterId,
      type: "follow_request_accepted",
      title: "Follow request accepted",
      message: `${target.username} accepted your follow request`,
      relatedId: targetId,
      createdAt: new Date().toISOString(),
      readAt: null,
      metadata: { actorId: targetId },
    });
    if (notification) {
      await this.queueService?.enqueue("notification:deliver", notification);
      emitToUser(request.requesterId, "notification:new", notification);
    }
    return {
      request: updatedRequest,
      follower: (await this.userRepository.findById(request.requesterId)) ?? requester,
      target: (await this.userRepository.findById(targetId)) ?? target,
    };
  }

  async rejectFollowRequest(requestId: string, targetId: string): Promise<FollowRequestRecord | undefined> {
    return this.userRepository.setFollowRequestStatus(requestId, targetId, "rejected");
  }

  async getFollowing(userId: string, viewerId?: string): Promise<UserRecord[]> {
    const owner = await this.userRepository.findById(userId);
    if (!owner || !(await this.canViewProfile(owner, viewerId))) return [];
    return this.contactShieldService.filterVisibleUsers(viewerId, await this.userRepository.listFollowing(userId));
  }

  async listFavoriteCreatorIds(userId: string): Promise<string[]> {
    return this.userRepository.listFavoriteCreatorIds(userId);
  }

  async listCloseFriends(userId: string): Promise<UserRecord[]> {
    const ids = await this.userRepository.listCloseFriendIds(userId);
    if (ids.length === 0) return [];
    const users = await Promise.all(ids.map((id) => this.userRepository.findById(id)));
    return users.filter((user): user is UserRecord => Boolean(user));
  }

  async setCloseFriend(userId: string, friendId: string, enabled: boolean): Promise<{ friendId: string; closeFriend: boolean } | undefined> {
    if (userId === friendId) throw new Error("Cannot add yourself to Close Friends");
    const [owner, friend] = await Promise.all([
      this.userRepository.findById(userId),
      this.userRepository.findById(friendId),
    ]);
    if (!owner || !friend || !(await this.contactShieldService.canView(userId, friendId))) return undefined;
    if (enabled) await this.userRepository.addCloseFriend(userId, friendId);
    else await this.userRepository.removeCloseFriend(userId, friendId);
    return { friendId, closeFriend: enabled };
  }

  async setFavoriteCreator(userId: string, creatorId: string, favorite: boolean): Promise<{ creatorId: string; favorite: boolean } | undefined> {
    if (userId === creatorId) {
      throw new Error("Cannot favorite yourself");
    }
    const [viewer, creator] = await Promise.all([
      this.userRepository.findById(userId),
      this.userRepository.findById(creatorId),
    ]);
    if (!viewer || !creator || !(await this.contactShieldService.canView(userId, creatorId))) return undefined;

    if (favorite) {
      await this.userRepository.addFavoriteCreator(userId, creatorId);
    } else {
      await this.userRepository.removeFavoriteCreator(userId, creatorId);
    }
    return { creatorId, favorite };
  }

  async updateSettings(userId: string, settings: UserSettings): Promise<UserRecord | undefined> {
    const user = await this.userRepository.findById(userId);
    if (!user) return undefined;
    return this.userRepository.update(userId, { settings: { ...(user.settings ?? {}), ...settings } });
  }

  async blockUser(userId: string, targetId: string): Promise<UserRecord | undefined> {
    if (userId === targetId) {
      throw new Error("Cannot block yourself");
    }
    const user = await this.userRepository.findById(userId);
    if (!user) return undefined;
    const target = await this.userRepository.findById(targetId);
    if (!target) return undefined;
    const blockedUsers = [...(user.blockedUsers ?? [])];
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
    const target = await this.userRepository.findById(targetId);
    if (!target) return undefined;
    const mutedUsers = [...(user.mutedUsers ?? [])];
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

  private async canViewProfile(user: UserRecord, viewerId?: string): Promise<boolean> {
    const viewer = viewerId ?? user.id;
    if (!(await this.contactShieldService.canView(viewer, user.id))) return false;
    if (viewer === user.id) return true;
    const visibility = user.privacy?.profileVisibility ?? (user.settings?.privateAccount ? "private" : "public");
    if (visibility === "private") return false;
    if (visibility === "followers") return this.userRepository.isFollowing(viewer, user.id);
    return true;
  }
}
