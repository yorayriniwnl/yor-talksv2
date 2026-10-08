import { runInDatabaseTransaction } from "@workspace/db";
import { mediaReferencesTable, usersTable } from "@workspace/db/schema";
import { and, eq, notInArray, sql } from "drizzle-orm";
import { getApprovedMedia, MediaLifecycleError, type MediaUploadResult } from "./media-service.js";
import type { MediaPurpose } from "./media-provider.js";
import { mediaMimeAllowed, purposeLimits } from "./media-provider.js";

type ApprovedMedia = MediaUploadResult & { url: string; mimeType: string; size: number };
class NoPublicationResult extends Error { constructor(readonly result: unknown) { super('No content persisted'); } }

export interface ApprovedMediaBinding {
  mediaIds: string[];
  purpose: MediaPurpose;
  slot: string;
  kind?: "image" | "audio" | "video";
}
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const entityTables = new Set(["users", "posts", "comments", "stories", "highlights", "videos", "video_comments", "products", "articles", "events", "live_streams", "broadcast_channels", "profile_showcases", "messages", "business_profiles", "communities"]);

/** The service boundary also rejects bypasses that did not pass an HTTP validator. */
export function rejectRawMedia(input: object, fields: string[]): void {
  if (fields.some(field => (input as Record<string, unknown>)[field] !== undefined)) {
    throw new MediaLifecycleError("Use an approved media ID", 400, "media_id_required");
  }
}
export function mediaBinding(mediaId: string | undefined, purpose: MediaPurpose, slot: string, kind?: ApprovedMediaBinding["kind"]): ApprovedMediaBinding[] {
  return mediaId === undefined ? [] : [{ mediaIds: [mediaId], purpose, slot, kind }];
}
export function attachmentFields(media: ApprovedMedia | undefined) {
  if (!media) return {};
  return {
    mediaUrl: media.url,
    mediaType: media.mimeType.startsWith("audio/") ? "audio" as const : "image" as const,
    mediaDuration: media.mimeType.startsWith("audio/") && media.duration !== undefined ? Math.ceil(media.duration) : undefined,
  };
}

/** Publication, reference creation, and replacement commit or roll back together. */
export async function withApprovedMedia<T>(
  ownerId: string,
  bindings: ApprovedMediaBinding[],
  entity: { type: string; id: string },
  work: (media: Record<string, ApprovedMedia[]>) => Promise<T>,
): Promise<T> {
  if (!bindings.length) return work({});
  if (!entityTables.has(entity.type) || !uuid.test(entity.id)) throw new Error("Invalid media publication entity");
  const ids = [...new Set(bindings.flatMap(binding => binding.mediaIds))].sort();
  if (ids.length > 20 || ids.some(id => typeof id !== "string" || !uuid.test(id))) {
    throw new MediaLifecycleError("Invalid media IDs", 400, "invalid_media_id");
  }
  if (new Set(bindings.map(binding => binding.slot)).size !== bindings.length) throw new Error("Duplicate media binding slot");
  try { return await runInDatabaseTransaction(async tx => {
    // Account deletion takes the owner lock before it detaches assets. Match that
    // order, and lock assets globally rather than independently for each slot.
    const [owner] = await tx.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.id, ownerId)).for("key share");
    if (!owner) throw new MediaLifecycleError("Account is unavailable", 403, "media_owner_unavailable");
    // Serialize replacements before taking any asset locks. NO KEY UPDATE is
    // compatible with the owner's KEY SHARE lock, including avatar writes.
    await tx.execute(sql`SELECT id FROM ${sql.raw(`"${entity.type}"`)} WHERE id=${entity.id}::uuid FOR NO KEY UPDATE`);
    const previous = await tx.select({ id: mediaReferencesTable.mediaId }).from(mediaReferencesTable).where(and(eq(mediaReferencesTable.entityType, entity.type), eq(mediaReferencesTable.entityId, entity.id)));
    const lockIds = [...new Set([...ids, ...previous.map(row => row.id)])].sort();
    if (lockIds.length) await tx.execute(sql`SELECT id FROM media_assets WHERE id IN (${sql.join(lockIds.map(id => sql`${id}::uuid`), sql`, `)}) ORDER BY id FOR UPDATE`);
    const approved: Record<string, ApprovedMedia[]> = {};
    for (const binding of bindings) {
      const media = await getApprovedMedia(tx, ownerId, binding.mediaIds, binding.purpose, binding.kind);
      for (const asset of media) {
        if (asset.url !== `media:${asset.id}` || !asset.mimeType || !mediaMimeAllowed(binding.purpose, asset.mimeType) || !asset.size || asset.size > purposeLimits(binding.purpose, asset.mimeType).maxBytes) throw new MediaLifecycleError("Approved media metadata is incomplete", 409, "media_not_approved");
      }
      approved[binding.slot] = media as ApprovedMedia[];
    }
    const result = await work(approved);
    // A writer may return undefined after a failed conditional update. It must
    // not attach assets to an entity that was never persisted.
    if (result === undefined || result === null) throw new NoPublicationResult(result);
    for (const binding of bindings) {
      if (binding.mediaIds.length) await tx.insert(mediaReferencesTable).values(binding.mediaIds.map(mediaId => ({ mediaId, entityType: entity.type, entityId: entity.id, slot: binding.slot }))).onConflictDoNothing();
      const scope = and(eq(mediaReferencesTable.entityType, entity.type), eq(mediaReferencesTable.entityId, entity.id), eq(mediaReferencesTable.slot, binding.slot));
      // Insert first: reusing the same asset never transiently loses its last use.
      await tx.delete(mediaReferencesTable).where(binding.mediaIds.length ? and(scope, notInArray(mediaReferencesTable.mediaId, binding.mediaIds)) : scope);
    }
    return result;
  }); } catch(error) { if(error instanceof NoPublicationResult)return error.result as T;throw error; }
}
