import { randomUUID } from "node:crypto";
import { emitToUser } from "../lib/realtime.js";
import { NotificationRepository } from "../repositories/notification-repository.js";
import { StoryRepository, type StoryViewerRow } from "../repositories/story-repository.js";
import { UserRepository } from "../repositories/user-repository.js";
import type { HighlightRecord, StoryReaction, StoryRecord, StoryReactionType } from "../types/index.js";
import { DEFAULT_CONTENT_RATING } from "../utils/content-safety.js";
import { DEFAULT_CONTENT_CATEGORY } from "../utils/content-category.js";
import { evaluateAudience, type AudienceKind } from "../utils/audience-policy.js";
import { calculateStoryScore, resolveStoryDurationHours, selectViewerExposure, type StoryAnalyticsSummary, type StoryViewExposure } from "./story-analytics-service.js";
import { ContentSafetyService } from "./content-safety-service.js";
import { AIService } from "./ai-service.js";
import { enforceTextContentPolicy } from "./content-policy-service.js";
import { FeatureEntitlementService } from "./feature-entitlement-service.js";
import { QueueService } from "./queue-service.js";
import { isPremiumStoryStyle } from "../features/premium-profile.js";
import { isAdvancedStoryTextStyle, normalizeStoryTextStyle, type StoryTextStyle } from "../features/story-text-style.js";

export class PremiumFeatureUnavailableError extends Error {}

const EXTENDED_STORY_MAX_HOURS = 72;
const PRIORITY_BOOST = 20;

export function shouldNotifySuperHeart(previous: Pick<StoryReaction, "emoji" | "reactionType"> | undefined, nextEmoji: string): boolean {
  return !(previous?.reactionType === "SUPER_HEART" && previous.emoji === nextEmoji);
}

export class StoryService {
  constructor(
    private readonly storyRepository: StoryRepository,
    private readonly contentSafetyService: ContentSafetyService = new ContentSafetyService(),
    private readonly aiService: AIService = new AIService(),
    private readonly userRepository: UserRepository = new UserRepository(),
    private readonly entitlementService: FeatureEntitlementService = new FeatureEntitlementService(),
    private readonly notificationRepository: NotificationRepository = new NotificationRepository(),
    private readonly queueService: QueueService = new QueueService(),
  ) {}

