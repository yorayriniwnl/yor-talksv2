import { z } from "zod";

const contentRatingSchema = z.enum(["child_safe", "regular", "mature"]);

export const createEventSchema = z.object({
  title: z.string().trim().min(2).max(150),
  description: z.string().trim().max(2000).default(""),
  coverUrl: z.string().url(),
  category: z.string().min(1).max(50),
  startsAt: z.string().datetime({ offset: true }),
  location: z.string().trim().min(1).max(200),
  isOnline: z.boolean().default(false),
  contentRating: contentRatingSchema,
});

export const rsvpSchema = z.object({
  status: z.enum(["going", "interested"]).nullable(),
});
