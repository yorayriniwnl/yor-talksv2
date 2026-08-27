import { z } from "zod";
import { contentCategorySchema } from "../utils/content-category.js";

const contentRatingSchema = z.enum(["child_safe", "regular", "mature"]);

export const createStorySchema = z.object({
  mediaUrl: z.string().url().or(z.literal("")),
  type: z.enum(["image", "video", "text", "voice"]),
  textContent: z.string().optional(),
  backgroundGradient: z.string().optional(),
  isHighlight: z.boolean().default(false),
  highlightTitle: z.string().optional(),
  audience: z.enum(["followers", "close_friends", "public"]).default("followers"),
  contentCategory: contentCategorySchema,
  contentRating: contentRatingSchema,
  poll: z.object({
    question: z.string().trim().min(1).max(240),
    options: z.array(z.object({ text: z.string().trim().min(1).max(80) })).min(2).max(4),
  }).optional(),
}).superRefine((value, context) => {
  if ((value.type === "image" || value.type === "video") && !value.mediaUrl) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["mediaUrl"], message: "Media URL is required for image and video stories" });
  }
  if ((value.type === "text" || value.type === "voice") && !value.textContent && !value.mediaUrl) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["textContent"], message: "Text or voice content is required" });
  }
});

export const reactStorySchema = z.object({
  emoji: z.string().min(1).max(10), // A simple string for emojis
});

export const storyPollVoteSchema = z.object({
  optionId: z.string().uuid("Invalid story poll option ID"),
});
