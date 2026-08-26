import { z } from "zod";

const contentRatingSchema = z.enum(["child_safe", "regular", "mature"]);

export const createDiscussionSchema = z.object({
  title: z.string().trim().min(3).max(160),
  content: z.string().trim().max(4_000).optional().default(""),
  tag: z.enum(["General", "Guides", "LFG / Clans", "Trading", "Announcements"]).default("General"),
  contentRating: contentRatingSchema,
});
