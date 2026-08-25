import { randomUUID } from "node:crypto";
import { LiveStreamRepository } from "../repositories/live-stream-repository.js";
import type { LiveStreamRecord } from "../types/index.js";
import { LiveKitNotConfiguredError, LiveKitService } from "./livekit-service.js";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const VALID_STATUSES = ["scheduled", "live", "ended"] as const;
type StreamStatus = (typeof VALID_STATUSES)[number];

export class LiveStreamNotFoundError extends Error {}
export class LiveStreamNotLiveError extends Error {}

export class LiveStreamService {
  constructor(
    private readonly liveStreamRepository: LiveStreamRepository,
    private readonly liveKitService: LiveKitService = new LiveKitService(),
  ) {}

  async createStream(input: {
    hostId: string;
    title: string;
    coverUrl: string;
    kind: string;
    startsAt: string;
    category: string;
  }): Promise<LiveStreamRecord> {
    const stream: LiveStreamRecord = {
      id: randomUUID(),
      ...input,
      status: "scheduled",
      viewers: 0,
      guestIds: [],
    };
    return this.liveStreamRepository.create(stream);
  }

  async listStreams(): Promise<LiveStreamRecord[]> {
    return this.liveStreamRepository.list();
  }

  async getStream(id: string): Promise<LiveStreamRecord | undefined> {
    return this.liveStreamRepository.findById(id);
  }

  async setStatus(id: string, hostId: string, status: StreamStatus): Promise<LiveStreamRecord | undefined> {
    const stream = await this.liveStreamRepository.findById(id);
    if (!stream || stream.hostId !== hostId) {
      return undefined;
    }
    if (status === "live" && !this.liveKitService.isConfigured()) {
      throw new LiveKitNotConfiguredError();
    }
    return this.liveStreamRepository.update(id, { status });
  }

  async getRoomAccessToken(id: string, userId: string) {
    const stream = await this.liveStreamRepository.findById(id);
    if (!stream) {
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
