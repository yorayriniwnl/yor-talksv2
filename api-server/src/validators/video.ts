import { z } from "zod";
import { contentCategorySchema } from "../utils/content-category.js";

const contentRatingSchema = z.enum(["child_safe", "regular", "mature"]);

export const createVideoSchema = z.object({
  title: z.string().trim().min(2).max(200),
  mediaId: z.string().uuid().optional(),
  externalVideoUrl: z.string().url().max(2000).optional(),
  thumbnailMediaId: z.string().uuid().optional(),
  type: z.enum(["short", "standard"]),
  contentCategory: contentCategorySchema,
  contentRating: contentRatingSchema,
}).strict().refine(value => Boolean(value.mediaId) !== Boolean(value.externalVideoUrl), {
  message: "Provide approved video media or an external video URL",
}).refine(value => !value.externalVideoUrl || Boolean(value.thumbnailMediaId), {
  message: "External videos require an approved image thumbnail",
});
