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
  contentCategory: contentCategorySchema,
  contentRating: contentRatingSchema.default("regular"),
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
