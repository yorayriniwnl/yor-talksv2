import { z } from "zod";

export const createEventSchema = z.object({
  title: z.string().min(2).max(150),
  description: z.string().max(2000).default(""),
  coverUrl: z.string().url(),
  category: z.string().min(1).max(50),
  startsAt: z.string().datetime({ offset: true }),
  location: z.string().min(1).max(200),
  isOnline: z.boolean().default(false),
});

export const rsvpSchema = z.object({
  status: z.enum(["going", "interested"]).nullable(),
});
