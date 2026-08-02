import { randomUUID } from "node:crypto";
import { StoryRepository } from "../repositories/story-repository.js";
import type { StoryRecord } from "../types/index.js";

export class StoryService {
  constructor(private readonly storyRepository: StoryRepository) {}

  async createStory(input: {
    authorId: string;
    mediaUrl: string;
    type: string;
    textContent?: string;
    backgroundGradient?: string;
    isHighlight: boolean;
    highlightTitle?: string;
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
    };
    return this.storyRepository.create(story);
  }

  async listActiveStories(): Promise<StoryRecord[]> {
    return this.storyRepository.listActive();
  }

  async addView(storyId: string, userId: string): Promise<StoryRecord | undefined> {
    const story = await this.storyRepository.findById(storyId);
    if (!story) return undefined;

    if (!story.viewerIds.includes(userId)) {
      const viewerIds = [...story.viewerIds, userId];
      return this.storyRepository.update(storyId, { viewerIds });
    }
    return story;
  }

  async react(storyId: string, userId: string, emoji: string): Promise<StoryRecord | undefined> {
    const story = await this.storyRepository.findById(storyId);
    if (!story) return undefined;

    const filteredReactions = story.reactions.filter(r => r.userId !== userId);
    const reactions = [...filteredReactions, { userId, emoji }];
    return this.storyRepository.update(storyId, { reactions });
  }
}
