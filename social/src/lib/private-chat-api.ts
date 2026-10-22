import { request } from './api-client';

export type PrivateChatPublicIdentity = { userId: string; publicKey: string; fingerprint: string; createdAt: string };
export type PrivateChatThread = { id: string; participantIds: [string, string]; createdAt: string; updatedAt: string };
export type PrivateChatThreadDetail = { thread: PrivateChatThread; members: PrivateChatPublicIdentity[] };
export type PrivateChatEnvelope = { id: string; threadId: string; senderId: string; ciphertext: string; createdAt: string };
const path = (id: string) => `/private-messages/threads/${encodeURIComponent(id)}`;

export const privateChatApi = {
  identity: () => request<PrivateChatPublicIdentity | null>('/private-messages/identity'),
  enroll: (publicKey: string, fingerprint: string) => request<PrivateChatPublicIdentity>('/private-messages/identity', {
    method: 'PUT', body: JSON.stringify({ publicKey, fingerprint }),
  }),
  threads: () => request<{ items: PrivateChatThread[] }>('/private-messages/threads'),
  thread: (id: string) => request<PrivateChatThreadDetail>(path(id)),
  createThread: (recipientId: string) => request<PrivateChatThreadDetail>('/private-messages/threads', {
    method: 'POST', body: JSON.stringify({ recipientId }),
  }),
  messages: (id: string, after?: string | null) => request<{ items: PrivateChatEnvelope[]; nextCursor: string | null; hasMore: boolean }>(
    `${path(id)}/messages?${new URLSearchParams({ limit: '10', ...(after ? { after } : {}) })}`,
  ),
  send: (threadId: string, envelope: { id: string; ciphertext: string }) => request<PrivateChatEnvelope>(
    `${path(threadId)}/messages`, { method: 'POST', body: JSON.stringify(envelope) },
  ),
};
