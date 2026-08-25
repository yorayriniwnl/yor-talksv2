import { z } from "zod";
import { contentCategorySchema } from "../utils/content-category.js";

const contentRatingSchema = z.enum(["child_safe", "regular", "mature"]);

export const createVideoSchema = z.object({
  title: z.string().min(2).max(200),
  videoUrl: z.string().url(),
  thumbnailUrl: z.string().url(),
  type: z.enum(["short", "standard"]),
  contentCategory: contentCategorySchema,
  contentRating: contentRatingSchema.default("regular"),
});
