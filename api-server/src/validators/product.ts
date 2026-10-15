import { z } from "zod";
import { MAX_MARKETPLACE_PRICE } from "../lib/money.js";

const contentRatingSchema = z.enum(["child_safe", "regular", "mature"]);

export const createProductSchema = z.object({
  title: z.string().trim().min(2).max(150),
  description: z.string().trim().min(1).max(2000),
  price: z.number().finite().min(1, "Price must be at least ₹1").max(MAX_MARKETPLACE_PRICE, "Price exceeds the maximum supported by the payment ledger").refine((value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-8, "Price can have at most two decimal places"),
  mediaIds: z.array(z.string().uuid()).max(10).default([]),
  category: z.string().trim().min(1).max(50),
  condition: z.enum(["new", "like-new", "used"]),
  contentRating: contentRatingSchema,
}).strict();
