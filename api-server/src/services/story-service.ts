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
    poll?: { question: string; options: Array<{ text: string }> };
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
    const normalizedPoll = input.poll ? {
      id: randomUUID(),
      question: input.poll.question.trim(),
      options: input.poll.options.map((option, position) => ({ id: randomUUID(), text: option.text.trim(), position })),
    } : undefined;
    const created = await this.storyRepository.create(story, normalizedPoll);
    return this.hydrateStory(created, input.authorId);
  }

  async listActiveStories(viewerId?: string): Promise<StoryRecord[]> {
    const stories = await this.contentSafetyService.filterVisible(await this.storyRepository.listActive(), viewerId);
    const polls = await this.storyRepository.getPolls(stories.map((story) => story.id), viewerId);
    return stories.map((story) => polls.get(story.id) ? { ...story, poll: polls.get(story.id) } : story);
  }

  async addView(storyId: string, userId: string): Promise<StoryRecord | undefined> {
    const story = await this.storyRepository.findById(storyId);
    if (!story || !(await this.contentSafetyService.isVisible(story, userId))) return undefined;

    if (!story.viewerIds.includes(userId)) {
      const viewerIds = [...story.viewerIds, userId];
      const updated = await this.storyRepository.update(storyId, { viewerIds });
      return updated ? this.hydrateStory(updated, userId) : undefined;
    }
    return this.hydrateStory(story, userId);
  }

  async react(storyId: string, userId: string, emoji: string): Promise<StoryRecord | undefined> {
    const story = await this.storyRepository.findById(storyId);
    if (!story || !(await this.contentSafetyService.isVisible(story, userId))) return undefined;

    const filteredReactions = story.reactions.filter(r => r.userId !== userId);
    const reactions = [...filteredReactions, { userId, emoji }];
    const updated = await this.storyRepository.update(storyId, { reactions });
    return updated ? this.hydrateStory(updated, userId) : undefined;
  }

  async votePoll(storyId: string, optionId: string, userId: string): Promise<StoryRecord | undefined> {
    const story = await this.storyRepository.findById(storyId);
    if (!story || !(await this.contentSafetyService.isVisible(story, userId))) return undefined;
    if (!(await this.storyRepository.votePoll(storyId, optionId, userId))) return undefined;
    return this.hydrateStory(story, userId);
  }

  private async hydrateStory(story: StoryRecord, viewerId?: string): Promise<StoryRecord> {
    const poll = (await this.storyRepository.getPolls([story.id], viewerId)).get(story.id);
    return poll ? { ...story, poll } : story;
  }
}
