import { api } from './api-client';
import type { Message } from './store';

const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;

export function approvedMessageDeliveryUrl(message: Message): string | null {
  if (!message.mediaId || !uuid.test(message.mediaId) || message.mediaLegacy === true
    || !['image', 'audio'].includes(message.mediaType ?? '') || !message.mediaUrl || message.deletedAt) return null;
  if (message.expiresAt && (!Number.isFinite(Date.parse(message.expiresAt)) || Date.parse(message.expiresAt) <= Date.now())) return null;
  try {
    const apiOrigin = new URL(import.meta.env.VITE_API_BASE_URL || '/api', window.location.origin).origin;
    const url = new URL(message.mediaUrl, apiOrigin);
    if (![apiOrigin, window.location.origin].includes(url.origin) || url.username || url.password || url.hash
      || url.pathname !== `/api/media/${message.mediaId}/content` || !url.searchParams.get('token')) return null;
    return url.href;
  } catch {
    return null;
  }
}

export async function readFreshMessageDelivery(message: Message): Promise<string> {
  const previous = approvedMessageDeliveryUrl(message);
  if (!previous || !uuid.test(message.id) || !uuid.test(message.conversationId)
    || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(message.createdAt)
    || !Number.isFinite(Date.parse(message.createdAt))) throw new Error('Attachment delivery could not be renewed.');

  // Pages exclude their cursor. An adjacent UUID at the exact same timestamp
  // makes the target the next tuple, even far beyond the latest history page.
  // Only the final 48 bits change, preserving the UUID version and variant.
  const tail = Number.parseInt(message.id.slice(24), 16);
  const direction = tail > 0 ? 'newer' : 'older';
  const cursorId = message.id.slice(0, 24) + (tail > 0 ? tail - 1 : tail + 1).toString(16).padStart(12, '0');
  const page = await api.getConversationMessages(message.conversationId, {
    direction, cursorAt: message.createdAt, cursorId, limit: 1,
  });
  const fresh = Array.isArray(page) && page.length === 1 ? page[0] : undefined;
  if (!fresh || fresh.id !== message.id || fresh.conversationId !== message.conversationId || fresh.senderId !== message.senderId
    || fresh.createdAt !== message.createdAt || fresh.mediaId !== message.mediaId || fresh.mediaType !== message.mediaType
    || typeof fresh.mediaUrl !== 'string') throw new Error('This attachment is no longer available.');
  const delivery = approvedMessageDeliveryUrl({ ...message, ...fresh });
  if (!delivery || delivery === previous) throw new Error('A fresh attachment delivery grant is unavailable.');
  return delivery;
}
