import assert from "node:assert/strict";
import { test } from "node:test";
import { LiveStreamService } from "../services/live-stream-service.js";
import { LiveKitNotConfiguredError, type LiveKitService } from "../services/livekit-service.js";
import type { LiveStreamRepository } from "../repositories/live-stream-repository.js";

test("disabled live-room token access fails before reading stream data", async () => {
  let repositoryAccessed = false;
  const repository = {
    findById: async () => {
      repositoryAccessed = true;
      throw new Error("stream data should not be read while LiveKit is disabled");
    },
  } as unknown as LiveStreamRepository;
  const liveKit = {
    isConfigured: () => false,
  } as unknown as LiveKitService;
  const service = new LiveStreamService(repository, liveKit);

  await assert.rejects(
    () => service.getRoomAccessToken("00000000-0000-4000-8000-000000000000", "user-id"),
    LiveKitNotConfiguredError,
  );
  assert.equal(repositoryAccessed, false);
});
