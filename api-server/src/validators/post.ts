import { z } from "zod";

const contentRatingSchema = z.enum(["child_safe", "regular", "mature"]);

export const createPostSchema = z.object({
  content: z.string().min(1).max(5000),
  images: z.array(z.string().url()).optional().default([]),
  contentRating: contentRatingSchema.default("regular"),
});

export const editPostSchema = z.object({
  content: z.string().min(1).max(5000),
  contentRating: contentRatingSchema.optional(),
});

export const commentSchema = z.object({
  content: z.string().min(1).max(2000),
});

export const replySchema = z.object({
  content: z.string().min(1).max(2000),
});
