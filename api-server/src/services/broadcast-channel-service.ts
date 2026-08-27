import { randomUUID } from "node:crypto";
import { BroadcastChannelRepository } from "../repositories/broadcast-channel-repository.js";
import type { BroadcastChannelMessageRecord, BroadcastChannelRecord } from "../types/index.js";
import { DEFAULT_CONTENT_CATEGORY } from "../utils/content-category.js";
import { DEFAULT_CONTENT_RATING } from "../utils/content-safety.js";
import { ContentSafetyService } from "./content-safety-service.js";
import { enforceTextContentPolicy } from "./content-policy-service.js";
import { AIService } from "./ai-service.js";

export class BroadcastChannelService {
  constructor(
    private readonly repository: BroadcastChannelRepository = new BroadcastChannelRepository(),
    private readonly contentSafetyService: ContentSafetyService = new ContentSafetyService(),
    private readonly aiService: AIService = new AIService(),
  ) {}

  async listChannels(viewerId: string): Promise<BroadcastChannelRecord[]> {
    const channels = await this.repository.list(viewerId);
    return this.contentSafetyService.filterVisible(channels, viewerId);
  }

  async createChannel(input: {
    ownerId: string;
    name: string;
    description?: string;
    coverUrl?: string;
    contentCategory?: string;
    contentRating?: BroadcastChannelRecord["contentRating"];
  }): Promise<BroadcastChannelRecord> {
    const name = input.name.trim();
    const description = (input.description ?? "").trim();
    await enforceTextContentPolicy(`${name}\n${description}`, this.aiService, "broadcast channel");
    const now = new Date().toISOString();
    return this.repository.create({
      id: randomUUID(),
      ownerId: input.ownerId,
      name,
      description,
      coverUrl: input.coverUrl?.trim() || undefined,
      contentCategory: input.contentCategory ?? DEFAULT_CONTENT_CATEGORY,
      contentRating: input.contentRating ?? DEFAULT_CONTENT_RATING,
      createdAt: now,
      updatedAt: now,
    });
  }

  async joinChannel(channelId: string, userId: string): Promise<BroadcastChannelRecord | undefined> {
    const channel = await this.repository.findById(channelId, userId);
    if (!channel) return undefined;
    await this.repository.join(channelId, userId);
    return this.repository.findById(channelId, userId);
  }

  async leaveChannel(channelId: string, userId: string): Promise<BroadcastChannelRecord | undefined> {
    const channel = await this.repository.findById(channelId, userId);
    if (!channel || channel.isOwner) return undefined;
    await this.repository.leave(channelId, userId);
    return this.repository.findById(channelId, userId);
  }

  async listMessages(channelId: string, userId: string): Promise<BroadcastChannelMessageRecord[] | undefined> {
    const messages = await this.repository.listMessages(channelId, userId);
    if (!messages) return undefined;
    return this.contentSafetyService.filterVisible(messages, userId);
  }

  async createMessage(input: {
    channelId: string;
    authorId: string;
    content: string;
    contentCategory?: string;
    contentRating?: BroadcastChannelMessageRecord["contentRating"];
  }): Promise<BroadcastChannelMessageRecord | undefined> {
    const content = input.content.trim();
    await enforceTextContentPolicy(content, this.aiService, "broadcast message");
    return this.repository.createMessage({
      id: randomUUID(),
      channelId: input.channelId,
      authorId: input.authorId,
      content,
      contentCategory: input.contentCategory ?? DEFAULT_CONTENT_CATEGORY,
      contentRating: input.contentRating ?? DEFAULT_CONTENT_RATING,
      createdAt: new Date().toISOString(),
    });
  }
}
