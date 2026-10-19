import { z } from "zod";

export const moderationDecisionSchema = z.object({
  targetType: z.enum(["post", "user", "comment", "message", "video"]),
  targetId: z.string().trim().min(1).max(200),
  action: z.enum(["no_action", "restrict", "remove", "restore"]),
  scope: z.enum(["public", "direct_only", "global"]).default("global"),
  rationale: z.string().trim().min(10, "Rationale must be at least 10 characters long").max(5000),
  internalNotes: z.string().trim().max(5000).optional(),
  expiresAt: z.string().datetime().optional(),
  reportId: z.string().uuid().optional(),
  grievanceTicketId: z.string().uuid().optional(),
});

export const moderationAppealSchema = z.object({
  statement: z.string().trim().min(10, "Appeal statement must be at least 10 characters long").max(5000),
  relationship: z.enum(["author", "reporter", "affected_party"]).optional(),
});

export const moderationAppealReviewSchema = z.object({
  outcome: z.enum(["upheld", "reversed", "rejected"]),
  reviewerNotes: z.string().trim().min(10, "Reviewer notes must be at least 10 characters long").max(5000),
  rationale: z.string().trim().min(10).max(5000).optional(),
}).superRefine((data, ctx) => {
  if (data.outcome === "reversed" && !data.rationale) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["rationale"],
      message: "Rationale is required when reversing an enforcement.",
    });
  }
});

export const moderationNoticesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});
