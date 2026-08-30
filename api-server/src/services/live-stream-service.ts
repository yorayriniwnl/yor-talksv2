import { randomUUID } from "node:crypto";
import { LiveStreamRepository } from "../repositories/live-stream-repository.js";
import type { LiveStreamRecord } from "../types/index.js";
import { LiveKitNotConfiguredError, LiveKitService } from "./livekit-service.js";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { DEFAULT_CONTENT_RATING } from "../utils/content-safety.js";
import { ContentSafetyService } from "./content-safety-service.js";
import { AIService } from "./ai-service.js";
import { enforceTextContentPolicy } from "./content-policy-service.js";
import { env } from "../config/env.js";

const VALID_STATUSES = ["scheduled", "live", "ended"] as const;
type StreamStatus = (typeof VALID_STATUSES)[number];

export class LiveStreamNotFoundError extends Error {}
export class LiveStreamNotLiveError extends Error {}

export class LiveStreamService {
  constructor(
    private readonly liveStreamRepository: LiveStreamRepository,
    private readonly liveKitService: LiveKitService = new LiveKitService(),
    private readonly contentSafetyService: ContentSafetyService = new ContentSafetyService(),
    private readonly aiService: AIService = new AIService(),
  ) {}

  async createStream(input: {
    hostId: string;
    title: string;
    coverUrl: string;
    kind: string;
    startsAt: string;
    category: string;
    contentRating?: LiveStreamRecord["contentRating"];
  }): Promise<LiveStreamRecord> {
    if (!this.liveKitService.isConfigured()) {
      throw new LiveKitNotConfiguredError();
    }
    await enforceTextContentPolicy(input.title, this.aiService, "live stream title");
    const stream: LiveStreamRecord = {
      id: randomUUID(),
      ...input,
      status: "scheduled",
      viewers: 0,
      guestIds: [],
      contentRating: input.contentRating ?? DEFAULT_CONTENT_RATING,
    };
    return this.liveStreamRepository.create(stream);
  }

  async listStreams(viewerId?: string): Promise<LiveStreamRecord[]> {
    if (!env.LIVE_ROOMS_ENABLED) return [];
    return this.contentSafetyService.filterVisibleByAuthor(await this.liveStreamRepository.list(), viewerId, (stream) => stream.hostId);
  }

  async getStream(id: string, viewerId?: string): Promise<LiveStreamRecord | undefined> {
    if (!env.LIVE_ROOMS_ENABLED) return undefined;
    const stream = await this.liveStreamRepository.findById(id);
    return await this.contentSafetyService.isVisible(stream, viewerId, stream?.hostId) ? stream : undefined;
  }

  async setStatus(id: string, hostId: string, status: StreamStatus): Promise<LiveStreamRecord | undefined> {
    if (!env.LIVE_ROOMS_ENABLED || !this.liveKitService.isConfigured()) {
      throw new LiveKitNotConfiguredError();
    }
    const stream = await this.liveStreamRepository.findById(id);
    if (!stream || stream.hostId !== hostId) {
      return undefined;
    }
    return this.liveStreamRepository.update(id, { status });
  }

  async getRoomAccessToken(id: string, userId: string) {
    const stream = await this.liveStreamRepository.findById(id);
    if (!stream) {
      throw new LiveStreamNotFoundError("Stream not found");
    }
    if (!(await this.contentSafetyService.isVisible(stream, userId, stream.hostId))) {
      throw new LiveStreamNotFoundError("Stream not found");
    }
    const isHost = stream.hostId === userId;
    if (!isHost && stream.status !== "live") {
      throw new LiveStreamNotLiveError("This stream is not live yet");
    }
    const [user] = await db
      .select({ fullName: usersTable.fullName, username: usersTable.username })
      .from(usersTable)
      .where(eq(usersTable.id, userId));
    if (!user) {
      throw new LiveStreamNotFoundError("User not found");
    }
    return this.liveKitService.createRoomToken({
      streamId: id,
      userId,
      displayName: user.fullName || user.username,
      canPublish: isHost,
    });
  }
}
