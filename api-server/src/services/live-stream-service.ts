import { randomUUID } from "node:crypto";
import { LiveStreamRepository } from "../repositories/live-stream-repository.js";
import type { LiveStreamRecord } from "../types/index.js";

const VALID_STATUSES = ["scheduled", "live", "ended"] as const;
type StreamStatus = (typeof VALID_STATUSES)[number];

export class LiveStreamService {
  constructor(private readonly liveStreamRepository: LiveStreamRepository) {}

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

  /**
   * Metadata status only — going "live" here does not start any actual
   * video/audio pipeline (no WebRTC/media server is wired up). This tracks
   * what a real streaming feature's scheduling layer would look like, not
   * the streaming itself.
   */
  async setStatus(id: string, hostId: string, status: StreamStatus): Promise<LiveStreamRecord | undefined> {
    const stream = await this.liveStreamRepository.findById(id);
    if (!stream || stream.hostId !== hostId) {
      return undefined;
    }
    return this.liveStreamRepository.update(id, { status });
  }
}
