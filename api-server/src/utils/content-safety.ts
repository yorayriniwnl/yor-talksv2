export const CONTENT_RATINGS = ["child_safe", "regular", "mature"] as const;
export type ContentRating = (typeof CONTENT_RATINGS)[number];

export const DEFAULT_CONTENT_RATING: ContentRating = "regular";

const CONTENT_RATING_LEVEL: Record<ContentRating, number> = {
  child_safe: 0,
  regular: 1,
  mature: 2,
};

export function normalizeContentRating(value: unknown): ContentRating {
  return typeof value === "string" && CONTENT_RATINGS.includes(value as ContentRating)
    ? value as ContentRating
    : DEFAULT_CONTENT_RATING;
}

export function canViewContent(contentRating: unknown, viewerFilter: unknown): boolean {
  return CONTENT_RATING_LEVEL[normalizeContentRating(contentRating)] <= CONTENT_RATING_LEVEL[normalizeContentRating(viewerFilter)];
}

type RatedContent = { contentRating?: unknown | null };
