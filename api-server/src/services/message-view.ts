import type { MessageRecord } from '../types/index.js';

export type MessageTombstone = Pick<MessageRecord, 'id' | 'conversationId' | 'deletedAt' | 'seenAt' | 'expiresAt'> & { tombstone: true };

/** Allowlist: a deletion event never carries the retained body, identity,
 * attachment marker, reply, reactions, or any future database field. */
export function messageTombstone(message: MessageRecord): MessageTombstone {
  return { id: message.id, conversationId: message.conversationId, deletedAt: message.deletedAt ?? null,
    seenAt: message.seenAt ?? null, expiresAt: message.expiresAt ?? null, tombstone: true };
}
