import { z } from "zod";
import { contentCategorySchema } from "../utils/content-category.js";

const contentRatingSchema = z.enum(["child_safe", "regular", "mature"]);

export const createStreamSchema = z.object({
  title: z.string().trim().min(2).max(200),
  coverUrl: z.string().url(),
  kind: z.enum(["video", "audio"]),
  startsAt: z.string().datetime({ offset: true }),
  category: contentCategorySchema,
  contentRating: contentRatingSchema,
});

export const streamStatusSchema = z.object({
  status: z.enum(["scheduled", "live", "ended"]),
});
