import { randomUUID } from "node:crypto";
import { StoryRepository } from "../repositories/story-repository.js";
import type { StoryRecord } from "../types/index.js";
import { DEFAULT_CONTENT_RATING } from "../utils/content-safety.js";
import { DEFAULT_CONTENT_CATEGORY } from "../utils/content-category.js";
import { ContentSafetyService } from "./content-safety-service.js";

export class StoryService {
  constructor(
    private readonly storyRepository: StoryRepository,
    private readonly contentSafetyService: ContentSafetyService = new ContentSafetyService(),
  ) {}

  async createStory(input: {
    authorId: string;
    mediaUrl: string;
    type: string;
    textContent?: string;
    backgroundGradient?: string;
    isHighlight: boolean;
    highlightTitle?: string;
    contentCategory?: StoryRecord["contentCategory"];
    contentRating?: StoryRecord["contentRating"];
  }): Promise<StoryRecord> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now

    const story: StoryRecord = {
      id: randomUUID(),
      authorId: input.authorId,
      mediaUrl: input.mediaUrl,
      type: input.type,
      textContent: input.textContent || null,
      backgroundGradient: input.backgroundGradient || null,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      viewerIds: [],
      reactions: [],
      isHighlight: input.isHighlight,
      highlightTitle: input.highlightTitle || null,
      contentCategory: input.contentCategory ?? DEFAULT_CONTENT_CATEGORY,
      contentRating: input.contentRating ?? DEFAULT_CONTENT_RATING,
    };
    return this.storyRepository.create(story);
  }

  async listActiveStories(viewerId?: string): Promise<StoryRecord[]> {
    return this.contentSafetyService.filterVisible(await this.storyRepository.listActive(), viewerId);
  }

  async addView(storyId: string, userId: string): Promise<StoryRecord | undefined> {
    const story = await this.storyRepository.findById(storyId);
    if (!story || !(await this.contentSafetyService.isVisible(story, userId))) return undefined;

    if (!story.viewerIds.includes(userId)) {
      const viewerIds = [...story.viewerIds, userId];
      return this.storyRepository.update(storyId, { viewerIds });
    }
    return story;
  }

  async react(storyId: string, userId: string, emoji: string): Promise<StoryRecord | undefined> {
    const story = await this.storyRepository.findById(storyId);
    if (!story || !(await this.contentSafetyService.isVisible(story, userId))) return undefined;

    const filteredReactions = story.reactions.filter(r => r.userId !== userId);
    const reactions = [...filteredReactions, { userId, emoji }];
    return this.storyRepository.update(storyId, { reactions });
  }
}
