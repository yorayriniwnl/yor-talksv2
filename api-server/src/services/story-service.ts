import { randomUUID } from "node:crypto";
import { emitToUser } from "../lib/realtime.js";
import { NotificationRepository } from "../repositories/notification-repository.js";
import { StoryRepository, type StoryViewerRow } from "../repositories/story-repository.js";
import { UserRepository } from "../repositories/user-repository.js";
import type { HighlightRecord, StoryReaction, StoryRecord, StoryReactionType } from "../types/index.js";
import { DEFAULT_CONTENT_RATING } from "../utils/content-safety.js";
import { DEFAULT_CONTENT_CATEGORY } from "../utils/content-category.js";
import { type AudienceKind } from "../utils/audience-policy.js";
import { calculateStoryScore, resolveStoryDurationHours, selectViewerExposure, type StoryAnalyticsSummary, type StoryViewExposure } from "./story-analytics-service.js";
import { ContentSafetyService } from "./content-safety-service.js";
import { AIService } from "./ai-service.js";
import { enforceTextContentPolicy } from "./content-policy-service.js";
import { FeatureEntitlementService } from "./feature-entitlement-service.js";
import { QueueService } from "./queue-service.js";
import { isPremiumStoryStyle } from "../features/premium-profile.js";
import { normalizeStoryTextStyle, type StoryTextStyle } from "../features/story-text-style.js";

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
    const snapshot = typeof this.entitlementService.getSnapshot === 'function' ? await this.entitlementService.getSnapshot(input.authorId) : null;
    const [hasCustomAudience, hasExtendedStory, hasPriority, hasDirectHighlight, hasStoryFont] = snapshot
      ? [snapshot.CUSTOM_STORY_AUDIENCE, snapshot.EXTENDED_STORY, snapshot.STORY_PRIORITY, snapshot.DIRECT_HIGHLIGHT, snapshot.STORY_FONT]
      : await Promise.all([
      this.entitlementService.hasFeature(input.authorId, "CUSTOM_STORY_AUDIENCE"),
      this.entitlementService.hasFeature(input.authorId, "EXTENDED_STORY"),
      this.entitlementService.hasFeature(input.authorId, "STORY_PRIORITY"),
      this.entitlementService.hasFeature(input.authorId, "DIRECT_HIGHLIGHT"),
      this.entitlementService.hasFeature(input.authorId, "STORY_FONT"),
    ]);
    if (!isPremiumStoryStyle(input.storyFontId ?? 'default')) throw new Error("Story font is not supported");
    // An expired saved style must not block standard publishing or erase a draft.
    const storyFontId = hasStoryFont ? input.storyFontId ?? 'default' : 'default';
    const requestedTextStyle = normalizeStoryTextStyle(input.storyTextStyle);
    const storyTextStyle = hasStoryFont ? requestedTextStyle : normalizeStoryTextStyle(undefined);
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
      const audienceIds = [...new Set([...memberIds, ...exclusionIds])];
      const users = await this.userRepository.findByIds(audienceIds);
      if (users.length !== audienceIds.length) throw new Error("Story audience contains an unknown account");
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
    const stories = await this.storyRepository.listActive(viewerId);
    if (!stories.length) return [];
    const [context, audience] = await Promise.all([
      this.contentSafetyService.prepareContext(stories.map(story => story.authorId), viewerId, { discovery: true }),
      this.storyRepository.audienceForViewer(stories.map(story => story.id), viewerId),
    ]);
    const visibleStories = stories.filter(story => context.allows({ ...story,
      selectedMemberIds: viewerId && audience.selected.has(story.id) ? [viewerId] : [],
      excludedViewerIds: viewerId && audience.excluded.has(story.id) ? [viewerId] : [],
    }, story.authorId));
    const polls = await this.storyRepository.getPolls(visibleStories.map((story) => story.id), viewerId);
    const hydrated = visibleStories.map((story) => polls.get(story.id) ? { ...story, poll: polls.get(story.id) } : story);
    const ranked = hydrated.map((story) => {
      const relationshipScore = context.relationshipScore(story.authorId);
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
    });
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

  public async canViewStory(story: StoryRecord | undefined, viewerId?: string): Promise<boolean> {
    if (!story) return false;
    const [selected, excluded] = viewerId ? await Promise.all([
      this.storyRepository.isAudienceMember(story.id, viewerId),
      this.storyRepository.isAudienceExcluded(story.id, viewerId),
    ]) : [false, false];
    return this.contentSafetyService.isVisible({ ...story,
      selectedMemberIds: selected && viewerId ? [viewerId] : [],
      excludedViewerIds: excluded && viewerId ? [viewerId] : [],
    }, viewerId, story.authorId);
  }
}
