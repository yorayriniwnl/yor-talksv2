import { z } from "zod";

export const createDiscussionSchema = z.object({
  title: z.string().trim().min(3).max(160),
  content: z.string().trim().max(4_000).optional().default(""),
  tag: z.enum(["General", "Guides", "LFG / Clans", "Trading", "Announcements"]).default("General"),
});
