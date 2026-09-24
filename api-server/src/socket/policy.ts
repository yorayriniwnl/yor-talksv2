import { z } from "zod";

const id = z.string().uuid();
const conversation = z.object({ conversationId: id }).strict();
const stream = z.object({ streamId: id }).strict();
const callId = z.string().min(8).max(80);
const call = z.object({ callId }).strict();
const offer = z.object({ type: z.literal("offer"), sdp: z.string().min(1).max(56 * 1024) }).strict();
const answer = z.object({ type: z.literal("answer"), sdp: z.string().min(1).max(56 * 1024) }).strict();
const candidate = z.object({
  candidate: z.string().max(4096),
  sdpMid: z.string().max(256).nullable().optional(),
  sdpMLineIndex: z.number().int().min(0).max(65_535).nullable().optional(),
  usernameFragment: z.string().max(256).nullable().optional(),
}).strict();
const peer = { streamId: id, targetSocketId: z.string().min(1).max(128) };

const schemas: Record<string, z.ZodTypeAny> = {
  "conversation:join": conversation,
  "conversation:leave": conversation,
  "typing:start": conversation,
  "typing:end": conversation,
  "message:send": z.object({
    recipientId: id.optional(), conversationId: id.optional(),
    content: z.string().trim().min(1).max(4000),
    idempotencyKey: id.optional(),
  }).strict().refine((value) => Boolean(value.recipientId) !== Boolean(value.conversationId)),
  "message:seen": z.object({ messageId: id }).strict(),
  "stream:join": stream,
  "stream:leave": stream,
  "webrtc:offer": z.object({ ...peer, offer }).strict(),
  "webrtc:answer": z.object({ ...peer, answer }).strict(),
  "webrtc:ice-candidate": z.object({ ...peer, candidate }).strict(),
  "call:invite": z.object({ callId, targetUserId: id, callType: z.enum(["audio", "video"]), offer }).strict(),
  "call:accept": call,
  "call:reject": call,
  "call:end": call,
  "call:answer": z.object({ callId, answer }).strict(),
  "call:ice": z.object({ callId, candidate }).strict(),
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
