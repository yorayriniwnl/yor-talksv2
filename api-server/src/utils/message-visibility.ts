import { and, gt, isNull, or, sql, type SQL } from "drizzle-orm";
import { messagesTable } from "@workspace/db/schema";
import type { MessageRecord } from "../types/index.js";

/** Drizzle returns UTC timestamp-without-time-zone columns without a suffix. */
export function isMessageVisible(message: Pick<MessageRecord, "deletedAt" | "expiresAt">, now: Date): boolean {
  if (!Number.isFinite(now.getTime()) || message.deletedAt != null) return false;
  if (message.expiresAt == null) return true;
  const value = message.expiresAt;
  const timestamp = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(value)
    ? `${value.replace(" ", "T")}Z` : value;
  const expiry = Date.parse(timestamp);
  return Number.isFinite(expiry) && expiry > now.getTime();
}

/** Use a captured date for exports, or a fresh database clock after lock waits. */
export function visibleMessagePredicate(now: Date | SQL): SQL {
  const boundary = now instanceof Date ? sql`${now.toISOString()}::timestamptz` : now;
  // Fresh Drizzle schemas store a UTC wall timestamp, while legacy migrations
  // can have timestamptz. Compare instants without letting the session zone
  // reinterpret either representation or changing the stored schema.
  const expiry = sql`CASE WHEN pg_typeof(${messagesTable.expiresAt})='timestamp without time zone'::regtype
    THEN (${messagesTable.expiresAt}::timestamp AT TIME ZONE 'UTC') ELSE ${messagesTable.expiresAt}::timestamptz END`;
  return and(isNull(messagesTable.deletedAt), or(isNull(messagesTable.expiresAt), gt(expiry, boundary)),
    sql`NOT EXISTS (SELECT 1 FROM moderation_enforcements me
      WHERE ((me.target_type='message' AND me.target_id=${messagesTable.id}::text)
        OR (me.target_type='user' AND me.target_id=${messagesTable.senderId}::text))
        AND (me.expires_at IS NULL OR me.expires_at>clock_timestamp()))`)!;
}

export function toMessageTombstone(message: MessageRecord): MessageRecord {
  return {
    id: message.id, conversationId: message.conversationId,
    senderId: message.senderId, recipientId: message.recipientId,
    createdAt: message.createdAt, seenAt: message.seenAt,
    deletedAt: message.deletedAt, expiresAt: message.expiresAt,
    content: "", mediaId: null, mediaUrl: null, mediaType: null,
    mediaDuration: null, mediaLegacy: false,
  };
}
