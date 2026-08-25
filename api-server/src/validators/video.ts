import { z } from "zod";

const contentRatingSchema = z.enum(["child_safe", "regular", "mature"]);

export const createVideoSchema = z.object({
  title: z.string().min(2).max(200),
  videoUrl: z.string().url(),
  thumbnailUrl: z.string().url(),
  type: z.enum(["short", "standard"]),
  contentRating: contentRatingSchema.default("regular"),
});
