import { z } from "zod";

export const grievanceSchema = z.object({
  category: z.enum(["copyright", "hate_speech", "harassment", "impersonation", "privacy_violation", "other"]),
  reportedUrl: z.string().trim().min(2).max(500),
  reporterName: z.string().trim().min(2).max(120),
  reporterEmail: z.string().trim().email().max(320),
  description: z.string().trim().min(10).max(10000),
});

export const grievanceTicketParamSchema = z.object({
  ticketId: z.string().regex(/^YT-GRV-[A-Z0-9]{10}$/),
});
