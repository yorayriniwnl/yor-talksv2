import { z } from "zod";

export const uuidParamSchema = z.object({
  id: z.string().uuid("Invalid UUID format"),
});

export const userIdParamSchema = z.object({
  userId: z.string().uuid("Invalid user ID format"),
});

export const followRequestIdParamSchema = z.object({
  requestId: z.string().uuid("Invalid follow request ID format"),
});

export const usernameParamSchema = z.object({
  username: z.string().regex(/^[a-zA-Z0-9_]{3,24}$/, "Invalid username format"),
});

export const postIdParamSchema = z.object({
  postId: z.string().uuid("Invalid post ID format"),
});

export const commentIdParamSchema = z.object({
  commentId: z.string().uuid("Invalid comment ID format"),
});

export const conversationIdParamSchema = z.object({
  conversationId: z.string().uuid("Invalid conversation ID format"),
});

export const messageIdParamSchema = z.object({
  messageId: z.string().uuid("Invalid message ID format"),
});

export const notificationIdParamSchema = z.object({
  notificationId: z.string().uuid("Invalid notification ID format"),
});

export const reportIdParamSchema = z.object({
  reportId: z.string().uuid("Invalid report ID format"),
});

export const challengeIdParamSchema = z.object({
  challengeId: z.string().uuid("Invalid challenge ID format"),
});
