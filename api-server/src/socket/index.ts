import { hydrateMediaValue } from "../services/media-response.js";
import { MediaLifecycleError } from "../services/media-service.js";
import { Server } from "socket.io";
import type { Server as HttpServer } from "node:http";
import { createAdapter } from "@socket.io/redis-adapter";
import { Redis } from "ioredis";
import jwt from "jsonwebtoken";
import { env, corsOrigins } from "../config/env.js";
import { logger } from "../lib/logger.js";
import { clearAuthorizedRealtimeDispatcher, emitToRoom, emitToSocket, emitToUser, setAuthorizedRealtimeDispatcher, type AuthorizedRealtimeDispatcher } from "../lib/realtime.js";
import { ConversationRepository, MessageRepository } from "../repositories/message-repository.js";
import { UserRepository } from "../repositories/user-repository.js";
import { InvalidMessageContentError, InvalidMessageStyleError, MessageBlockedError, MessageService, PremiumFeatureUnavailableError } from "../services/message-service.js";
import { RedisRepository } from "../repositories/redis-repository.js";
import { LiveStreamRepository } from "../repositories/live-stream-repository.js";
import { ContentSafetyService } from "../services/content-safety-service.js";
import { hasCurrentConsent } from "../utils/consent.js";
import { EligibilityService } from "../services/eligibility-service.js";
import type { Capability, EligibilityDecision } from "../eligibility/types.js";
import { isEligibilityEnforcementEnabled } from "../eligibility/enforcement.js";
import { isTrustedOrigin } from "../middlewares/trusted-origin.js";
import { parseSocketPayload, socketDeliveryPolicy, socketErrorEvent, socketEventPolicy } from "./policy.js";

type SocketAuthorityContext = {
  deviceId?: unknown;
  expiresAt?: unknown;
  authVersion?: unknown;
  authorizedCapabilities?: Record<Capability, boolean>;
};
type SocketAuthorizationReason = "session" | "consent" | "eligibility" | "capability" | "unavailable";

class SocketAuthorizationError extends Error {
  constructor(
    readonly reason: SocketAuthorizationReason,
    message: string,
    readonly capability?: Capability,
    readonly decision?: EligibilityDecision,
  ) {
    super(message);
    this.name = "SocketAuthorizationError";
  }
}

