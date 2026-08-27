import { randomUUID } from "node:crypto";
import { BroadcastChannelRepository } from "../repositories/broadcast-channel-repository.js";
import { NotificationRepository } from "../repositories/notification-repository.js";
import { QueueService } from "./queue-service.js";
import { emitToUser } from "../lib/realtime.js";
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
    private readonly notificationRepository?: NotificationRepository,
    private readonly queueService?: QueueService,
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
    if (!channel.isOwner && (await this.contentSafetyService.filterVisible([channel], userId)).length === 0) return undefined;
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
    const message = await this.repository.createMessage({
      id: randomUUID(),
      channelId: input.channelId,
      authorId: input.authorId,
      content,
      contentCategory: input.contentCategory ?? DEFAULT_CONTENT_CATEGORY,
      contentRating: input.contentRating ?? DEFAULT_CONTENT_RATING,
      createdAt: new Date().toISOString(),
    });
    if (!message || !this.notificationRepository) return message;

    const channel = await this.repository.findById(input.channelId, input.authorId);
    if (!channel) return message;
    const recipients = await this.repository.listNotificationRecipients(input.channelId, input.authorId);
    await Promise.all(recipients.map(async (recipientId) => {
      const notification = await this.notificationRepository!.create({
        id: randomUUID(),
        recipientId,
        type: "broadcast_channel",
        title: `${channel.name} posted an update`,
        message: content.slice(0, 180),
        relatedId: channel.id,
        createdAt: message.createdAt,
        readAt: null,
        channel: "in_app",
        metadata: { channelId: channel.id, messageId: message.id },
      });
      await this.queueService?.enqueue("notification:deliver", notification);
      emitToUser(recipientId, "notification:new", notification);
    }));
    return message;
  }
}
