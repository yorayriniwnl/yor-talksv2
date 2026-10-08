import { z } from "zod";

export const messageSchema = z.object({
  recipientId: z.string().uuid().optional(),
  conversationId: z.string().uuid().optional(),
  content: z.string().trim().max(4000).default(""),
  mediaId: z.string().uuid().optional(),
  replyToId: z.string().uuid().optional(),
  textStyleId: z.enum(["default", "mono", "rounded"]).optional(),
  idempotencyKey: z.string().uuid().optional(),
}).strict().refine((value) => Boolean(value.recipientId) !== Boolean(value.conversationId), {
  message: "Provide exactly one of recipientId or conversationId",
}).refine(value => Boolean(value.content || value.mediaId), { message: "Text or approved media is required" });

export const conversationMessagesQuerySchema = z.object({
  direction: z.enum(["latest", "older", "newer"]).optional(),
  cursorAt: z.string().datetime().optional(),
  cursorId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
}).strict().superRefine((value, context) => {
  const hasCursorAt = Boolean(value.cursorAt);
  const hasCursorId = Boolean(value.cursorId);
  if (hasCursorAt !== hasCursorId) {
    context.addIssue({ code: "custom", message: "cursorAt and cursorId must be provided together" });
  }
  if ((value.direction === "older" || value.direction === "newer") && !hasCursorAt) {
    context.addIssue({ code: "custom", message: "A cursor is required for older and newer pages" });
  }
  if (value.direction === "latest" && hasCursorAt) {
    context.addIssue({ code: "custom", message: "The latest page cannot include a cursor" });
  }
});

export const createGroupChatSchema = z.object({
  memberIds: z.array(z.string().uuid()).min(1).max(99),
  title: z.string().trim().max(120).optional().default("Group Chat"),
});
