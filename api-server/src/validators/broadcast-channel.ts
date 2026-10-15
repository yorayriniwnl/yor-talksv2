import { z } from "zod";
import { contentCategorySchema } from "../utils/content-category.js";

const contentRatingSchema = z.enum(["child_safe", "regular", "mature"]);

export const createBroadcastChannelSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(500).optional().default(""),
  coverMediaId: z.string().uuid().optional(),
  contentCategory: contentCategorySchema.optional().default("other"),
  contentRating: contentRatingSchema.optional().default("regular"),
}).strict();

export const createBroadcastChannelMessageSchema = z.object({
  content: z.string().trim().min(1).max(2000),
  contentCategory: contentCategorySchema.optional().default("other"),
  contentRating: contentRatingSchema.optional().default("regular"),
});

export const updateBroadcastChannelNotificationsSchema = z.object({
  enabled: z.boolean(),
});

export const reactToBroadcastChannelMessageSchema = z.object({
  reaction: z.string().trim().min(1).max(16),
});
