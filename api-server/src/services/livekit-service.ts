import { AccessToken, RoomServiceClient } from "livekit-server-sdk";
import { env } from "../config/env.js";

export class LiveKitNotConfiguredError extends Error {
  constructor() {
    super("LiveKit is not configured for this deployment");
    this.name = "LiveKitNotConfiguredError";
  }
}

export class LiveKitService {
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

    return {
      token: await accessToken.toJwt(),
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
