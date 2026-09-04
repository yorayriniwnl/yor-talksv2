import assert from "node:assert/strict";
import { test } from "node:test";
import { env } from "../config/env.js";
import { MediaModerationUnavailableError, StorageService } from "../services/storage-service.js";

test("production media storage fails closed before publishing unmoderated media", async (t) => {
  const previous = env.NODE_ENV;
  env.NODE_ENV = "production";
  t.after(() => { env.NODE_ENV = previous; });
  await assert.rejects(() => new StorageService().uploadImage(Buffer.from("image"), "avatar.png"), MediaModerationUnavailableError);
});