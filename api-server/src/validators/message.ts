import { z } from "zod";

export const messageSchema = z.object({
  recipientId: z.string().uuid().optional(),
  conversationId: z.string().uuid().optional(),
  content: z.string().trim().min(1).max(4000),
  replyToId: z.string().uuid().optional(),
}).refine((value) => Boolean(value.recipientId || value.conversationId), {
  message: "recipientId or conversationId is required",
});

export const createGroupChatSchema = z.object({
  memberIds: z.array(z.string().uuid()).min(1).max(99),
  title: z.string().trim().max(120).optional().default("Group Chat"),
});
