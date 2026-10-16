import { z } from "zod";
import type { Server } from "socket.io";
import type { Capability } from "../eligibility/types.js";
import { EligibilityService } from "../services/eligibility-service.js";
import { UserRepository } from "../repositories/user-repository.js";
import { RedisRepository } from "../repositories/redis-repository.js";

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

export const SOCKET_CLIENT_EVENTS = Object.keys(schemas);
export const SOCKET_EVENT_CAPABILITIES: Readonly<Record<string, Capability>> = {
  "conversation:join": "messaging",
  "conversation:leave": "messaging",
  "typing:start": "messaging",
  "typing:end": "messaging",
  "message:send": "messaging",
  "message:seen": "messaging",
  "stream:join": "live",
  "stream:leave": "live",
  "webrtc:offer": "rtc",
  "webrtc:answer": "rtc",
  "webrtc:ice-candidate": "rtc",
  "call:invite": "rtc",
  "call:accept": "rtc",
  "call:reject": "rtc",
  "call:end": "rtc",
  "call:answer": "rtc",
  "call:ice": "rtc",
  "session:connect": "social",
  "presence:deliver": "social",
  "message:deliver": "messaging",
  "typing:deliver": "messaging",
  "stream:deliver": "live",
  "rtc:deliver": "rtc",
  "notification:deliver": "social",
};

export class SocketActionDeniedError extends Error {
  constructor(readonly capability: Capability | undefined) { super("Realtime capability is unavailable"); }
}

type SocketAuthorityDependencies = {
  userRepository?: Pick<UserRepository, "findById">;
  eligibilityService?: Pick<EligibilityService, "decisionFor">;
  redisRepository?: Pick<RedisRepository, "getStrict">;
};
const defaultUserRepository = new UserRepository();
const defaultEligibilityService = new EligibilityService();
const defaultRedisRepository = new RedisRepository();
export type SocketRequester = { userId: string; deviceId: string; authVersion: number };

/** Reloads account status and the current database-backed eligibility decision for every action/delivery. */
export async function authorizeSocketAction(userId: string, event: string, dependencies: SocketAuthorityDependencies = {}, requester?: SocketRequester): Promise<void> {
  const capability = SOCKET_EVENT_CAPABILITIES[event];
  if (!capability) throw new SocketActionDeniedError(undefined);
  const repository = dependencies.userRepository ?? defaultUserRepository;
  const eligibility = dependencies.eligibilityService ?? defaultEligibilityService;
  const user = await repository.findById(userId);
  if (!user || (user.accountStatus ?? "active") !== "active") throw new SocketActionDeniedError(capability);
  if (requester && (requester.userId !== userId || requester.authVersion !== (user.authVersion ?? 0)
    || !await (dependencies.redisRepository ?? defaultRedisRepository).getStrict(`session:${userId}:${requester.deviceId}`))) {
    throw new SocketActionDeniedError(capability);
  }
  const decision = await eligibility.decisionFor(userId);
  if (!decision.activated || !decision.capabilities[capability]) throw new SocketActionDeniedError(capability);
}

/** Per-recipient dispatch rechecks the recipient immediately before emitting. */
export async function dispatchSocketToUsers(
  io: Server,
  userIds: string[],
  event: string,
  payload: unknown | ((requester: SocketRequester) => unknown | Promise<unknown>),
  authorityEvent: string,
  excludeSocketId?: string,
  deliveryGuard?: (requester: SocketRequester) => boolean | void | Promise<boolean | void>,
): Promise<number> {
  const recipients = [...new Set(userIds)];
  let delivered = 0;
  for (const userId of recipients) {
    const sockets = await io.in(userId).fetchSockets();
    for (const socket of sockets) {
      if (socket.id === excludeSocketId || socket.data.userId !== userId) continue;
      try {
        const requester={userId,deviceId:String(socket.data.deviceId??''),authVersion:Number(socket.data.authVersion??-1)};
        const requireCurrentToken = () => {
          const expiresAt = socket.data.expiresAt;
          if (typeof expiresAt !== 'number' || !Number.isSafeInteger(expiresAt) || expiresAt <= Date.now()) {
            throw new SocketActionDeniedError(SOCKET_EVENT_CAPABILITIES[authorityEvent]);
          }
        };
        requireCurrentToken();
        await authorizeSocketAction(userId, authorityEvent, {}, requester);
        const recipientPayload=typeof payload==='function'?await payload(requester):payload;
        // Authority may change while an asynchronous payload is hydrated.
        requireCurrentToken();
        await authorizeSocketAction(userId, authorityEvent, {}, requester);
        // A current privacy preference can suppress an optional event without
        // revoking the recipient's otherwise valid session.
        const admitted = await deliveryGuard?.(requester);
        requireCurrentToken();
        if (admitted === false) continue;
        // Guards can await contact, audience or preference lookups. The device
        // session must still be valid after those final asynchronous checks.
        await authorizeSocketAction(userId, authorityEvent, {}, requester);
        // Expiry timers may run late; the signed token's deadline is authority
        // even when a payload, guard or session lookup crossed that deadline.
        requireCurrentToken();
        io.to(socket.id).emit(event, recipientPayload);
        delivered++;
      } catch {
        // A revoked or restricted recipient receives no governed event.
        socket.disconnect(true);
      }
    }
  }
  return delivered;
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
