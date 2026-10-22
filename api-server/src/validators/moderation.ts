import { z } from "zod";

export const moderationTargetTypeSchema = z.enum(["post", "user", "comment", "message", "video"]);
export const moderationTargetSchema = z.object({ targetType: moderationTargetTypeSchema, targetId: z.string().uuid() });

export const moderationDecisionSchema = z.object({
  ...moderationTargetSchema.shape,
  action: z.enum(["no_action", "restrict", "remove", "restore"]),
  scope: z.enum(["public", "direct_only", "global"]).default("global"),
  rationale: z.string().trim().min(10, "Rationale must be at least 10 characters long").max(5000),
  internalNotes: z.string().trim().max(5000).optional(),
  expiresAt: z.string().datetime().optional(),
  reportId: z.string().uuid().optional(),
  grievanceTicketId: z.string().uuid().optional(),
}).strict();

export const moderationAppealSchema = z.object({
  decisionId: z.string().uuid(),
  statement: z.string().trim().min(10, "Appeal statement must be at least 10 characters long").max(5000),
  relationship: z.enum(["author", "reporter", "affected_party"]).optional(),
}).strict();

export const moderationAppealReviewSchema = z.object({
  outcome: z.enum(["upheld", "reversed", "rejected"]),
  action: z.enum(["restore", "restrict", "remove"]).optional(),
  reviewerNotes: z.string().trim().min(10, "Reviewer notes must be at least 10 characters long").max(5000),
  rationale: z.string().trim().min(10).max(5000),
}).strict().refine(data => !data.action || data.outcome === 'reversed', { message: 'An enforcement action is only valid for a reversal' });

export const moderationNoticesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).max(10000).default(0),
}).strict();

export const moderationHistoryQuerySchema = moderationNoticesQuerySchema.extend(moderationTargetSchema.shape);
export const moderationAppealsQuerySchema = moderationNoticesQuerySchema.extend({
  status: z.enum(["pending", "under_review", "upheld", "reversed", "rejected"]).optional(),
});
export const moderationNoticeParamsSchema = z.object({ noticeId: z.string().uuid() });
export const moderationAppealParamsSchema = z.object({ appealId: z.string().uuid() });
