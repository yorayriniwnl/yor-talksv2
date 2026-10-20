import { z } from "zod";
import { staffQueuePageFields } from '../utils/staff-queue-page.js';

export const reportQueueQuerySchema = z.object({
  status: z.enum(['pending', 'reviewed', 'resolved', 'dismissed']).optional(),
  ...staffQueuePageFields,
});

export const reportSchema = z.object({
  entityType: z.enum(["post", "user", "comment", "message", "video"]),
  entityId: z.string().trim().min(1).max(200),
  reason: z.enum(["spam", "harassment", "nsfw", "illegal", "hate_speech", "privacy_violation", "copyright", "other"]),
  details: z.string().trim().max(2000).optional(),
});

export const reportStatusSchema = z.object({
  status: z.enum(["pending", "reviewed", "resolved", "dismissed"]),
  decisionReason: z.string().trim().min(10).max(2000).optional(),
}).strict().superRefine((value, context) => {
  const finalDecision = value.status === 'resolved' || value.status === 'dismissed';
  if (finalDecision && !value.decisionReason) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['decisionReason'], message: 'A decision reason is required to resolve or dismiss a report.' });
  } else if (!finalDecision && value.decisionReason !== undefined) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['decisionReason'], message: 'A decision reason may only accompany a resolved or dismissed report.' });
  }
});
