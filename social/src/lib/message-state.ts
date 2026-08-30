import type { Conversation, Message } from './store';

export function isUnreadMessage(message: Message | undefined, currentUserId?: string): boolean {
  return Boolean(currentUserId && message && !message.deletedAt && !message.read && message.senderId !== currentUserId);
}

export function hasUnreadConversation(conversation: Conversation, currentUserId?: string): boolean {
  return isUnreadMessage(conversation.lastMessage, currentUserId);
}

/** HTTP acknowledgements and socket echoes describe the same persisted message. */
export function upsertMessage(messages: Message[], incoming: Message): Message[] {
  const byId = new Map(messages.map((message) => [message.id, message]));
  if (incoming.deletedAt) byId.delete(incoming.id);
  else byId.set(incoming.id, { ...incoming, read: incoming.read || byId.get(incoming.id)?.read || false });
  return [...byId.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/** A stale HTTP snapshot must not undo realtime edits, deletions or receipts. */
export function reconcileMessageSnapshot(before: Message[], current: Message[], snapshot: Message[]): Message[] {
  const beforeById = new Map(before.map((message) => [message.id, message]));
  const currentIds = new Set(current.map((message) => message.id));
  const deletedDuringRequest = new Set(before.filter((message) => !currentIds.has(message.id)).map((message) => message.id));
  const liveChanges = current.filter((message) => beforeById.get(message.id) !== message);
  return liveChanges.reduce(upsertMessage, snapshot.filter((message) => !deletedDuringRequest.has(message.id)));
}
