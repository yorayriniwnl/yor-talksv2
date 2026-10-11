import { z } from "zod";
import type { Capability } from "../eligibility/types.js";

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
    content: z.string().trim().max(4000).default(""),
    mediaId: id.optional(),
    textStyleId: z.enum(['default', 'mono', 'rounded']).optional(),
    idempotencyKey: id.optional(),
  }).strict().refine((value) => Boolean(value.recipientId) !== Boolean(value.conversationId)).refine(value => Boolean(value.content || value.mediaId)),
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

export type SocketCapabilityRule = Capability | readonly Capability[] | "cleanup";

const inboundCapabilities: Record<string, SocketCapabilityRule> = {
  "conversation:join": "messaging",
  "conversation:leave": "cleanup",
  "typing:start": "messaging",
  "typing:end": "messaging",
  "message:send": "messaging",
  "message:seen": "messaging",
  "stream:join": "live",
  "stream:leave": "cleanup",
  "webrtc:offer": ["live", "rtc"],
  "webrtc:answer": ["live", "rtc"],
  "webrtc:ice-candidate": ["live", "rtc"],
  "call:invite": "rtc",
  "call:accept": "rtc",
  "call:reject": "rtc",
  "call:end": "cleanup",
  "call:answer": "rtc",
  "call:ice": "rtc",
};

const deliveryCapabilities: Record<string, readonly Capability[]> = {
  "presence:update": ["social"],
  "notification:new": ["social"],
  "story:reaction": ["social"],
  "conversation:created": ["messaging"],
  "conversation:vanish:update": ["messaging"],
  "message:receive": ["messaging"],
  "message:sent": ["messaging"],
  "message:update": ["messaging"],
  "message:seen:update": ["messaging"],
  "typing:start": ["messaging"],
  "typing:end": ["messaging"],
  "stream:peer-joined": ["live"],
  "stream:peer-left": ["live"],
  "webrtc:offer": ["live", "rtc"],
  "webrtc:answer": ["live", "rtc"],
  "webrtc:ice-candidate": ["live", "rtc"],
  "call:invite": ["rtc"],
  "call:accepted": ["rtc"],
  "call:rejected": ["rtc"],
  "call:answer": ["rtc"],
  "call:ice": ["rtc"],
  "call:ended": ["rtc"],
};

/** The connection itself grants only current social capability, never a feature capability. */
export function socketEventPolicy(event: string): SocketCapabilityRule | null {
  if (event === "socket:connect") return "social";
  return Object.hasOwn(inboundCapabilities, event) ? inboundCapabilities[event] : null;
}

/** Governed server-to-client events are explicitly enumerated; unknown events fail closed. */
export function socketDeliveryPolicy(event: string): readonly Capability[] | null {
  return Object.hasOwn(deliveryCapabilities, event) ? deliveryCapabilities[event] : null;
}

export function socketInboundEventNames(): string[] {
  return Object.keys(schemas).sort();
}

export function socketPolicyEventNames(): string[] {
  return Object.keys(inboundCapabilities).sort();
}

export function socketDeliveryEventNames(): string[] {
  return Object.keys(deliveryCapabilities).sort();
}

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
