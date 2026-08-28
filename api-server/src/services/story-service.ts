import { randomUUID } from "node:crypto";
import { StoryRepository } from "../repositories/story-repository.js";
import { UserRepository } from "../repositories/user-repository.js";
import type { StoryRecord } from "../types/index.js";
import { DEFAULT_CONTENT_RATING } from "../utils/content-safety.js";
import { DEFAULT_CONTENT_CATEGORY } from "../utils/content-category.js";
import { ContentSafetyService } from "./content-safety-service.js";
import { AIService } from "./ai-service.js";
import { enforceTextContentPolicy } from "./content-policy-service.js";

export class StoryService {
  constructor(
    private readonly storyRepository: StoryRepository,
    private readonly contentSafetyService: ContentSafetyService = new ContentSafetyService(),
    private readonly aiService: AIService = new AIService(),
    private readonly userRepository: UserRepository = new UserRepository(),
  ) {}

  async createStory(input: {
    authorId: string;
    mediaUrl: string;
    type: string;
    textContent?: string;
    backgroundGradient?: string;
    isHighlight: boolean;
    highlightTitle?: string;
    audience?: StoryRecord["audience"];
    contentCategory?: StoryRecord["contentCategory"];
    contentRating?: StoryRecord["contentRating"];
    poll?: { question: string; options: Array<{ text: string }> };
  }): Promise<StoryRecord> {
    await enforceTextContentPolicy([
      input.textContent ?? "",
      input.poll?.question ?? "",
      ...(input.poll?.options ?? []).map((option) => option.text),
    ].join("\n"), this.aiService, "story");
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
      audience: input.audience ?? "followers",
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
    const stories = await Promise.all((await this.storyRepository.listActive(viewerId)).map(async (story) => (
      await this.canViewStory(story, viewerId) ? story : undefined
    )));
    const visibleStories = stories.filter((story): story is StoryRecord => Boolean(story));
    const polls = await this.storyRepository.getPolls(visibleStories.map((story) => story.id), viewerId);
    return visibleStories.map((story) => polls.get(story.id) ? { ...story, poll: polls.get(story.id) } : story);
  }

  async addView(storyId: string, userId: string): Promise<StoryRecord | undefined> {
    const story = await this.storyRepository.findActiveById(storyId, userId);
    if (!story || !(await this.canViewStory(story, userId))) return undefined;

    const updated = await this.storyRepository.addView(storyId, userId);
    return updated ? this.hydrateStory(updated, userId) : undefined;
  }

  async react(storyId: string, userId: string, emoji: string): Promise<StoryRecord | undefined> {
    const story = await this.storyRepository.findActiveById(storyId, userId);
    if (!story || !(await this.canViewStory(story, userId))) return undefined;

    const updated = await this.storyRepository.react(storyId, userId, emoji.slice(0, 32));
    return updated ? this.hydrateStory(updated, userId) : undefined;
  }

  async votePoll(storyId: string, optionId: string, userId: string): Promise<StoryRecord | undefined> {
    const story = await this.storyRepository.findActiveById(storyId, userId);
    if (!story || !(await this.canViewStory(story, userId))) return undefined;
    if (!(await this.storyRepository.votePoll(storyId, optionId, userId))) return undefined;
    return this.hydrateStory(story, userId);
  }

  private async hydrateStory(story: StoryRecord, viewerId?: string): Promise<StoryRecord> {
    const poll = (await this.storyRepository.getPolls([story.id], viewerId)).get(story.id);
    return poll ? { ...story, poll } : story;
  }

  private async canViewStory(story: StoryRecord | undefined, viewerId?: string): Promise<boolean> {
    if (!story || !(await this.contentSafetyService.isVisible(story, viewerId, story.authorId))) return false;
    if (story.authorId === viewerId || story.audience === "public") return true;
    if (!viewerId) return false;
    if (story.audience === "close_friends") return this.userRepository.isCloseFriend(story.authorId, viewerId);
    return this.userRepository.isFollowing(viewerId, story.authorId);
  }
}
