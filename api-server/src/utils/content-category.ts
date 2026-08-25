import { z } from "zod";

export const CONTENT_CATEGORIES = [
  "campus",
  "technology",
  "gaming",
  "arts",
  "music",
  "education",
  "sports",
  "lifestyle",
  "news",
  "other",
] as const;

export type ContentCategory = (typeof CONTENT_CATEGORIES)[number];
export const contentCategorySchema = z.enum(CONTENT_CATEGORIES);
export const DEFAULT_CONTENT_CATEGORY: ContentCategory = "other";

