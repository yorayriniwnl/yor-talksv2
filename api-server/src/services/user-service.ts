import { randomUUID } from "node:crypto";
import { emitToUser } from "../lib/realtime.js";
import { NotificationRepository } from "../repositories/notification-repository.js";
import { UserRepository } from "../repositories/user-repository.js";
import { QueueService } from "./queue-service.js";
import type { FollowRequestRecord, UserRecord, UserSettings } from "../types/index.js";
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
    if (!user || !(await this.canViewProfile(user, viewerId))) {
      return undefined;
    }
    return user;
  }

  async getProfileByUsername(username: string, viewerId?: string): Promise<UserRecord | undefined> {
    const user = await this.userRepository.findByUsername(username.trim().toLowerCase());
    if (!user || !(await this.canViewProfile(user, viewerId))) {
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
    const visibility = user.privacy?.profileVisibility ?? "public";
    if (visibility === "private") return false;
    if (visibility === "followers") return this.userRepository.isFollowing(viewer, user.id);
    return true;
  }
}
