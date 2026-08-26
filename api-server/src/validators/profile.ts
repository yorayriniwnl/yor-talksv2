import { z } from "zod";

export const profileCommentSchema = z.object({
  content: z.string().trim().min(1).max(280),
});

export const profileShowcaseSchema = z.object({
  type: z.enum(["achievement", "post", "custom"]),
  title: z.string().trim().min(1).max(120),
  contentId: z.string().uuid().optional(),
  customText: z.string().trim().max(500).optional(),
  customImageUrl: z.string().url().max(2000).optional(),
});

export const profileCommentIdParamSchema = z.object({
  userId: z.string().uuid(),
  commentId: z.string().uuid(),
});

export const profileShowcaseIdParamSchema = z.object({
  userId: z.string().uuid(),
  showcaseId: z.string().uuid(),
});
