import { withApprovedMedia, mediaBinding, rejectRawMedia } from "./media-publication.js";
import { randomUUID } from "node:crypto";
import { emitToUser } from "../lib/realtime.js";
import { NotificationRepository } from "../repositories/notification-repository.js";
import { UserRepository } from "../repositories/user-repository.js";
import { QueueService } from "./queue-service.js";
import type { FollowRequestRecord, UserRecord, UserSettings } from "../types/index.js";
import { ContactShieldService } from "./contact-shield-service.js";
import { CreatorAnalyticsService } from "./creator-analytics-service.js";
import { FeatureEntitlementService } from "./feature-entitlement-service.js";
import { assertPremiumProfileSelection, PREMIUM_APP_ICONS, PREMIUM_BIO_STYLES, PREMIUM_MESSAGE_STYLES, PREMIUM_STORY_STYLES, requiredPremiumFeatures, type PremiumProfileSelection } from "../features/premium-profile.js";
import { EligibilityService } from "./eligibility-service.js";
import { ContactAuthorizationService } from "./contact-authorization-service.js";
import type { EligibilityDecision } from "../eligibility/types.js";
import { isEligibilityEnforcementEnabled } from "../eligibility/enforcement.js";
import { ProfileVisibilityService } from './profile-visibility-service.js';

export class PremiumProfileFeatureUnavailableError extends Error {}
export class PremiumStoryViewFeatureUnavailableError extends Error {}

