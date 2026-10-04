import { z } from "zod";
import { contentCategorySchema } from "../utils/content-category.js";

const contentRatingSchema = z.enum(["child_safe", "regular", "mature"]);

export const createStreamSchema = z.object({
  title: z.string().trim().min(2).max(200),
  coverMediaId: z.string().uuid().optional(),
  kind: z.enum(["video", "audio"]),
  startsAt: z.string().datetime({ offset: true }),
  category: contentCategorySchema,
  contentRating: contentRatingSchema,
}).strict();

export const streamStatusSchema = z.object({
  status: z.enum(["scheduled", "live", "ended"]),
});