  async createStory(input: {
    authorId: string;
    mediaUrl: string;
    type: string;
    textContent?: string;
    backgroundGradient?: string;
    storyFontId?: string;
    storyTextStyle?: StoryTextStyle;
    isHighlight: boolean;
    highlightTitle?: string;
    highlightId?: string;
    publishMode?: "active" | "highlight_only";
    durationHours?: number;
    priority?: boolean;
    audience?: StoryRecord["audience"];
    audienceMemberIds?: string[];
    audienceExclusionIds?: string[];
    contentCategory?: StoryRecord["contentCategory"];
    contentRating?: StoryRecord["contentRating"];
    poll?: { question: string; options: Array<{ text: string }> };
  }): Promise<StoryRecord> {
    const audience = (input.audience ?? "followers") as AudienceKind;
    const advancedAudience = ["selected_people", "everyone_except", "custom"].includes(audience);
    const [hasCustomAudience, hasExtendedStory, hasPriority, hasDirectHighlight, hasStoryFont] = await Promise.all([
      this.entitlementService.hasFeature(input.authorId, "CUSTOM_STORY_AUDIENCE"),
      this.entitlementService.hasFeature(input.authorId, "EXTENDED_STORY"),
      this.entitlementService.hasFeature(input.authorId, "STORY_PRIORITY"),
      this.entitlementService.hasFeature(input.authorId, "DIRECT_HIGHLIGHT"),
      this.entitlementService.hasFeature(input.authorId, "STORY_FONT"),
    ]);
    const storyFontId = input.storyFontId ?? "default";
    const storyTextStyle = normalizeStoryTextStyle(input.storyTextStyle);
    if (!isPremiumStoryStyle(storyFontId)) throw new Error("Story font is not supported");
    if (storyFontId !== "default" && !hasStoryFont) throw new PremiumFeatureUnavailableError("Story fonts are not enabled for this account");
    if (isAdvancedStoryTextStyle(storyTextStyle) && !hasStoryFont) throw new PremiumFeatureUnavailableError("Advanced story text styling is not enabled for this account");
    if (advancedAudience && !hasCustomAudience) throw new PremiumFeatureUnavailableError("Custom story audiences are not enabled for this account");
    if (input.priority && !hasPriority) throw new PremiumFeatureUnavailableError("Story priority is not enabled for this account");
    const publishMode = input.publishMode ?? "active";
    if (publishMode === "highlight_only" && !hasDirectHighlight) {
      throw new PremiumFeatureUnavailableError("Direct-to-Highlight publishing is not enabled for this account");
    }
    if (publishMode === "highlight_only" && !input.highlightId) {
      throw new Error("A Highlight is required for highlight-only publishing");
    }
    if (input.highlightId && (await this.storyRepository.getHighlightOwner(input.highlightId)) !== input.authorId) {
      throw new Error("You can only publish into your own Highlight");
    }

    const memberIds = [...new Set(input.audienceMemberIds ?? [])];
    const exclusionIds = [...new Set(input.audienceExclusionIds ?? [])];
    if (advancedAudience && [...memberIds, ...exclusionIds].length > 0) {
      const users = await Promise.all([...memberIds, ...exclusionIds].map((userId) => this.userRepository.findById(userId)));
      if (users.some((user) => !user)) throw new Error("Story audience contains an unknown account");
    }

    await enforceTextContentPolicy([
      input.textContent ?? "",
      input.poll?.question ?? "",
      ...(input.poll?.options ?? []).map((option) => option.text),
    ].join("\n"), this.aiService, "story");

    const now = new Date();
    const durationHours = resolveStoryDurationHours(input.durationHours, hasExtendedStory, EXTENDED_STORY_MAX_HOURS);
    const publishedAt = now.toISOString();
    const expiresAt = new Date(now.getTime() + durationHours * 60 * 60 * 1000).toISOString();
    const story: StoryRecord = {
      id: randomUUID(),
      authorId: input.authorId,
      mediaUrl: input.mediaUrl,
      type: input.type,
      textContent: input.textContent || null,
      backgroundGradient: input.backgroundGradient || null,
      storyFontId,
      storyTextStyle,
      createdAt: publishedAt,
      publishedAt,
      expiresAt,
      viewerIds: [],
      reactions: [],
      isHighlight: input.isHighlight || publishMode === "highlight_only" || Boolean(input.highlightId),
      highlightTitle: input.highlightTitle || null,
      highlightId: input.highlightId ?? null,
      publishMode,
      priorityBoost: input.priority ? PRIORITY_BOOST : 0,
      engagementScore: 0,
      audience: input.audience ?? "followers",
      contentCategory: input.contentCategory ?? DEFAULT_CONTENT_CATEGORY,
      contentRating: input.contentRating ?? DEFAULT_CONTENT_RATING,
    };
    const normalizedPoll = input.poll ? {
      id: randomUUID(),
      question: input.poll.question.trim(),
      options: input.poll.options.map((option, position) => ({ id: randomUUID(), text: option.text.trim(), position })),
    } : undefined;
    const created = await this.storyRepository.create(story, normalizedPoll, {
      memberIds,
      exclusionIds,
      highlightId: input.highlightId,
    });
    return this.hydrateStory(created, input.authorId);
  }

  async listHighlights(ownerId: string): Promise<HighlightRecord[]> {
    return this.storyRepository.listHighlights(ownerId);
  }

  async createHighlight(ownerId: string, title: string, coverUrl?: string): Promise<HighlightRecord> {
    const normalizedTitle = title.trim();
    if (!normalizedTitle) throw new Error("Highlight title is required");
    return this.storyRepository.createHighlight(ownerId, normalizedTitle, coverUrl?.trim() || undefined);
  }