export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly notificationRepository?: NotificationRepository,
    private readonly queueService?: QueueService,
    private readonly contactShieldService: ContactShieldService = new ContactShieldService(),
    private readonly creatorAnalyticsService: CreatorAnalyticsService = new CreatorAnalyticsService(),
    private readonly entitlementService: FeatureEntitlementService = new FeatureEntitlementService(),
    private readonly eligibilityService: EligibilityService = new EligibilityService(),
    private readonly contactAuthorization: ContactAuthorizationService = new ContactAuthorizationService(),
    private readonly profileVisibility = new ProfileVisibilityService(userRepository, contactShieldService, eligibilityService),
  ) {}

  async getProfile(userId: string, viewerId?: string): Promise<UserRecord | undefined> {
    const user = await this.userRepository.findById(userId);
    if (!user) return undefined;
    if (viewerId === userId) return { ...user, ...(await this.userRepository.getOwnRelationships(userId)) };
    if (!(await this.canViewProfile(user, viewerId))) return undefined;
    if (viewerId) void this.creatorAnalyticsService.recordProfileView(userId, viewerId);
    return this.withoutPreciseLocation(user);
  }

  /** Minimal repository read for the restricted owner account summary. */
  async getOwnAccount(userId: string): Promise<UserRecord | undefined> {
    return this.userRepository.findById(userId);
  }

  async getProfileByUsername(username: string, viewerId?: string): Promise<UserRecord | undefined> {
    const user = await this.userRepository.findByUsername(username.trim().toLowerCase());
    if (!user) return undefined;
    if (viewerId === user.id) return { ...user, ...(await this.userRepository.getOwnRelationships(user.id)) };
    if (!(await this.canViewProfile(user, viewerId))) return undefined;
    if (viewerId) void this.creatorAnalyticsService.recordProfileView(user.id, viewerId);
    return this.withoutPreciseLocation(user);
  }

  async updateProfile(userId: string, updates: Pick<Partial<UserRecord>, "fullName" | "bio"> & { avatarMediaId?: string }): Promise<UserRecord | undefined> {
    rejectRawMedia(updates, ["avatarUrl"]);
    return withApprovedMedia(userId, mediaBinding(updates.avatarMediaId, "avatar", "avatarUrl", "image"), { type: "users", id: userId }, media => this.userRepository.update(userId, {
      ...(updates.fullName !== undefined ? { fullName: updates.fullName } : {}),
      ...(updates.bio !== undefined ? { bio: updates.bio } : {}),
      ...(updates.avatarMediaId !== undefined ? { avatarUrl: media.avatarUrl[0].url } : {}),
    }));
  }

  async updatePremiumProfile(userId: string, updates: Partial<PremiumProfileSelection>): Promise<UserRecord | undefined> {
    const current = await this.userRepository.findById(userId);
    if (!current) return undefined;
    const selection = assertPremiumProfileSelection({
      bioStyleId: updates.bioStyleId ?? current.bioStyleId,
      messageFontId: updates.messageFontId ?? current.messageFontId,
      storyFontId: updates.storyFontId ?? current.storyFontId,
      appIconId: updates.appIconId ?? current.appIconId,
    });
    // Preserved historical styles must not block changing a different field back
    // to a free default after expiry. Authorize only the requested selections.
    const required = requiredPremiumFeatures(updates);
    const snapshot = typeof this.entitlementService.getSnapshot === 'function' ? await this.entitlementService.getSnapshot(userId) : null;
    const available = snapshot ? required.map(feature => snapshot[feature]) : await Promise.all(required.map((feature) => this.entitlementService.hasFeature(userId, feature)));
    if (available.some((enabled) => !enabled)) {
      throw new PremiumProfileFeatureUnavailableError("One or more premium profile styles are not enabled for this account");
    }
    return this.userRepository.update(userId, selection);
  }

  async getPremiumProfileOptions(userId: string): Promise<{
    selection: PremiumProfileSelection;
    options: {
      bioStyles: typeof PREMIUM_BIO_STYLES;
      messageStyles: typeof PREMIUM_MESSAGE_STYLES;
      storyStyles: typeof PREMIUM_STORY_STYLES;
      appIcons: typeof PREMIUM_APP_ICONS;
    };
    enabledFeatures: Awaited<ReturnType<FeatureEntitlementService["getSnapshot"]>>;
  } | undefined> {
    const user = await this.userRepository.findById(userId);
    if (!user) return undefined;
    return {
      selection: assertPremiumProfileSelection(user),
      options: {
        bioStyles: PREMIUM_BIO_STYLES,
        messageStyles: PREMIUM_MESSAGE_STYLES,
        storyStyles: PREMIUM_STORY_STYLES,
        appIcons: PREMIUM_APP_ICONS,
      },
      enabledFeatures: await this.entitlementService.getSnapshot(userId),
    };
  }

  async uploadAvatar(userId: string, avatarMediaId: string): Promise<UserRecord | undefined> {
    return this.updateProfile(userId, { avatarMediaId });
  }

  async searchUsers(search: string, viewerId?: string): Promise<UserRecord[]> {
    const candidates = await this.userRepository.list(search);
    const visible = await this.profileVisibility.filter(candidates, viewerId, { discovery: true });
    return visible.map(user => this.withoutPreciseLocation(user));
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
        follower: this.withoutPreciseLocation((await this.userRepository.findById(userId)) ?? follower),
        target: this.withoutPreciseLocation((await this.userRepository.findById(targetId)) ?? target),
        status: "accepted",
      };
    }

    const eligibilityEnforced = isEligibilityEnforcementEnabled();
    const targetDecision = eligibilityEnforced ? await this.eligibilityService.decisionFor(targetId) : undefined;
    const minorOrUnverified = eligibilityEnforced && targetDecision?.experience !== "adult_18_plus";
    const requiresApproval = minorOrUnverified
      || target.settings?.privateAccount === true
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
        follower: this.withoutPreciseLocation((await this.userRepository.findById(userId)) ?? follower),
        target: this.withoutPreciseLocation((await this.userRepository.findById(targetId)) ?? target),
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
      follower: this.withoutPreciseLocation((await this.userRepository.findById(userId)) ?? follower),
      target: this.withoutPreciseLocation((await this.userRepository.findById(targetId)) ?? target),
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
      follower: this.withoutPreciseLocation((await this.userRepository.findById(userId)) ?? follower),
      target: this.withoutPreciseLocation((await this.userRepository.findById(targetId)) ?? target),
    };
  }

  async getFollowers(userId: string, viewerId?: string): Promise<UserRecord[]> {
    const owner = await this.userRepository.findById(userId);
    if (!owner || !(await this.canViewProfile(owner, viewerId))) return [];
    const followers = await this.userRepository.listFollowers(userId);
    const visible = await this.profileVisibility.filter(followers, viewerId);
    return visible.map(user => this.withoutPreciseLocation(user));
  }

  async listFollowRequests(targetId: string): Promise<Array<{ request: FollowRequestRecord; requester: UserRecord }>> {
    const requests = await this.userRepository.listPendingFollowRequests(targetId);
    return requests.map(({ request, requester }) => ({ request, requester: this.withoutPreciseLocation(requester) }));
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
      follower: this.withoutPreciseLocation((await this.userRepository.findById(request.requesterId)) ?? requester),
      target: this.withoutPreciseLocation((await this.userRepository.findById(targetId)) ?? target),
    };
  }

  async rejectFollowRequest(requestId: string, targetId: string): Promise<FollowRequestRecord | undefined> {
    return this.userRepository.setFollowRequestStatus(requestId, targetId, "rejected");
  }

  async getFollowing(userId: string, viewerId?: string): Promise<UserRecord[]> {
    const owner = await this.userRepository.findById(userId);
    if (!owner || !(await this.canViewProfile(owner, viewerId))) return [];
    const following = await this.userRepository.listFollowing(userId);
    const visible = await this.profileVisibility.filter(following, viewerId);
    return visible.map(user => this.withoutPreciseLocation(user));
  }

  async listFavoriteCreatorIds(userId: string): Promise<string[]> {
    return this.userRepository.listFavoriteCreatorIds(userId);
  }

  async listCloseFriends(userId: string): Promise<UserRecord[]> {
    const ids = await this.userRepository.listCloseFriendIds(userId);
    if (ids.length === 0) return [];
    const users = new Map((await this.userRepository.findByIds(ids)).map(user => [user.id, user]));
    return ids.flatMap(id => users.has(id) ? [this.withoutPreciseLocation(users.get(id)!)] : []);
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

  async updateSettings(userId: string, settings: Partial<UserSettings>): Promise<UserRecord | undefined> {
    let decision: EligibilityDecision | undefined;
    try {
      decision = await this.eligibilityService.decisionFor(userId);
    } catch {
      // A missing current decision cannot be replaced by a client preference.
      decision = undefined;
    }
    let effectiveSettings = this.clampSettings(settings, decision);
    if (effectiveSettings.storyViewMode === "private" && !(await this.entitlementService.hasFeature(userId, "STORY_PRIVATE_VIEW"))) {
      throw new PremiumStoryViewFeatureUnavailableError("Private story viewing is not enabled for this account");
    }
    try {
      decision = await this.eligibilityService.decisionFor(userId);
    } catch {
      decision = undefined;
    }
    effectiveSettings = this.clampSettings(settings, decision);
    return this.userRepository.patchSettings(userId, effectiveSettings);
  }

  async blockUser(userId: string, targetId: string): Promise<UserRecord | undefined> {
    if (userId === targetId) {
      throw new Error("Cannot block yourself");
    }
    const target = await this.userRepository.findById(targetId);
    if (!target) return undefined;
    return this.contactAuthorization.blockPair(userId, targetId);
  }

  async unblockUser(userId: string, targetId: string): Promise<UserRecord | undefined> {
    return this.userRepository.setSafetyRelationship(userId, targetId, "blockedUsers", false);
  }

  async muteUser(userId: string, targetId: string): Promise<UserRecord | undefined> {
    if (userId === targetId) {
      throw new Error("Cannot mute yourself");
    }
    const target = await this.userRepository.findById(targetId);
    if (!target) return undefined;
    return this.userRepository.setSafetyRelationship(userId, targetId, "mutedUsers", true);
  }

  async unmuteUser(userId: string, targetId: string): Promise<UserRecord | undefined> {
    return this.userRepository.setSafetyRelationship(userId, targetId, "mutedUsers", false);
  }

  private async canViewProfile(user: UserRecord, viewerId?: string): Promise<boolean> {
    return this.profileVisibility.canView(user, viewerId);
  }

  private clampSettings(settings: Partial<UserSettings>, decision?: EligibilityDecision): Partial<UserSettings> {
    if (decision?.activated && decision.experience === "adult_18_plus" && decision.capabilities.social) return settings;
    return {
      ...settings,
      privateAccount: true,
      notificationsEnabled: false,
      allowMentions: false,
      autoplayEnabled: false,
      readReceiptsEnabled: false,
      streaksEnabled: false,
      sharePreciseLocation: false,
      contentFilter: "child_safe",
    };
  }

  /** Precise location is never included in a social profile DTO. */
  private withoutPreciseLocation<T extends UserRecord>(user: T): T {
    const { location: _location, ...safeUser } = user as T & { location?: unknown };
    return safeUser as T;
  }
}
