import { z } from "zod";

const contentRatingSchema = z.enum(["child_safe", "regular", "mature"]);

export const createProductSchema = z.object({
  title: z.string().trim().min(2).max(150),
  description: z.string().trim().min(1).max(2000),
  price: z.number().finite().min(0).max(1_000_000_000).refine((value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-8, "Price can have at most two decimal places"),
  images: z.array(z.string().url()).default([]),
  category: z.string().trim().min(1).max(50),
  condition: z.enum(["new", "like-new", "used"]),
  contentRating: contentRatingSchema,
});
