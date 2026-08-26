import { z } from "zod";

export const createBusinessSchema = z.object({
  name: z.string().trim().min(2).max(120),
  industry: z.string().trim().min(2).max(80).default("General"),
  website: z.string().url().max(500).optional(),
  contactEmail: z.string().email().max(320).optional(),
});