export const attachSocketServer = async (httpServer: HttpServer) => {
  const io = new Server(httpServer, {
    maxHttpBufferSize: 64 * 1024,
    // CORS alone does not protect the WebSocket transport.
    allowRequest: (request, callback) => callback(null, isTrustedOrigin(request.headers.origin)),
    cors: {
      origin: corsOrigins,
      methods: ["GET", "POST"],
    },
  });
  const pubClient = new Redis(env.REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: null });
  const subClient = pubClient.duplicate({ lazyConnect: true, maxRetriesPerRequest: null });
  try {
    await Promise.all([pubClient.connect(), subClient.connect()]);
    io.adapter(createAdapter(pubClient, subClient));
  } catch (error) {
    pubClient.disconnect();
    subClient.disconnect();
    throw new Error("Socket.IO Redis adapter could not be initialized", { cause: error });
  }
  const conversationRepository = new ConversationRepository();
  const userRepository = new UserRepository();
  const redisRepository = new RedisRepository();
  const eligibilityService = new EligibilityService();
  let closing=false;
  const presenceTasks=new Set<Promise<unknown>>();
  const messageService = new MessageService(conversationRepository, new MessageRepository(), userRepository);
  const liveStreamRepository = new LiveStreamRepository();
  const contentSafetyService = new ContentSafetyService(userRepository);
  type ActiveCall = { id: string; callerId: string; recipientId: string; createdAt: number; status: "ringing" | "active" };
  const callTimeouts = new Map<string, ReturnType<typeof setTimeout>>();
  const clearCallTimeout = (callId: string) => {
    const timeout = callTimeouts.get(callId);
    if (timeout) clearTimeout(timeout);
    callTimeouts.delete(callId);
  };
  const stopLiveSessions = async (userId: string): Promise<void> => {
    const sessions = await io.in(userId).fetchSockets();
    for (const session of sessions) {
      const streamRooms = [...session.rooms].filter((room) => room.startsWith("stream:"));
      for (const room of streamRooms) {
        await emitToRoom(room, "stream:peer-left", { userId, socketId: session.id }, session.id);
      }
      if (streamRooms.length) session.disconnect(true);
    }
  };
  const stopRtcSessions = async (userId: string): Promise<void> => {
    const callId = await redisRepository.getSocketCallIdForUserStrict(userId);
    if (callId) {
      const raw = await redisRepository.releaseSocketCallStrict(callId);
      if (raw) {
        clearCallTimeout(callId);
        try {
          const call = JSON.parse(raw) as ActiveCall;
          const peerId = call.callerId === userId ? call.recipientId : call.callerId;
          await emitToUser(peerId, "call:ended", { callId });
        } catch (error) {
          logger.warn({ error, userId, callId }, "Could not decode a revoked realtime call");
        }
      }
    }
    io.in(userId).disconnectSockets(true);
  };
  const authorizeSocketAction = async (
    userId: string,
    event: string,
    context: SocketAuthorityContext,
    explicitRule?: readonly Capability[],
  ): Promise<EligibilityDecision | null> => {
    const rule = explicitRule ?? socketEventPolicy(event);
    if (!rule) throw new SocketAuthorizationError("capability", "Realtime event is not authorized");
    const deviceId = context.deviceId;
    const expiresAt = context.expiresAt;
    const authVersion = context.authVersion;
    if (typeof deviceId !== "string" || typeof expiresAt !== "number" || typeof authVersion !== "number" || Date.now() >= expiresAt)
      throw new SocketAuthorizationError("session", "Session revoked");

    let session: string | null;
    let user;
    try {
      [session, user] = await Promise.all([
        redisRepository.getStrict(`session:${userId}:${deviceId}`),
        userRepository.findById(userId),
      ]);
    } catch (error) {
      throw new SocketAuthorizationError("unavailable", "Realtime authorization is temporarily unavailable");
    }
    if (!session || !user || (user.authVersion ?? 0) !== authVersion || ["suspended", "deactivated", "deleted"].includes(user.accountStatus ?? "active"))
      throw new SocketAuthorizationError("session", "Session revoked");
    if (!hasCurrentConsent(user)) throw new SocketAuthorizationError("consent", "Current terms acceptance required");
    if (!isEligibilityEnforcementEnabled()) return null;

    let decision: EligibilityDecision;
    try {
      decision = await eligibilityService.decisionFor(user.id);
    } catch {
      throw new SocketAuthorizationError("unavailable", "Realtime authorization is temporarily unavailable");
    }
    if (!decision.activated || !decision.capabilities.social) {
      context.authorizedCapabilities = decision.capabilities;
      throw new SocketAuthorizationError("eligibility", "Account eligibility verification required", undefined, decision);
    }
    const previous = context.authorizedCapabilities;
    if (previous?.live && !decision.capabilities.live) await stopLiveSessions(userId);
    if (previous?.rtc && !decision.capabilities.rtc) await stopRtcSessions(userId);
    context.authorizedCapabilities = decision.capabilities;
    if (rule !== "cleanup") {
      const required = typeof rule === "string" ? [rule] : rule;
      const denied = required.find((capability) => !decision.capabilities[capability]);
      if (denied) throw new SocketAuthorizationError("capability", "This realtime feature is unavailable for this account", denied, decision);
    }
    return decision;
  };
  const removeRoomsForCapability = async (
    userId: string,
    capability: Capability,
  ): Promise<void> => {
    if (capability === "rtc") {
      const callId = await redisRepository.getSocketCallIdForUserStrict(userId);
      if (callId) await stopRtcSessions(userId);
      return;
    }
    const prefix = capability === "messaging" ? "conversation:" : capability === "live" ? "stream:" : null;
    if (!prefix) return;
    const sessions = await io.in(userId).fetchSockets();
    for (const session of sessions) {
      const matchingRooms = [...session.rooms].filter((room) => room.startsWith(prefix));
      if (capability === "live" && matchingRooms.length) {
        for (const room of matchingRooms) await emitToRoom(room, "stream:peer-left", { userId, socketId: session.id }, session.id);
        session.disconnect(true);
      } else {
        for (const room of matchingRooms) await session.leave(room);
      }
    }
  };
  const removeRevokedFeatureRooms = async (
    userId: string,
    rooms: ReadonlySet<string>,
    decision: EligibilityDecision | null,
  ): Promise<void> => {
    if (!decision) return;
    if (!decision.capabilities.messaging && [...rooms].some((room) => room.startsWith("conversation:")))
      await removeRoomsForCapability(userId, "messaging");
    if (!decision.capabilities.live && [...rooms].some((room) => room.startsWith("stream:")))
      await removeRoomsForCapability(userId, "live");
  };
  const dispatcher: AuthorizedRealtimeDispatcher = async (kind, target, event, payload, excludeSocketId) => {
    const deliveryRule = socketDeliveryPolicy(event);
    if (!deliveryRule) {
      logger.warn({ event, kind, target }, "Blocked unmapped realtime delivery");
      return 0;
    }
    const recipients = await io.in(target).fetchSockets();
    let delivered = 0;
    for (const recipient of recipients) {
      if ((kind === "room" || kind === "user") && recipient.id === excludeSocketId) continue;
      const recipientUserId = recipient.data.userId;
      if (typeof recipientUserId !== "string") {
        recipient.disconnect(true);
        continue;
      }
      try {
        const decision = await authorizeSocketAction(recipientUserId, event, recipient.data, deliveryRule);
        await removeRevokedFeatureRooms(recipientUserId, recipient.rooms, decision);
        recipient.emit(event, payload);
        delivered++;
      } catch (error) {
        if (error instanceof SocketAuthorizationError && error.reason === "capability") {
          if (error.capability) await removeRoomsForCapability(recipientUserId, error.capability);
          continue;
        }
        logger.warn({ error, userId: recipientUserId, event }, "Blocked realtime delivery to an inactive session");
        recipient.disconnect(true);
      }
    }
    return delivered;
  };
  setAuthorizedRealtimeDispatcher(dispatcher);
  httpServer.once("close", () => {
    closing=true;
    clearAuthorizedRealtimeDispatcher(dispatcher);
    void Promise.allSettled([...presenceTasks]).finally(()=>{
      pubClient.disconnect();subClient.disconnect();void redisRepository.disconnect();
    });
  });

  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;
    if (typeof token !== "string" || token.length > 8192) {
      return next(new Error("Authentication error"));
    }
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] }) as { sub?: string; deviceId?: string; exp?: number; authVersion?: number; type?: string };
      if (typeof decoded.sub !== "string" || typeof decoded.deviceId !== "string" || typeof decoded.exp !== "number" || (decoded.type && decoded.type !== 'access')) {
        return next(new Error("Authentication error"));
      }
      if (!(await redisRepository.consumeBudgetStrict(`socket:connect:${decoded.sub}`, 30, 60))) {
        return next(new Error("Too many connection attempts. Please try again shortly."));
      }
      const authorityContext = {
        deviceId: decoded.deviceId,
        expiresAt: decoded.exp * 1000,
        authVersion: decoded.authVersion ?? 0,
      };
      await authorizeSocketAction(decoded.sub, "socket:connect", authorityContext);
      socket.data.userId = decoded.sub;
      Object.assign(socket.data, authorityContext);
      next();
    } catch (error) {
      if (error instanceof SocketAuthorizationError) return next(new Error(error.message));
      next(new Error("Authentication error"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.data.userId as string;
    const joinedStreams = new Set<string>();
    socket.join(userId);
    logger.info({ userId }, "socket connected");

    const sessionIsActive = async (): Promise<boolean> => {
      try {
        const decision = await authorizeSocketAction(userId, "socket:connect", socket.data);
        await removeRevokedFeatureRooms(userId, socket.rooms, decision);
        return true;
      } catch (error) {
        logger.warn({ error, userId }, "Could not validate socket session");
      }
      socket.disconnect(true);
      return false;
    };

    const rejectEvent = (event: string, message: string) => {
      socket.emit(socketErrorEvent(event), { error: message });
    };
    let burstStartedAt = Date.now();
    let burstCount = 0;
    socket.use(async (packet, next) => {
      const event = String(packet[0]);
      // Bound even malformed traffic before parsing, Redis work, or logging.
      if (Date.now() - burstStartedAt >= 10_000) { burstStartedAt = Date.now(); burstCount = 0; }
      if (++burstCount > 60) {
        socket.disconnect(true);
        return next(new Error("Socket burst limit exceeded"));
      }
      const parsed = parseSocketPayload(event, packet[1]);
      if (!parsed.success) {
        rejectEvent(event, "Invalid event payload");
        return next(new Error("Invalid event payload"));
      }
      packet[1] = parsed.data;
      try {
        const allowed = await redisRepository.consumeBudgetStrict(`socket:events:${userId}`, 240, 60);
        const messageAllowed = event !== "message:send"
          || await redisRepository.consumeBudgetStrict(`socket:messages:${userId}`, 30, 60);
        if (!allowed || !messageAllowed) {
          rejectEvent(event, "Too many requests. Please try again shortly.");
          return next(new Error("Socket rate limit exceeded"));
        }
        try {
          const decision = await authorizeSocketAction(userId, event, socket.data);
          await removeRevokedFeatureRooms(userId, socket.rooms, decision);
          return next();
        } catch (error) {
          if (error instanceof SocketAuthorizationError && error.reason === "capability") {
            if (error.capability) await removeRoomsForCapability(userId, error.capability);
            rejectEvent(event, error.message);
            return next(new Error("Realtime capability denied"));
          }
          rejectEvent(event, error instanceof SocketAuthorizationError ? error.message : "Realtime authorization unavailable");
          socket.disconnect(true);
          return next(new Error("Session or eligibility revoked"));
        }
      } catch (error) {
        logger.warn({ error, userId }, "Socket authorization unavailable");
        rejectEvent(event, "Realtime is temporarily unavailable");
        socket.disconnect(true);
        return next(new Error("Socket authorization unavailable"));
      }
    });
    socket.on("error", (error) => logger.warn({ error, userId }, "Socket event rejected"));

    // Socket.IO does not handle rejected async event listeners. Always catch at
    // the boundary, including DB failures in join, live, and call handlers.
    const on = <T>(event: string, handler: (payload: T) => void | Promise<void>) => {
      socket.on(event, (payload: T) => {
        void Promise.resolve().then(() => handler(payload)).catch((error) => {
          logger.warn({ error, event, userId }, "Socket event failed");
          if (error instanceof SocketAuthorizationError && error.reason === "capability") {
            if (error.capability) void removeRoomsForCapability(userId, error.capability);
            rejectEvent(event, error.message);
            return;
          }
          if (error instanceof SocketAuthorizationError) {
            rejectEvent(event, error.message);
            socket.disconnect(true);
            return;
          }
          rejectEvent(event, "This action is temporarily unavailable. Please try again.");
        });
      });
    };
    const expiryTimer = setTimeout(() => socket.disconnect(true), Math.max(1, socket.data.expiresAt - Date.now()));
    const sessionTimer = setInterval(() => void sessionIsActive(), 30_000);
    expiryTimer.unref();
    sessionTimer.unref();

    on("conversation:join", async (payload: { conversationId?: unknown } = {}) => {
      const conversationId = payload.conversationId;
      if (typeof conversationId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(conversationId)) return;
      const members = await conversationRepository.getMembers(conversationId);
      if (!members.includes(userId)) return;
      await authorizeSocketAction(userId, "conversation:join", socket.data);
      const room = `conversation:${conversationId}`;
      await socket.join(room);
      const participants = await io.in(room).fetchSockets();
      const onlineUserIds = new Set(participants.map((participant) => participant.data.userId).filter((id): id is string => typeof id === "string"));
      for (const participantId of onlineUserIds) {
        await emitToSocket(socket.id, "presence:update", { online: true, userId: participantId });
      }
    });

    on("conversation:leave", (payload: { conversationId?: unknown } = {}) => {
      if (typeof payload.conversationId === "string") socket.leave(`conversation:${payload.conversationId}`);
    });

    const relayTyping = async (event: "typing:start" | "typing:end", conversationId: unknown) => {
      if (typeof conversationId !== "string") return;

      try {
        const members = await conversationRepository.getMembers(conversationId);
        if (!members.includes(userId)) return;
        await authorizeSocketAction(userId, event, socket.data);
        await emitToRoom(`conversation:${conversationId}`, event, { userId, conversationId }, socket.id);
      } catch (err) {
        logger.warn({ err, userId, conversationId }, "Failed to relay typing signal");
      }
    };

    on("typing:start", (payload: { conversationId?: unknown } = {}) => {
      void relayTyping("typing:start", payload.conversationId);
    });

    on("typing:end", (payload: { conversationId?: unknown } = {}) => {
      void relayTyping("typing:end", payload.conversationId);
    });

    // Modified to support group chats via conversationId
    on("message:send", async (payload: { recipientId?: unknown; conversationId?: unknown; content?: unknown; mediaId?: unknown; textStyleId?: unknown; idempotencyKey?: unknown } = {}) => {
      const { recipientId, conversationId, content = "", mediaId, textStyleId, idempotencyKey } = payload;
      if (typeof content !== "string" || (!content.trim() && typeof mediaId !== "string")) {
        socket.emit("message:error", { error: "Invalid message payload" });
        return;
      }
      try {
        await authorizeSocketAction(userId, "message:send", socket.data);
        let message;
        let actualConversationId = conversationId;

        if (typeof conversationId === "string" && conversationId) {
          message = await messageService.sendMessageToConversation(userId, conversationId, content, { ...(typeof mediaId === "string" ? { mediaId } : {}), ...(typeof textStyleId === "string" ? { textStyleId } : {}), ...(typeof idempotencyKey === "string" ? { idempotencyKey } : {}) });
        } else if (typeof recipientId === "string" && recipientId) {
          message = await messageService.sendMessage(userId, recipientId, content, { ...(typeof mediaId === "string" ? { mediaId } : {}), ...(typeof textStyleId === "string" ? { textStyleId } : {}), ...(typeof idempotencyKey === "string" ? { idempotencyKey } : {}) });
          actualConversationId = message.conversationId;
        } else {
          socket.emit("message:error", { error: "Missing recipient or conversation" });
          return;
        }

        // Multicast to all conversation members (including the sender's other devices via the room)
        // Personal rooms exist from connection time. Include them for direct
        // messages: a Redis adapter's remote room join may arrive after this emit.
        if(messageService.consumeNewPublication(message)) {
          await authorizeSocketAction(userId, "message:send", socket.data);
          const memberIds=await messageService.getConversationMemberIds(message.conversationId,userId);
          for(const memberId of memberIds){
            const delivered=await hydrateMediaValue(message,undefined,memberId);
            if(delivered)await emitToUser(memberId,"message:receive",delivered);
          }
        }
        const delivered=await hydrateMediaValue(message,undefined,userId);
        if(delivered)await emitToSocket(socket.id,"message:sent", delivered);
        else socket.emit("message:error",{error:"Message is no longer available",code:"message_unavailable"});
      } catch (err) {
        if (err instanceof SocketAuthorizationError) {
          socket.emit("message:error", { error: err.message });
          if (err.reason !== "capability") socket.disconnect(true);
        } else if (err instanceof MediaLifecycleError) {
          socket.emit("message:error", { error: err.message, code: err.code });
        } else if (err instanceof MessageBlockedError) {
          socket.emit("message:error", { error: err.message });
        } else if (err instanceof InvalidMessageContentError || err instanceof InvalidMessageStyleError || err instanceof PremiumFeatureUnavailableError) {
          socket.emit("message:error", { error: err.message });
        } else {
          logger.error({ err, userId, recipientId, conversationId }, "Failed to persist socket message");
          socket.emit("message:error", { error: "Failed to send message" });
        }
      }
    });

    on("message:seen", async (payload: { messageId?: unknown } = {}) => {
      const { messageId } = payload;
      if (typeof messageId !== "string") return;
      try {
        await authorizeSocketAction(userId, "message:seen", socket.data);
        const updated = await messageService.markSeen(messageId, userId);
        if (updated) {
          // Vanish-mode reads remove the message for every connected device;
          // regular reads only update the receipt.
          if (updated.deletedAt) {
            const memberIds=await messageService.getConversationMemberIds(updated.conversationId,userId);
            for(const memberId of memberIds)await emitToUser(memberId,"message:update",updated);
          } else {
            await emitToRoom(`conversation:${updated.conversationId}`,"message:seen:update", { messageId, userId, seenAt: updated.seenAt }, socket.id);
          }
        }
      } catch (err) {
        logger.warn({ err, messageId, userId }, "Failed to mark message seen");
      }
    });

    // WebRTC Live Stream Signaling
    on("stream:join", async (payload: { streamId?: unknown } = {}) => {
      if (!env.LIVE_ROOMS_ENABLED) {
        socket.emit("stream:error", { streamId: payload.streamId, error: "Live rooms are disabled for this deployment" });
        return;
      }
      const { streamId } = payload;
      if (typeof streamId !== "string" || !streamId) return;

      let stream;
      try {
        stream = await liveStreamRepository.findById(streamId);
      } catch (error) {
        logger.warn({ error, userId, streamId }, "Failed to authorize stream room join");
        socket.emit("stream:error", { streamId, error: "Stream is temporarily unavailable" });
        return;
      }
      if (!stream || !(await contentSafetyService.isVisible(stream, userId, stream.hostId)) || (stream.status !== "live" && stream.hostId !== userId)) {
        socket.emit("stream:error", { streamId, error: "Stream is unavailable" });
        return;
      }

      await authorizeSocketAction(userId, "stream:join", socket.data);
      joinedStreams.add(streamId);
      await socket.join(`stream:${streamId}`);
      await emitToRoom(`stream:${streamId}`, "stream:peer-joined", { userId, socketId: socket.id }, socket.id);
    });

    on("stream:leave", async (payload: { streamId?: unknown } = {}) => {
      const { streamId } = payload;
      if (typeof streamId === "string" && joinedStreams.delete(streamId)) {
        await socket.leave(`stream:${streamId}`);
        await emitToRoom(`stream:${streamId}`, "stream:peer-left", { userId, socketId: socket.id }, socket.id);
      }
    });

    on("webrtc:offer", async (payload: { targetSocketId?: unknown; offer?: unknown; streamId?: unknown } = {}) => {
      if (!env.LIVE_ROOMS_ENABLED) return;
      const { targetSocketId, offer, streamId } = payload;
      if (typeof targetSocketId === "string" && targetSocketId !== socket.id && offer && typeof streamId === "string" && joinedStreams.has(streamId)) {
        const [target] = await io.in(targetSocketId).fetchSockets();
        if (target?.rooms.has(`stream:${streamId}`)) {
          await emitToSocket(targetSocketId, "webrtc:offer", { senderSocketId: socket.id, offer, streamId });
        }
      }
    });

    on("webrtc:answer", async (payload: { targetSocketId?: unknown; answer?: unknown; streamId?: unknown } = {}) => {
      if (!env.LIVE_ROOMS_ENABLED) return;
      const { targetSocketId, answer, streamId } = payload;
      if (typeof targetSocketId === "string" && targetSocketId !== socket.id && answer && typeof streamId === "string" && joinedStreams.has(streamId)) {
        const [target] = await io.in(targetSocketId).fetchSockets();
        if (target?.rooms.has(`stream:${streamId}`)) {
          await emitToSocket(targetSocketId, "webrtc:answer", { senderSocketId: socket.id, answer, streamId });
        }
      }
    });

    on("webrtc:ice-candidate", async (payload: { targetSocketId?: unknown; candidate?: unknown; streamId?: unknown } = {}) => {
      if (!env.LIVE_ROOMS_ENABLED) return;
      const { targetSocketId, candidate, streamId } = payload;
      if (typeof targetSocketId === "string" && targetSocketId !== socket.id && candidate && typeof streamId === "string" && joinedStreams.has(streamId)) {
        const [target] = await io.in(targetSocketId).fetchSockets();
        if (target?.rooms.has(`stream:${streamId}`)) {
          await emitToSocket(targetSocketId, "webrtc:ice-candidate", { senderSocketId: socket.id, candidate, streamId });
        }
      }
    });

    const callForParticipant = async (callId: unknown): Promise<ActiveCall | undefined> => {
      if (typeof callId !== "string" || !callId || callId.length > 80) return undefined;
      const raw = await redisRepository.getSocketCallStrict(callId);
      if (!raw) return undefined;
      let call: ActiveCall;
      try {
        call = JSON.parse(raw) as ActiveCall;
      } catch {
        return undefined;
      }
      if (!call || (call.callerId !== userId && call.recipientId !== userId)) return undefined;
      return call;
    };

    const emitCallError = (error: string) => socket.emit("call:error", { error });

    on("call:invite", async (payload: {
      callId?: unknown;
      targetUserId?: unknown;
      callType?: unknown;
      offer?: unknown;
    } = {}) => {
      if (!env.RTC_CALLS_ENABLED) {
        emitCallError("Realtime calling is disabled for this deployment");
        return;
      }
      const { callId, targetUserId, callType, offer } = payload;
      if (
        typeof callId !== "string" || callId.length < 8 || callId.length > 80 ||
        typeof targetUserId !== "string" || targetUserId === userId ||
        (callType !== "audio" && callType !== "video") ||
        !offer || typeof offer !== "object"
      ) {
        emitCallError("Invalid call invitation");
        return;
      }

      const target = await userRepository.findById(targetUserId);
      const caller = await userRepository.findById(userId);
      if (!target || !caller || target.accountStatus === "suspended" || target.accountStatus === "deactivated") {
        emitCallError("That account is unavailable");
        return;
      }
      if (target.blockedUsers?.includes(userId) || caller.blockedUsers?.includes(targetUserId)) {
        emitCallError("You cannot call this account");
        return;
      }
      if (target.privacy?.allowDmFromStrangers === false && !(await userRepository.isFollowing(userId, targetUserId))) {
        emitCallError("This account does not accept calls from strangers");
        return;
      }
      await authorizeSocketAction(userId, "call:invite", socket.data);
      const targetSockets = await io.in(targetUserId).fetchSockets();
      if (targetSockets.length === 0) {
        emitCallError("That account is currently offline");
        return;
      }

      const createdAt = Date.now();
      const call = { id: callId, callerId: userId, recipientId: targetUserId, createdAt, status: "ringing" as const };
      if (!(await redisRepository.reserveSocketCallStrict(call, 90))) {
        emitCallError("That account is already on another call or this call identifier is in use");
        return;
      }
      const invitation = await hydrateMediaValue({
        callId,
        callType,
        offer,
        caller: {
          id: caller.id,
          displayName: caller.fullName,
          username: caller.username,
          avatarUrl: caller.avatarUrl,
        },
      });
      const invitationRecipients = await emitToUser(targetUserId, "call:invite", invitation);
      if (!invitationRecipients) {
        await redisRepository.releaseSocketCallStrict(callId);
        emitCallError("That account is currently unavailable");
        return;
      }
      const timeout = setTimeout(() => {
        callTimeouts.delete(callId);
        void redisRepository.expireRingingSocketCallStrict(callId).then((expired) => {
          if (!expired) return;
          void emitToUser(userId, "call:ended", { callId });
          void emitToUser(targetUserId, "call:ended", { callId });
        }).catch((error) => logger.warn({ error, callId }, "Could not expire ringing call"));
      }, 90_000);
      callTimeouts.set(callId, timeout);
      timeout.unref?.();
    });

    on("call:accept", async (payload: { callId?: unknown } = {}) => {
      if (!env.RTC_CALLS_ENABLED) return;
      const call = await callForParticipant(payload.callId);
      if (!call || call.recipientId !== userId) {
        emitCallError("Call is no longer available");
        return;
      }
      const updated = await redisRepository.acceptSocketCallStrict(call.id, userId, 6 * 60 * 60);
      if (!updated) {
        emitCallError("Call is no longer available");
        return;
      }
      clearCallTimeout(payload.callId as string);
      await emitToUser(call.callerId, "call:accepted", { callId: payload.callId });
    });

    on("call:reject", async (payload: { callId?: unknown } = {}) => {
      if (!env.RTC_CALLS_ENABLED) return;
      const call = await callForParticipant(payload.callId);
      if (!call || call.recipientId !== userId) return;
      clearCallTimeout(payload.callId as string);
      await redisRepository.releaseSocketCallStrict(call.id);
      await emitToUser(call.callerId, "call:rejected", { callId: payload.callId });
    });

    on("call:answer", async (payload: { callId?: unknown; answer?: unknown } = {}) => {
      if (!env.RTC_CALLS_ENABLED) return;
      const call = await callForParticipant(payload.callId);
      if (!call || call.recipientId !== userId || !payload.answer || typeof payload.answer !== "object") return;
      await emitToUser(call.callerId, "call:answer", { callId: payload.callId, answer: payload.answer });
    });

    on("call:ice", async (payload: { callId?: unknown; candidate?: unknown } = {}) => {
      if (!env.RTC_CALLS_ENABLED) return;
      const call = await callForParticipant(payload.callId);
      if (!call || !payload.candidate || typeof payload.candidate !== "object") return;
      const peerId = call.callerId === userId ? call.recipientId : call.callerId;
      await emitToUser(peerId, "call:ice", { callId: payload.callId, candidate: payload.candidate });
    });

    on("call:end", async (payload: { callId?: unknown } = {}) => {
      const call = await callForParticipant(payload.callId);
      if (!call) return;
      clearCallTimeout(payload.callId as string);
      await redisRepository.releaseSocketCallStrict(call.id);
      const peerId = call.callerId === userId ? call.recipientId : call.callerId;
      await emitToUser(peerId, "call:ended", { callId: payload.callId });
    });

    socket.on("disconnect", () => {
      clearTimeout(expiryTimer);
      clearInterval(sessionTimer);
      for (const streamId of joinedStreams) {
        void emitToRoom(`stream:${streamId}`, "stream:peer-left", { userId, socketId: socket.id }, socket.id);
      }
      if(closing)return;
      const task=(async () => {
        const remainingSockets = await io.in(userId).fetchSockets();
        if (remainingSockets.length === 0) {
          const callId = await redisRepository.getSocketCallIdForUserStrict(userId);
          if (callId) {
            const raw = await redisRepository.releaseSocketCallStrict(callId);
            if (raw) {
              clearCallTimeout(callId);
              const call = JSON.parse(raw) as ActiveCall;
              const peerId = call.callerId === userId ? call.recipientId : call.callerId;
              await emitToUser(peerId, "call:ended", { callId });
            }
          }
        }
        if (remainingSockets.length > 0 || closing) return;
        const conversations = await conversationRepository.listForUser(userId);
        if(closing)return;
        for (const conversation of conversations) {
          await emitToRoom(`conversation:${conversation.id}`, "presence:update", { online: false, userId });
        }
      })().catch((error) => logger.warn({ error, userId }, "Could not broadcast offline presence"));
      presenceTasks.add(task);void task.finally(()=>presenceTasks.delete(task));
      logger.info({ userId }, "socket disconnected");
    });

    // Register listeners before awaiting room hydration: clients may send their
    // first event immediately after the connection acknowledgement.
    const hydration=(async () => {
      if (!socket.connected||closing) return;
      try {
        await authorizeSocketAction(userId, "conversation:join", socket.data);
      } catch (error) {
        if (error instanceof SocketAuthorizationError && error.reason === "capability") return;
        throw error;
      }
      const conversations = await conversationRepository.listForUser(userId);
      for (const conv of conversations) {
        if (!socket.connected||closing) return;
        await authorizeSocketAction(userId, "conversation:join", socket.data);
        await socket.join(`conversation:${conv.id}`);
        if(!socket.connected||closing)return;
        await emitToRoom(`conversation:${conv.id}`, "presence:update", { online: true, userId });
      }
    })().catch((err) => logger.error({ err, userId }, "Failed to join conversation rooms"));
    presenceTasks.add(hydration);void hydration.finally(()=>presenceTasks.delete(hydration));
  });

  return io;
};
