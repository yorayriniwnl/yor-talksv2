import { z } from "zod";
import { contentCategorySchema } from "../utils/content-category.js";

const contentRatingSchema = z.enum(["child_safe", "regular", "mature"]);

export const createArticleSchema = z.object({
  title: z.string().trim().min(2).max(200),
  excerpt: z.string().trim().min(1).max(500),
  content: z.string().trim().min(1),
  coverUrl: z.string().url(),
  readTime: z.number().int().min(0).default(0),
  collection: z.string().max(100).optional(),
  contentCategory: contentCategorySchema,
  contentRating: contentRatingSchema,
});

export const clapSchema = z.object({
  count: z.number().int().min(1).max(50).default(1),
});