  async listActiveStories(viewerId?: string): Promise<StoryRecord[]> {
    const stories = await Promise.all((await this.storyRepository.listActive(viewerId)).map(async (story) => (
      await this.canViewStory(story, viewerId) ? story : undefined
    )));
    const visibleStories = stories.filter((story): story is StoryRecord => Boolean(story));
    const polls = await this.storyRepository.getPolls(visibleStories.map((story) => story.id), viewerId);
    const hydrated = visibleStories.map((story) => polls.get(story.id) ? { ...story, poll: polls.get(story.id) } : story);
    const ranked = await Promise.all(hydrated.map(async (story) => {
      const relationshipScore = viewerId && story.authorId === viewerId
        ? 40
        : viewerId && await this.userRepository.isCloseFriend(story.authorId, viewerId)
          ? 30
          : viewerId && await this.userRepository.isFollowing(viewerId, story.authorId) ? 20 : 0;
      const recencyScore = Math.max(0, 30 - ((Date.now() - new Date(story.publishedAt ?? story.createdAt).getTime()) / (60 * 60 * 1000)));
      return {
        story,
        score: calculateStoryScore({
          relationshipScore,
          recencyScore,
          engagementScore: story.engagementScore ?? 0,
          priorityBoost: story.priorityBoost ?? 0,
        }),
      };
    }));
    return ranked.sort((left, right) => right.score - left.score).map(({ story }) => story);
  }

  async addView(storyId: string, userId: string, eventKey = randomUUID()): Promise<StoryRecord | undefined> {
    const story = await this.storyRepository.findActiveById(storyId, userId);
    if (!story || !(await this.canViewStory(story, userId))) return undefined;
    const viewer = await this.userRepository.findById(userId);
    const privateViewEnabled = await this.entitlementService.hasFeature(userId, "STORY_PRIVATE_VIEW");
    const exposure: StoryViewExposure = selectViewerExposure({
      storyPrivateViewEnabled: privateViewEnabled,
      storyViewMode: viewer?.settings?.storyViewMode,
    });
    const updated = await this.storyRepository.addView(storyId, userId, eventKey, exposure);
    return updated ? this.hydrateStory(updated, userId) : undefined;
  }

  async react(storyId: string, userId: string, emoji: string, reactionType: StoryReactionType = "CUSTOM"): Promise<StoryRecord | undefined> {
    const story = await this.storyRepository.findActiveById(storyId, userId);
    if (!story || !(await this.canViewStory(story, userId))) return undefined;
    if (reactionType === "SUPER_HEART" && !(await this.entitlementService.hasFeature(userId, "SUPER_HEART"))) {
      throw new PremiumFeatureUnavailableError("Super Heart is not enabled for this account");
    }
    const normalizedEmoji = emoji.slice(0, 32);
    const previousReaction = await this.storyRepository.findReaction(storyId, userId);
    if (reactionType === "SUPER_HEART" && !shouldNotifySuperHeart(previousReaction, normalizedEmoji)) {
      return this.hydrateStory(story, userId);
    }
    const updated = await this.storyRepository.react(storyId, userId, normalizedEmoji, reactionType);
    if (updated && reactionType === "SUPER_HEART" && updated.authorId !== userId && shouldNotifySuperHeart(previousReaction, normalizedEmoji)) {
      await this.notifySuperHeart(updated, userId);
    }
    return updated ? this.hydrateStory(updated, userId) : undefined;
  }

  async votePoll(storyId: string, optionId: string, userId: string): Promise<StoryRecord | undefined> {
    const story = await this.storyRepository.findActiveById(storyId, userId);
    if (!story || !(await this.canViewStory(story, userId))) return undefined;
    if (!(await this.storyRepository.votePoll(storyId, optionId, userId))) return undefined;
    return this.hydrateStory(story, userId);
  }

