import { z } from "zod";

const contentRatingSchema = z.enum(["child_safe", "regular", "mature"]);

export const createStreamSchema = z.object({
  title: z.string().min(2).max(200),
  coverUrl: z.string().url(),
  kind: z.enum(["video", "audio"]),
  startsAt: z.string().datetime({ offset: true }),
  category: z.string().min(1).max(50),
  contentRating: contentRatingSchema.default("regular"),
});

export const streamStatusSchema = z.object({
  status: z.enum(["scheduled", "live", "ended"]),
});
