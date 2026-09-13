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
  highlightId: z.string().uuid().optional(),
  publishMode: z.enum(["active", "highlight_only"]).default("active"),
  durationHours: z.number().int().min(24).max(72).optional(),
  priority: z.boolean().default(false),
  audience: z.enum(["followers", "close_friends", "public", "selected_people", "everyone_except", "custom"]).default("followers"),
  audienceMemberIds: z.array(z.string().uuid()).max(500).optional().default([]),
  audienceExclusionIds: z.array(z.string().uuid()).max(500).optional().default([]),
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
  emoji: z.string().min(1).max(32),
  reactionType: z.enum(["NORMAL_HEART", "SUPER_HEART", "CUSTOM"]).default("CUSTOM"),
});

export const viewStorySchema = z.object({
  eventKey: z.string().uuid().optional(),
});

export const storyViewerQuerySchema = z.object({
  q: z.string().trim().max(80).optional(),
  cursor: z.string().max(500).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const storyPollVoteSchema = z.object({
  optionId: z.string().uuid("Invalid story poll option ID"),
});

export const createHighlightSchema = z.object({
  title: z.string().trim().min(1).max(60),
  coverUrl: z.string().url().max(2_000).optional(),
});
