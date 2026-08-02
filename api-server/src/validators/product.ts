import { z } from "zod";

export const createProductSchema = z.object({
  title: z.string().min(2).max(150),
  description: z.string().min(1).max(2000),
  price: z.number().int().min(0),
  images: z.array(z.string().url()).default([]),
  category: z.string().min(1).max(50),
  condition: z.enum(["new", "like-new", "used"]),
});
