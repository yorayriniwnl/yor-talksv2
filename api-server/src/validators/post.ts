import { z } from "zod";
import { contentCategorySchema } from "../utils/content-category.js";

const contentRatingSchema = z.enum(["child_safe", "regular", "mature"]);

export const createPostSchema = z.object({
  content: z.string().min(1).max(5000),
  images: z.array(z.string().url()).optional().default([]),
  contentCategory: contentCategorySchema,
  contentRating: contentRatingSchema.default("regular"),
});

export const editPostSchema = z.object({
  content: z.string().min(1).max(5000),
  contentCategory: contentCategorySchema.optional(),
  contentRating: contentRatingSchema.optional(),
});

export const commentSchema = z.object({
  content: z.string().min(1).max(2000),
});

export const replySchema = z.object({
  content: z.string().min(1).max(2000),
});
