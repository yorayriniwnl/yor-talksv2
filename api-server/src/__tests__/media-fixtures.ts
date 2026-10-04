import { randomUUID } from "node:crypto";
import { db } from "@workspace/db";
import { mediaAssetsTable } from "@workspace/db/schema";
import type { MediaPurpose } from "../services/media-provider.js";

/** Synthetic verified assets: no live provider or moderation calls in tests. */
export async function createTestApprovedMedia(ownerId: string, purpose: MediaPurpose, mimeType = "image/png", overrides: Partial<typeof mediaAssetsTable.$inferInsert> = {}) {
  const id = randomUUID();
  const [asset] = await db.insert(mediaAssetsTable).values({
    id, ownerId, purpose, status: "approved", publicId: `audit-media/${id}`,
    resourceType: mimeType.startsWith("image/") ? "image" : "video",
    declaredMime: mimeType, declaredBytes: 100, verifiedMime: mimeType, verifiedBytes: 100,
    providerAssetId: `synthetic-${id}`, providerVersion: 1,
    providerFormat: mimeType === "image/png" ? "png" : mimeType === "video/mp4" ? "mp4" : "mp3",
    sha256: "0".repeat(64), width: 32, height: 32,
    durationSeconds: mimeType.startsWith("image/") ? null : 3.5,
    moderationJson: { decision: "approve", approved: true, reason: "synthetic regression fixture" },
    uploadExpiresAt: new Date(Date.now() + 3600_000).toISOString(),
    cleanupAt: new Date(Date.now() + 3600_000).toISOString(),
    ...overrides,
  }).returning();
  return asset;
}
