import { z } from "zod";
import { contentCategorySchema } from "../utils/content-category.js";

const contentRatingSchema = z.enum(["child_safe", "regular", "mature"]);

export const createPostSchema = z.object({
  content: z.string().trim().min(1).max(5000),
  images: z.array(z.string().url()).optional().default([]),
  contentCategory: contentCategorySchema,
  contentRating: contentRatingSchema,
  poll: z.object({
    question: z.string().trim().min(1).max(240),
    options: z.array(z.object({ text: z.string().trim().min(1).max(80) })).min(2).max(4),
  }).optional(),
});

export const pollVoteSchema = z.object({
  optionId: z.string().uuid("Invalid poll option ID"),
});

export const repostSchema = z.object({
  note: z.string().trim().max(500).optional(),
});

export const editPostSchema = z.object({
  content: z.string().trim().min(1).max(5000),
  contentCategory: contentCategorySchema.optional(),
  contentRating: contentRatingSchema.optional(),
});

const commentAttachmentSchema = z.object({
  mediaUrl: z.string().url().max(2000).optional(),
  mediaType: z.enum(["image", "gif", "audio"]).optional(),
  mediaDuration: z.number().int().min(1).max(600).optional(),
});

export const commentSchema = z.object({
  content: z.string().trim().max(2000).default(""),
  ...commentAttachmentSchema.shape,
}).superRefine((value, ctx) => {
  if (!value.content && !value.mediaUrl) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["content"], message: "Comment text or an attachment is required" });
  }
  if (value.mediaUrl && !value.mediaType) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["mediaType"], message: "Attachment type is required" });
  }
  if (!value.mediaUrl && (value.mediaType || value.mediaDuration)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["mediaUrl"], message: "Attachment URL is required" });
  }
});

export const replySchema = z.object({
  content: z.string().trim().min(1).max(2000),
});
