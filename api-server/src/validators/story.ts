import { z } from "zod";

const contentRatingSchema = z.enum(["child_safe", "regular", "mature"]);

export const createStorySchema = z.object({
  mediaUrl: z.string().url(),
  type: z.enum(["image", "video", "text", "voice"]),
  textContent: z.string().optional(),
  backgroundGradient: z.string().optional(),
  isHighlight: z.boolean().default(false),
  highlightTitle: z.string().optional(),
  contentRating: contentRatingSchema.default("regular"),
});

export const reactStorySchema = z.object({
  emoji: z.string().min(1).max(10), // A simple string for emojis
});
