import { z } from "zod";

export const reportSchema = z.object({
  entityType: z.enum(["post", "user", "comment", "message"]),
  entityId: z.string().trim().min(1).max(200),
  reason: z.enum(["spam", "harassment", "nsfw", "illegal", "hate_speech", "privacy_violation", "copyright", "other"]),
  details: z.string().trim().max(2000).optional(),
});