  async getAnalytics(storyId: string, ownerId: string): Promise<StoryAnalyticsSummary | undefined> {
    const story = await this.storyRepository.findById(storyId, ownerId);
    if (!story || story.authorId !== ownerId) return undefined;
    if (!(await this.entitlementService.hasFeature(ownerId, "STORY_REWATCH_ANALYTICS"))) {
      throw new PremiumFeatureUnavailableError("Story analytics are not enabled for this account");
    }
    return this.storyRepository.getAnalytics(storyId);
  }

  async searchViewers(storyId: string, ownerId: string, query?: string, cursor?: string, limit = 30): Promise<{ viewers: StoryViewerRow[]; nextCursor: string | null } | undefined> {
    const story = await this.storyRepository.findById(storyId, ownerId);
    if (!story || story.authorId !== ownerId) return undefined;
    if (!(await this.entitlementService.hasFeature(ownerId, "STORY_VIEW_TIMESTAMPS"))) {
      throw new PremiumFeatureUnavailableError("Story viewer timestamps are not enabled for this account");
    }
    return this.storyRepository.listViewers(storyId, query, cursor, limit);
  }

  async setPriority(storyId: string, ownerId: string, enabled: boolean): Promise<StoryRecord | undefined> {
    const story = await this.storyRepository.findById(storyId, ownerId);
    if (!story || story.authorId !== ownerId) return undefined;
    if (!(await this.entitlementService.hasFeature(ownerId, "STORY_PRIORITY"))) {
      throw new PremiumFeatureUnavailableError("Story priority is not enabled for this account");
    }
    return this.storyRepository.update(storyId, { priorityBoost: enabled ? PRIORITY_BOOST : 0 });
  }

  private async notifySuperHeart(story: StoryRecord, actorId: string): Promise<void> {
    const actor = await this.userRepository.findById(actorId);
    const notification = await this.notificationRepository.create({
      id: randomUUID(),
      recipientId: story.authorId,
      type: "story_super_heart",
      title: "Super Heart",
      message: `${actor?.fullName || actor?.username || "Someone"} sent a Super Heart on your Story`,
      relatedId: story.id,
      createdAt: new Date().toISOString(),
      readAt: null,
      metadata: { actorId, reactionType: "SUPER_HEART" },
    });
    await this.queueService.enqueue("notification:deliver", notification);
    emitToUser(story.authorId, "notification:new", notification);
    emitToUser(story.authorId, "story:reaction", { storyId: story.id, reactionType: "SUPER_HEART", actorId });
  }

  private async hydrateStory(story: StoryRecord, viewerId?: string): Promise<StoryRecord> {
    const poll = (await this.storyRepository.getPolls([story.id], viewerId)).get(story.id);
    return poll ? { ...story, poll } : story;
  }

  private async canViewStory(story: StoryRecord | undefined, viewerId?: string): Promise<boolean> {
    if (!story || !(await this.contentSafetyService.isVisible(story, viewerId, story.authorId))) return false;
    if (!viewerId && story.audience === "public") return true;
    const author = await this.userRepository.findById(story.authorId);
    const viewer = viewerId ? await this.userRepository.findById(viewerId) : undefined;
    if (!author) return false;
    const blocked = Boolean(viewerId && (
      author.blockedUsers?.includes(viewerId)
      || viewer?.blockedUsers?.includes(story.authorId)
    ));
    const [isFollowing, isCloseFriend, selectedMember, excluded] = viewerId
      ? await Promise.all([
        this.userRepository.isFollowing(viewerId, story.authorId),
        this.userRepository.isCloseFriend(story.authorId, viewerId),
        this.storyRepository.isAudienceMember(story.id, viewerId),
        this.storyRepository.isAudienceExcluded(story.id, viewerId),
      ])
      : [false, false, false, false];
    return evaluateAudience({
      ownerId: story.authorId,
      viewerId,
      audience: (story.audience ?? "followers") as AudienceKind,
      isFollowing,
      isCloseFriend,
      selectedMember,
      excluded,
      blocked,
    }).allowed;
  }
}
