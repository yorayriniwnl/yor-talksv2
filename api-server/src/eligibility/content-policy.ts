import { createHash } from "node:crypto";
import { canViewContent, normalizeContentRating, type ContentRating } from "../utils/content-safety.js";

const ratingRank: Record<ContentRating, number> = { child_safe: 0, regular: 1, mature: 2 };
export const CONTENT_CLASSIFICATION_POLICY_VERSION = "content-rating-v1";
export const CONTENT_ENTITY_TYPES = ["posts", "stories", "user_notes", "videos", "articles", "communities",
  "community_discussions", "products", "events", "live_streams", "broadcast_channels", "broadcast_channel_messages",
  "comments", "video_comments", "profile_comments"] as const;
export type ContentEntityType = typeof CONTENT_ENTITY_TYPES[number];

export interface ApprovedContentClassification {
  entityType: string;
  entityId: string;
  contentRevision: string;
  contentHash: string;
  classification: unknown;
  issuer: string;
  status: string;
  policyVersion: string;
  approvedAt: string | Date | null;
}

const contentFields = ["content", "textContent", "title", "excerpt", "description", "contentRating", "contentCategory", "type",
  "mediaUrl", "mediaUrls", "mediaIds", "images", "videoUrl", "thumbnailUrl", "coverUrl", "attachments", "backgroundGradient",
  "storyFontId", "storyTextStyle", "tags", "mentions", "postType", "name", "slug", "rules", "category", "condition", "price",
  "location", "startsAt", "kind"] as const;

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value as Record<string, unknown>)
    .filter(([, item]) => item !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, canonical(item)]));
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "bigint") return value.toString();
  return value;
}

/** Hash only content-bearing fields; engagement counters and viewer state cannot invalidate a rating. */
export function contentHashFor(item: Record<string, unknown>): string {
  const projection = Object.fromEntries(contentFields.filter(field => item[field] !== undefined)
    .map(field => [field, canonical(item[field])]));
  return createHash("sha256").update(JSON.stringify(projection)).digest("hex");
}

export function contentRevisionFor(item: Record<string, unknown>, contentHash = contentHashFor(item)): string {
  const updatedAt = item.updatedAt;
  return typeof updatedAt === "string" && updatedAt.length > 0 && updatedAt.length <= 256 ? updatedAt : `sha256:${contentHash}`;
}

/** Infer only known persisted content entities. Unknown records cannot borrow another entity's approval. */
export function contentEntityTypeFor(item: Record<string, unknown>): ContentEntityType | undefined {
  if (CONTENT_ENTITY_TYPES.includes(item.entityType as ContentEntityType)) return item.entityType as ContentEntityType;
  if ("distributionMode" in item && "authorId" in item) return "posts";
  if ("publishMode" in item && "authorId" in item) return "stories";
  if ("sellerId" in item) return "products";
  if ("startsAt" in item && "hostId" in item) return "events";
  if ("guestIds" in item && "hostId" in item) return "live_streams";
  if ("videoUrl" in item && "authorId" in item) return "videos";
  if ("readTime" in item && "excerpt" in item) return "articles";
  if ("slug" in item && "ownerId" in item) return "communities";
  if ("communityId" in item && "authorId" in item) return "community_discussions";
  if ("channelId" in item && "authorId" in item) return "broadcast_channel_messages";
  if ("memberCount" in item && "ownerId" in item) return "broadcast_channels";
  if ("videoId" in item && "authorId" in item) return "video_comments";
  if ("profileId" in item && "authorId" in item) return "profile_comments";
  if ("expiresAt" in item && "audience" in item && "authorId" in item && "content" in item) return "user_notes";
  if ("authorId" in item && "content" in item && "createdAt" in item) return "comments";
  return undefined;
}

export function classificationMatchesCurrentContent(
  item: Record<string, unknown>, entityType: ContentEntityType, value: ApprovedContentClassification | undefined,
): value is ApprovedContentClassification {
  if (!value || typeof item.id !== "string") return false;
  const contentHash = contentHashFor(item);
  const contentRevision = contentRevisionFor(item, contentHash);
  const approvedAt = value.approvedAt instanceof Date ? value.approvedAt.getTime() : Date.parse(value.approvedAt ?? "");
  return value.entityType === entityType && value.entityId === item.id && value.contentHash === contentHash
    && value.contentRevision === contentRevision && value.status === "approved"
    && value.policyVersion === CONTENT_CLASSIFICATION_POLICY_VERSION && Boolean(value.issuer.trim())
    && Number.isFinite(approvedAt);
}

export function effectiveContentRating(item: Record<string, unknown>, entityType?: ContentEntityType, value?: ApprovedContentClassification): ContentRating {
  const claimed = normalizeContentRating(item.contentRating);
  const currentApproval = entityType ? classificationMatchesCurrentContent(item, entityType, value) : false;
  // An author cannot self-certify child-safe status. A current approved rating
  // may confirm it; otherwise it remains at least regular for every audience.
  const classified = currentApproval ? normalizeContentRating(value!.classification) : "regular";
  return ratingRank[claimed] >= ratingRank[classified] ? claimed : classified;
}

export interface CurrentContentContext {
  contentRating: unknown;
  viewerPreference: unknown;
  maximumContentRating?: unknown;
  eligibilityEnforced: boolean;
  item?: Record<string, unknown>;
  entityType?: ContentEntityType;
  classification?: ApprovedContentClassification;
}

/** Apply a saved preference and the current server decision as cumulative ceilings. */
export function allowsRatedContent(context: CurrentContentContext): boolean {
  const preference = normalizeContentRating(context.viewerPreference);
  const ceiling = context.eligibilityEnforced && context.maximumContentRating !== undefined
    ? (ratingRank[normalizeContentRating(context.maximumContentRating)] <= ratingRank[preference]
      ? normalizeContentRating(context.maximumContentRating)
      : preference)
    : preference;
  const contentRating = context.eligibilityEnforced && context.item
    ? effectiveContentRating(context.item, context.entityType, context.classification)
    : normalizeContentRating(context.contentRating);
  return canViewContent(contentRating, ceiling);
}

/** Return the same effective ceiling for SQL candidate reduction before pagination. */
export function effectiveContentCeiling(preference: unknown, maximumContentRating?: unknown): ContentRating {
  const normalizedPreference = normalizeContentRating(preference);
  if (maximumContentRating === undefined) return normalizedPreference;
  const normalizedMaximum = normalizeContentRating(maximumContentRating);
  return ratingRank[normalizedMaximum] <= ratingRank[normalizedPreference] ? normalizedMaximum : normalizedPreference;
}
