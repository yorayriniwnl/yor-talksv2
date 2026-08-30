import { z } from "zod";

const id = z.string().uuid();
const conversation = z.object({ conversationId: id }).strict();
const stream = z.object({ streamId: id }).strict();
const callId = z.string().min(8).max(80);
const call = z.object({ callId }).strict();
const signal = z.record(z.unknown());
const peer = { streamId: id, targetSocketId: z.string().min(1).max(128) };

const schemas: Record<string, z.ZodTypeAny> = {
  "conversation:join": conversation,
  "conversation:leave": conversation,
  "typing:start": conversation,
  "typing:end": conversation,
  "message:send": z.object({
    recipientId: id.optional(), conversationId: id.optional(),
    content: z.string().trim().min(1).max(4000),
  }).strict().refine((value) => Boolean(value.recipientId) !== Boolean(value.conversationId)),
  "message:seen": z.object({ messageId: id }).strict(),
  "stream:join": stream,
  "stream:leave": stream,
  "webrtc:offer": z.object({ ...peer, offer: signal }).strict(),
  "webrtc:answer": z.object({ ...peer, answer: signal }).strict(),
  "webrtc:ice-candidate": z.object({ ...peer, candidate: signal }).strict(),
  "call:invite": z.object({ callId, targetUserId: id, callType: z.enum(["audio", "video"]), offer: signal }).strict(),
  "call:accept": call,
  "call:reject": call,
  "call:end": call,
  "call:answer": z.object({ callId, answer: signal }).strict(),
  "call:ice": z.object({ callId, candidate: signal }).strict(),
};

export function parseSocketPayload(event: string, payload: unknown) {
  // An allowlist also rejects prototype keys such as "constructor".
  const schema = Object.hasOwn(schemas, event) ? schemas[event] : undefined;
  return schema?.safeParse(payload) ?? { success: false as const };
}

export function socketErrorEvent(event: string): string {
  if (event.startsWith("message:")) return "message:error";
  if (event.startsWith("stream:") || event.startsWith("webrtc:")) return "stream:error";
  if (event.startsWith("call:")) return "call:error";
  return "realtime:error";
}
