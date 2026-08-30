import { Server } from "socket.io";
import type { Server as HttpServer } from "node:http";
import jwt from "jsonwebtoken";
import { env, corsOrigins } from "../config/env.js";
import { logger } from "../lib/logger.js";
import { setIo } from "../lib/realtime.js";
import { ConversationRepository, MessageRepository } from "../repositories/message-repository.js";
import { UserRepository } from "../repositories/user-repository.js";
import { InvalidMessageContentError, MessageBlockedError, MessageService } from "../services/message-service.js";
import { RedisRepository } from "../repositories/redis-repository.js";
import { LiveStreamRepository } from "../repositories/live-stream-repository.js";
import { ContentSafetyService } from "../services/content-safety-service.js";
import { hasCurrentConsent } from "../utils/consent.js";
import { isTrustedOrigin } from "../middlewares/trusted-origin.js";
import { parseSocketPayload, socketErrorEvent } from "./policy.js";

export const attachSocketServer = (httpServer: HttpServer) => {
  const io = new Server(httpServer, {
    maxHttpBufferSize: 64 * 1024,
    // CORS alone does not protect the WebSocket transport.
    allowRequest: (request, callback) => callback(null, isTrustedOrigin(request.headers.origin)),
    cors: {
      origin: corsOrigins,
      methods: ["GET", "POST"],
    },
  });
  setIo(io);

  const conversationRepository = new ConversationRepository();
  const userRepository = new UserRepository();
  const redisRepository = new RedisRepository();
  const messageService = new MessageService(conversationRepository, new MessageRepository(), userRepository);
  const liveStreamRepository = new LiveStreamRepository();
  const contentSafetyService = new ContentSafetyService(userRepository);
  const activeCalls = new Map<string, { callerId: string; recipientId: string; createdAt: number }>();
  httpServer.once("close", () => void redisRepository.disconnect());

  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;
    if (typeof token !== "string" || token.length > 8192) {
      return next(new Error("Authentication error"));
    }
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as { sub?: string; deviceId?: string; exp?: number };
      if (typeof decoded.sub !== "string" || typeof decoded.deviceId !== "string" || typeof decoded.exp !== "number") {
        return next(new Error("Authentication error"));
      }
      if (!(await redisRepository.consumeBudgetStrict(`socket:connect:${decoded.sub}`, 30, 60))) {
        return next(new Error("Too many connection attempts. Please try again shortly."));
      }
      const [session, user] = await Promise.all([
        redisRepository.getStrict(`session:${decoded.sub}:${decoded.deviceId}`),
        userRepository.findById(decoded.sub),
      ]);
      if (!session || !user || user.accountStatus === "suspended" || user.accountStatus === "deactivated") {
        return next(new Error("Session revoked"));
      }
      if (!hasCurrentConsent(user)) return next(new Error("Current terms acceptance required"));
      socket.data.userId = decoded.sub;
      socket.data.deviceId = decoded.deviceId;
      socket.data.expiresAt = decoded.exp * 1000;
      next();
    } catch {
      next(new Error("Authentication error"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.data.userId as string;
    const deviceId = socket.data.deviceId as string;
    const joinedStreams = new Set<string>();
    socket.join(userId);
    logger.info({ userId }, "socket connected");
    socket.emit("presence:update", { online: true, userId });

    const sessionIsActive = async (): Promise<boolean> => {
      try {
        const [session, user] = await Promise.all([
          redisRepository.getStrict(`session:${userId}:${deviceId}`),
          userRepository.findById(userId),
        ]);
        if (Date.now() < socket.data.expiresAt && session && user && hasCurrentConsent(user)
          && user.accountStatus !== "suspended" && user.accountStatus !== "deactivated") return true;
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
        if (await sessionIsActive()) return next();
        return next(new Error("Session revoked"));
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
      if (members.includes(userId)) socket.join(`conversation:${conversationId}`);
    });

    on("conversation:leave", (payload: { conversationId?: unknown } = {}) => {
      if (typeof payload.conversationId === "string") socket.leave(`conversation:${payload.conversationId}`);
    });

    const relayTyping = async (event: "typing:start" | "typing:end", conversationId: unknown) => {
      if (typeof conversationId !== "string") return;

      try {
        const members = await conversationRepository.getMembers(conversationId);
        if (!members.includes(userId)) return;

        // Broadcast to everyone else in the conversation room
        socket.to(`conversation:${conversationId}`).emit(event, { userId, conversationId });
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
    on("message:send", async (payload: { recipientId?: unknown; conversationId?: unknown; content?: unknown } = {}) => {
      const { recipientId, conversationId, content } = payload;
      if (typeof content !== "string" || !content.trim()) {
        socket.emit("message:error", { error: "Invalid message payload" });
        return;
      }
      try {
        let message;
        let actualConversationId = conversationId;

        if (typeof conversationId === "string" && conversationId) {
          message = await messageService.sendMessageToConversation(userId, conversationId, content);
        } else if (typeof recipientId === "string" && recipientId) {
          message = await messageService.sendMessage(userId, recipientId, content);
          actualConversationId = message.conversationId;
          
          // Join every connected device of both members before the first emit.
          io.in([userId, recipientId]).socketsJoin(`conversation:${actualConversationId}`);
        } else {
          socket.emit("message:error", { error: "Missing recipient or conversation" });
          return;
        }

        // Multicast to all conversation members (including the sender's other devices via the room)
        io.to(`conversation:${actualConversationId}`).emit("message:receive", message);
        socket.emit("message:sent", message); // Confirm to sender's current device
      } catch (err) {
        if (err instanceof MessageBlockedError) {
          socket.emit("message:error", { error: err.message });
        } else if (err instanceof InvalidMessageContentError) {
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
        const updated = await messageService.markSeen(messageId, userId);
        if (updated) {
          // Vanish-mode reads remove the message for every connected device;
          // regular reads only update the receipt.
          if (updated.deletedAt) {
            socket.to(`conversation:${updated.conversationId}`).emit("message:update", updated);
          } else {
            socket.to(`conversation:${updated.conversationId}`).emit("message:seen:update", { messageId, userId, seenAt: updated.seenAt });
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

      joinedStreams.add(streamId);
      socket.join(`stream:${streamId}`);
      socket.to(`stream:${streamId}`).emit("stream:peer-joined", { userId, socketId: socket.id });
    });

    on("stream:leave", (payload: { streamId?: unknown } = {}) => {
      if (!env.LIVE_ROOMS_ENABLED) return;
      const { streamId } = payload;
      if (typeof streamId === "string" && joinedStreams.delete(streamId)) {
        socket.leave(`stream:${streamId}`);
        socket.to(`stream:${streamId}`).emit("stream:peer-left", { userId, socketId: socket.id });
      }
    });

    on("webrtc:offer", (payload: { targetSocketId?: unknown; offer?: unknown; streamId?: unknown } = {}) => {
      if (!env.LIVE_ROOMS_ENABLED) return;
      const { targetSocketId, offer, streamId } = payload;
      if (typeof targetSocketId === "string" && offer && typeof streamId === "string" && joinedStreams.has(streamId)) {
        const target = io.sockets.sockets.get(targetSocketId);
        if (target?.rooms.has(`stream:${streamId}`)) {
          target.emit("webrtc:offer", { senderSocketId: socket.id, offer, streamId });
        }
      }
    });

    on("webrtc:answer", (payload: { targetSocketId?: unknown; answer?: unknown; streamId?: unknown } = {}) => {
      if (!env.LIVE_ROOMS_ENABLED) return;
      const { targetSocketId, answer, streamId } = payload;
      if (typeof targetSocketId === "string" && answer && typeof streamId === "string" && joinedStreams.has(streamId)) {
        const target = io.sockets.sockets.get(targetSocketId);
        if (target?.rooms.has(`stream:${streamId}`)) {
          target.emit("webrtc:answer", { senderSocketId: socket.id, answer, streamId });
        }
      }
    });

    on("webrtc:ice-candidate", (payload: { targetSocketId?: unknown; candidate?: unknown; streamId?: unknown } = {}) => {
      if (!env.LIVE_ROOMS_ENABLED) return;
      const { targetSocketId, candidate, streamId } = payload;
      if (typeof targetSocketId === "string" && candidate && typeof streamId === "string" && joinedStreams.has(streamId)) {
        const target = io.sockets.sockets.get(targetSocketId);
        if (target?.rooms.has(`stream:${streamId}`)) {
          target.emit("webrtc:ice-candidate", { senderSocketId: socket.id, candidate, streamId });
        }
      }
    });

    const callForParticipant = (callId: unknown) => {
      if (typeof callId !== "string" || !callId || callId.length > 80) return undefined;
      const call = activeCalls.get(callId);
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
      if ([...activeCalls.values()].some((call) => call.callerId === targetUserId || call.recipientId === targetUserId || call.callerId === userId || call.recipientId === userId)) {
        emitCallError("That account is already on another call");
        return;
      }
      if (activeCalls.has(callId)) {
        emitCallError("That call identifier is already in use");
        return;
      }
      if (!io.sockets.adapter.rooms.get(targetUserId)?.size) {
        emitCallError("That account is currently offline");
        return;
      }

      const createdAt = Date.now();
      activeCalls.set(callId, { callerId: userId, recipientId: targetUserId, createdAt });
      io.to(targetUserId).emit("call:invite", {
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
      const timeout = setTimeout(() => {
        const current = activeCalls.get(callId);
        if (!current || current.createdAt !== createdAt) return;
        activeCalls.delete(callId);
        io.to(userId).emit("call:ended", { callId });
        io.to(targetUserId).emit("call:ended", { callId });
      }, 90_000);
      timeout.unref?.();
    });

    on("call:accept", (payload: { callId?: unknown } = {}) => {
      if (!env.RTC_CALLS_ENABLED) return;
      const call = callForParticipant(payload.callId);
      if (!call || call.recipientId !== userId) {
        emitCallError("Call is no longer available");
        return;
      }
      io.to(call.callerId).emit("call:accepted", { callId: payload.callId });
    });

    on("call:reject", (payload: { callId?: unknown } = {}) => {
      if (!env.RTC_CALLS_ENABLED) return;
      const call = callForParticipant(payload.callId);
      if (!call || call.recipientId !== userId) return;
      activeCalls.delete(payload.callId as string);
      io.to(call.callerId).emit("call:rejected", { callId: payload.callId });
    });

    on("call:answer", (payload: { callId?: unknown; answer?: unknown } = {}) => {
      if (!env.RTC_CALLS_ENABLED) return;
      const call = callForParticipant(payload.callId);
      if (!call || call.recipientId !== userId || !payload.answer || typeof payload.answer !== "object") return;
      io.to(call.callerId).emit("call:answer", { callId: payload.callId, answer: payload.answer });
    });

    on("call:ice", (payload: { callId?: unknown; candidate?: unknown } = {}) => {
      if (!env.RTC_CALLS_ENABLED) return;
      const call = callForParticipant(payload.callId);
      if (!call || !payload.candidate || typeof payload.candidate !== "object") return;
      const peerId = call.callerId === userId ? call.recipientId : call.callerId;
      io.to(peerId).emit("call:ice", { callId: payload.callId, candidate: payload.candidate });
    });

    on("call:end", (payload: { callId?: unknown } = {}) => {
      if (!env.RTC_CALLS_ENABLED) return;
      const call = callForParticipant(payload.callId);
      if (!call) return;
      activeCalls.delete(payload.callId as string);
      const peerId = call.callerId === userId ? call.recipientId : call.callerId;
      io.to(peerId).emit("call:ended", { callId: payload.callId });
    });

    socket.on("disconnect", () => {
      clearTimeout(expiryTimer);
      clearInterval(sessionTimer);
      for (const streamId of joinedStreams) {
        socket.to(`stream:${streamId}`).emit("stream:peer-left", { userId, socketId: socket.id });
      }
      for (const [callId, call] of activeCalls) {
        if (call.callerId === userId || call.recipientId === userId) {
          activeCalls.delete(callId);
          const peerId = call.callerId === userId ? call.recipientId : call.callerId;
          io.to(peerId).emit("call:ended", { callId });
        }
      }
      logger.info({ userId }, "socket disconnected");
    });

    // Register listeners before awaiting room hydration: clients may send their
    // first event immediately after the connection acknowledgement.
    void conversationRepository.listForUser(userId).then((conversations) => {
      if (!socket.connected) return;
      for (const conv of conversations) void socket.join(`conversation:${conv.id}`);
    }).catch((err) => logger.error({ err, userId }, "Failed to join conversation rooms"));
  });

  return io;
};
