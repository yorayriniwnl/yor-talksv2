import { AccessToken, RoomServiceClient } from "livekit-server-sdk";
import { env } from "../config/env.js";
import { EligibilityService } from "./eligibility-service.js";

export class LiveKitNotConfiguredError extends Error {
  constructor() {
    super("LiveKit is not configured for this deployment");
    this.name = "LiveKitNotConfiguredError";
  }
}

export class LiveKitService {
  constructor(private readonly eligibilityService: EligibilityService = new EligibilityService()) {}

  isConfigured(): boolean {
    return env.LIVE_ROOMS_ENABLED && Boolean(env.LIVEKIT_URL && env.LIVEKIT_API_KEY && env.LIVEKIT_API_SECRET);
  }

  async createRoomToken(input: {
    streamId: string;
    userId: string;
    displayName: string;
    canPublish: boolean;
  }): Promise<{ token: string; wsUrl: string; roomName: string }> {
    if (!this.isConfigured()) {
      throw new LiveKitNotConfiguredError();
    }
    await this.eligibilityService.requireCapability(input.userId, "live");
    await this.eligibilityService.requireCapability(input.userId, "rtc");

    const roomName = `yor-talks-${input.streamId}`;
    const accessToken = new AccessToken(env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET, {
      identity: input.userId,
      name: input.displayName,
      ttl: "15m",
    });
    accessToken.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: input.canPublish,
      canSubscribe: true,
      canPublishData: input.canPublish,
    });

    const token = await accessToken.toJwt();
    // Eligibility can change while token signing is awaited. Credentials are
    // returned only if RTC access remains current at issuance time.
    await this.eligibilityService.requireCapability(input.userId, "live");
    await this.eligibilityService.requireCapability(input.userId, "rtc");
    return {
      token,
      wsUrl: env.LIVEKIT_URL,
      roomName,
    };
  }

  async endRoom(streamId: string): Promise<void> {
    if (!this.isConfigured()) throw new LiveKitNotConfiguredError();
    const roomName = `yor-talks-${streamId}`;
    const rooms = new RoomServiceClient(env.LIVEKIT_URL, env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET);
    await rooms.deleteRoom(roomName);
  }
}
