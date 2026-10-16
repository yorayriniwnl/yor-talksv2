import { hydrateMediaValue } from "../services/media-response.js";
import { MediaLifecycleError } from "../services/media-service.js";
import { Server } from "socket.io";
import type { Server as HttpServer } from "node:http";
import { createAdapter } from "@socket.io/redis-adapter";
import { Redis } from "ioredis";
import jwt from "jsonwebtoken";
import { env, corsOrigins } from "../config/env.js";
import { logger } from "../lib/logger.js";
import { setIo } from "../lib/realtime.js";
import { ConversationRepository, MessageRepository } from "../repositories/message-repository.js";
import { UserRepository } from "../repositories/user-repository.js";
import { InvalidMessageContentError, InvalidMessageStyleError, MessageBlockedError, MessageService, PremiumFeatureUnavailableError, UnauthorizedError } from "../services/message-service.js";
import { ContactAuthorizationDeniedError, ContactAuthorizationService } from "../services/contact-authorization-service.js";
import { RedisRepository } from "../repositories/redis-repository.js";
import { LiveStreamRepository } from "../repositories/live-stream-repository.js";
import { ContentSafetyService } from "../services/content-safety-service.js";
import { isTrustedOrigin } from "../middlewares/trusted-origin.js";
import { authorizeSocketAction, dispatchSocketToUsers, parseSocketPayload, socketErrorEvent, type SocketRequester } from "./policy.js";

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
    if (env.NODE_ENV === "production") {
      throw new Error("Socket.IO Redis adapter could not be initialized", { cause: error });
    }
    logger.warn("Socket.IO Redis adapter unavailable; falling back to in-memory adapter for local dev");
  }
  setIo(io);

  const conversationRepository = new ConversationRepository();
  const userRepository = new UserRepository();
  const redisRepository = new RedisRepository();
  const messageService = new MessageService(conversationRepository, new MessageRepository(), userRepository);
  const contactAuthorization = new ContactAuthorizationService();
  const liveStreamRepository = new LiveStreamRepository();
  const contentSafetyService = new ContentSafetyService(userRepository);
  type ActiveCall = { id: string; callerId: string; recipientId: string; createdAt: number; status: "ringing" | "active" };
  const callTimeouts = new Map<string, ReturnType<typeof setTimeout>>();
  const clearCallTimeout = (callId: string) => {
    const timeout = callTimeouts.get(callId);
    if (timeout) clearTimeout(timeout);
    callTimeouts.delete(callId);
  };
  httpServer.once("close", () => {
    pubClient.disconnect();
    subClient.disconnect();
    void redisRepository.disconnect();
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
      const [session, user] = await Promise.all([
        redisRepository.getStrict(`session:${decoded.sub}:${decoded.deviceId}`),
        userRepository.findById(decoded.sub),
      ]);
      if (!session || !user || (decoded.authVersion ?? 0) !== (user.authVersion ?? 0) || ['suspended', 'deactivated', 'deleted'].includes(user.accountStatus ?? 'active')) {
        return next(new Error("Session revoked"));
      }
      await authorizeSocketAction(decoded.sub, "session:connect");
      socket.data.userId = decoded.sub;
      socket.data.deviceId = decoded.deviceId;
      socket.data.expiresAt = decoded.exp * 1000;
      socket.data.authVersion = decoded.authVersion ?? 0;
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

    const sessionIsActive = async (): Promise<boolean> => {
      try {
        const [session, user] = await Promise.all([
          redisRepository.getStrict(`session:${userId}:${deviceId}`),
          userRepository.findById(userId),
        ]);
        if (Date.now() < socket.data.expiresAt && session && user
          && (user.authVersion ?? 0) === socket.data.authVersion && !['suspended', 'deactivated', 'deleted'].includes(user.accountStatus ?? 'active')) {
          await authorizeSocketAction(userId, "session:connect");
          return true;
        }
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
        if (await sessionIsActive()) {
          await authorizeSocketAction(userId, event);
          return next();
        }
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
      if (!members.includes(userId)) return;
      try { await messageService.authorizeConversationDelivery(conversationId,userId); }
      catch(error) { if(error instanceof ContactAuthorizationDeniedError||error instanceof UnauthorizedError)return; throw error; }
      await authorizeSocketAction(userId, "conversation:join");
      const room = `conversation:${conversationId}`;
      await socket.join(room);
      const participants = await io.in(room).fetchSockets();
      const onlineParticipants = new Map<string, typeof participants>();
      for (const participant of participants) {
        const participantId = participant.data.userId;
        if (typeof participantId !== "string" || participantId === userId) continue;
        const devices = onlineParticipants.get(participantId) ?? [];
        devices.push(participant);
        onlineParticipants.set(participantId, devices);
      }
      for (const [participantId, devices] of onlineParticipants) {
        await dispatchSocketToUsers(io, [userId], "presence:update", { online: true, userId: participantId }, "presence:deliver", socket.id,
          async requester => {
            await messageService.authorizeConversationDelivery(conversationId, requester.userId);
            const currentMembers = await conversationRepository.getMembers(conversationId);
            if (!currentMembers.includes(participantId)) return false;
            for (const participant of devices) {
              if (Date.now() >= Number(participant.data.expiresAt ?? 0)) continue;
              try {
                await authorizeSocketAction(participantId, "presence:deliver", {}, {
                  userId: participantId, deviceId: String(participant.data.deviceId ?? ""),
                  authVersion: Number(participant.data.authVersion ?? -1),
                });
                return true;
              } catch { /* A stale room or device cannot establish current presence. */ }
            }
            return false;
          });
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
        await messageService.authorizeConversationDelivery(conversationId,userId);
        await authorizeSocketAction(userId, event);
        await dispatchSocketToUsers(io, members.filter(memberId => memberId !== userId), event,
          async (requester:SocketRequester) => {
            await messageService.authorizeConversationDelivery(conversationId,requester.userId);
            return { userId, conversationId };
          }, "typing:deliver", socket.id,
          requester=>messageService.authorizeConversationDelivery(conversationId,requester.userId));
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
        let message;
        let actualConversationId = conversationId;

        if (typeof conversationId === "string" && conversationId) {
          await authorizeSocketAction(userId, "message:send");
          message = await messageService.sendMessageToConversation(userId, conversationId, content, { ...(typeof mediaId === "string" ? { mediaId } : {}), ...(typeof textStyleId === "string" ? { textStyleId } : {}), ...(typeof idempotencyKey === "string" ? { idempotencyKey } : {}) });
        } else if (typeof recipientId === "string" && recipientId) {
          await authorizeSocketAction(userId, "message:send");
          message = await messageService.sendMessage(userId, recipientId, content, { ...(typeof mediaId === "string" ? { mediaId } : {}), ...(typeof textStyleId === "string" ? { textStyleId } : {}), ...(typeof idempotencyKey === "string" ? { idempotencyKey } : {}) });
          actualConversationId = message.conversationId;
        } else {
          socket.emit("message:error", { error: "Missing recipient or conversation" });
          return;
        }

        if (typeof actualConversationId !== "string") throw new Error("Conversation is unavailable");
        // Multicast to all conversation members (including the sender's other devices via the room)
        // Personal rooms exist from connection time. Include them for direct
        // messages: a Redis adapter's remote room join may arrive after this emit.
        const members = await conversationRepository.getMembers(actualConversationId);
        await dispatchSocketToUsers(io, members, "message:receive",
          async (requester:SocketRequester) => {
            await messageService.authorizeConversationDelivery(actualConversationId,requester.userId);
            return hydrateMediaValue(message, undefined, requester);
          }, "message:deliver", undefined,
          requester=>messageService.authorizeConversationDelivery(actualConversationId,requester.userId));
        await authorizeSocketAction(userId, "message:send");
        const senderDelivery = await hydrateMediaValue(message, undefined, { userId, deviceId, authVersion: socket.data.authVersion as number });
        await authorizeSocketAction(userId, "message:send");
        socket.emit("message:sent", senderDelivery); // Confirm to sender's current device
      } catch (err) {
        if (err instanceof MediaLifecycleError) {
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
        const updated = await messageService.markSeen(messageId, userId);
        if (updated) {
          const members = await conversationRepository.getMembers(updated.conversationId);
          // Vanish-mode reads remove the message for every connected device;
          // regular reads only update the receipt.
          if (updated.deletedAt) {
            await dispatchSocketToUsers(io, members, "message:update",
              async (requester:SocketRequester) => {
                await messageService.authorizeConversationDelivery(updated.conversationId,requester.userId);
                return hydrateMediaValue(updated, undefined, requester);
              }, "message:deliver", socket.id,
              requester=>messageService.authorizeConversationDelivery(updated.conversationId,requester.userId));
          } else if (await messageService.canPublishReadReceipt(updated, userId)) {
            await dispatchSocketToUsers(io, members, "message:seen:update", async (requester:SocketRequester) => {
              await messageService.authorizeConversationDelivery(updated.conversationId,requester.userId);
              return { messageId, userId, seenAt: updated.seenAt };
            }, "message:deliver", socket.id, async requester => {
              await messageService.authorizeConversationDelivery(updated.conversationId,requester.userId);
              return messageService.canPublishReadReceipt(updated,userId);
            });
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

      await authorizeSocketAction(userId, "stream:join");
      joinedStreams.add(streamId);
      await socket.join(`stream:${streamId}`);
      const peers = await io.in(`stream:${streamId}`).fetchSockets();
      const peerIds = [...new Set(peers.map(peer => peer.data.userId).filter((id): id is string => typeof id === "string" && id !== userId))];
      await dispatchSocketToUsers(io, peerIds, "stream:peer-joined", { userId, socketId: socket.id }, "stream:deliver", socket.id);
    });

    on("stream:leave", async (payload: { streamId?: unknown } = {}) => {
      if (!env.LIVE_ROOMS_ENABLED) return;
      const { streamId } = payload;
      if (typeof streamId === "string" && joinedStreams.delete(streamId)) {
        await socket.leave(`stream:${streamId}`);
        const peers = await io.in(`stream:${streamId}`).fetchSockets();
        const peerIds = [...new Set(peers.map(peer => peer.data.userId).filter((id): id is string => typeof id === "string"))];
        await dispatchSocketToUsers(io, peerIds, "stream:peer-left", { userId, socketId: socket.id }, "stream:deliver", socket.id);
      }
    });

    const relayStreamSignal = async (event: string, payload: { targetSocketId?: unknown; streamId?: unknown }, signal: Record<string, unknown>) => {
      if (!env.LIVE_ROOMS_ENABLED) return;
      const { targetSocketId, streamId } = payload;
      if (typeof targetSocketId !== "string" || targetSocketId === socket.id || typeof streamId !== "string" || !joinedStreams.has(streamId)) return;
      const [target] = await io.in(targetSocketId).fetchSockets();
      if (!target?.rooms.has(`stream:${streamId}`) || typeof target.data.userId !== "string") return;
      const stream = await liveStreamRepository.findById(streamId);
      if (!stream || (stream.status !== "live" && stream.hostId !== userId)
        || !await contentSafetyService.isVisible(stream, userId, stream.hostId)
        || !await contentSafetyService.isVisible(stream, target.data.userId, stream.hostId)) return;
      if (Date.now() >= socket.data.expiresAt || Date.now() >= Number(target.data.expiresAt ?? 0)) throw new Error("Session revoked");
      await authorizeSocketAction(userId, event, {}, { userId, deviceId, authVersion: socket.data.authVersion as number });
      await authorizeSocketAction(target.data.userId, "rtc:deliver", {}, {
        userId: target.data.userId, deviceId: String(target.data.deviceId ?? ""), authVersion: Number(target.data.authVersion ?? -1),
      });
      io.to(targetSocketId).emit(event, { senderSocketId: socket.id, ...signal, streamId });
    };
    on("webrtc:offer", (payload: { targetSocketId?: unknown; offer?: unknown; streamId?: unknown } = {}) =>
      relayStreamSignal("webrtc:offer", payload, { offer: payload.offer }));
    on("webrtc:answer", (payload: { targetSocketId?: unknown; answer?: unknown; streamId?: unknown } = {}) =>
      relayStreamSignal("webrtc:answer", payload, { answer: payload.answer }));
    on("webrtc:ice-candidate", (payload: { targetSocketId?: unknown; candidate?: unknown; streamId?: unknown } = {}) =>
      relayStreamSignal("webrtc:ice-candidate", payload, { candidate: payload.candidate }));

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

    const requireCurrentCallContact = async (call: ActiveCall): Promise<void> => {
      try {
        if (Date.now() >= socket.data.expiresAt) throw new Error("Session revoked");
        await authorizeSocketAction(userId, "rtc:deliver", {}, { userId, deviceId, authVersion: socket.data.authVersion as number });
        await authorizeSocketAction(call.callerId === userId ? call.recipientId : call.callerId, "rtc:deliver");
        await contactAuthorization.requireContact(call.callerId, call.recipientId, "deliver");
      } catch (error) {
        clearCallTimeout(call.id);
        await redisRepository.releaseSocketCallStrict(call.id);
        throw error;
      }
    };

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
      await contactAuthorization.requireContact(userId, targetUserId, "send");
      const targetSockets = await io.in(targetUserId).fetchSockets();
      if (targetSockets.length === 0) {
        emitCallError("That account is currently offline");
        return;
      }
      await authorizeSocketAction(targetUserId, "rtc:deliver");

      const createdAt = Date.now();
      const call = { id: callId, callerId: userId, recipientId: targetUserId, createdAt, status: "ringing" as const };
      if (!(await redisRepository.reserveSocketCallStrict(call, 90))) {
        emitCallError("That account is already on another call or this call identifier is in use");
        return;
      }
      const invitation = {
        callId,
        callType,
        offer,
        caller: {
          id: caller.id,
          displayName: caller.fullName,
          username: caller.username,
          avatarUrl: caller.avatarUrl,
        },
      };
      await dispatchSocketToUsers(io, [targetUserId], "call:invite",
        (requester:SocketRequester) => hydrateMediaValue(invitation, undefined, requester), "rtc:deliver", undefined,
        () => requireCurrentCallContact(call));
      const timeout = setTimeout(() => {
        callTimeouts.delete(callId);
        void redisRepository.expireRingingSocketCallStrict(callId).then(async (expired) => {
          if (!expired) return;
          await dispatchSocketToUsers(io, [userId, targetUserId], "call:ended", { callId }, "rtc:deliver");
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
      await requireCurrentCallContact(call);
      const updated = await redisRepository.acceptSocketCallStrict(call.id, userId, 6 * 60 * 60);
      if (!updated) {
        emitCallError("Call is no longer available");
        return;
      }
      clearCallTimeout(payload.callId as string);
      await dispatchSocketToUsers(io, [call.callerId], "call:accepted", { callId: payload.callId }, "rtc:deliver", undefined,
        () => requireCurrentCallContact(call));
    });

    on("call:reject", async (payload: { callId?: unknown } = {}) => {
      if (!env.RTC_CALLS_ENABLED) return;
      const call = await callForParticipant(payload.callId);
      if (!call || call.recipientId !== userId) return;
      clearCallTimeout(payload.callId as string);
      await redisRepository.releaseSocketCallStrict(call.id);
      await dispatchSocketToUsers(io, [call.callerId], "call:rejected", { callId: payload.callId }, "rtc:deliver");
    });

    on("call:answer", async (payload: { callId?: unknown; answer?: unknown } = {}) => {
      if (!env.RTC_CALLS_ENABLED) return;
      const call = await callForParticipant(payload.callId);
      if (!call || call.recipientId !== userId || !payload.answer || typeof payload.answer !== "object") return;
      await requireCurrentCallContact(call);
      await dispatchSocketToUsers(io, [call.callerId], "call:answer", { callId: payload.callId, answer: payload.answer }, "rtc:deliver", undefined,
        () => requireCurrentCallContact(call));
    });

    on("call:ice", async (payload: { callId?: unknown; candidate?: unknown } = {}) => {
      if (!env.RTC_CALLS_ENABLED) return;
      const call = await callForParticipant(payload.callId);
      if (!call || !payload.candidate || typeof payload.candidate !== "object") return;
      await requireCurrentCallContact(call);
      const peerId = call.callerId === userId ? call.recipientId : call.callerId;
      await dispatchSocketToUsers(io, [peerId], "call:ice", { callId: payload.callId, candidate: payload.candidate }, "rtc:deliver", undefined,
        () => requireCurrentCallContact(call));
    });

    on("call:end", async (payload: { callId?: unknown } = {}) => {
      if (!env.RTC_CALLS_ENABLED) return;
      const call = await callForParticipant(payload.callId);
      if (!call) return;
      clearCallTimeout(payload.callId as string);
      await redisRepository.releaseSocketCallStrict(call.id);
      const peerId = call.callerId === userId ? call.recipientId : call.callerId;
      await dispatchSocketToUsers(io, [peerId], "call:ended", { callId: payload.callId }, "rtc:deliver");
    });

    socket.on("disconnect", () => {
      clearTimeout(expiryTimer);
      clearInterval(sessionTimer);
      void (async () => {
        for (const streamId of joinedStreams) {
          const peers = await io.in(`stream:${streamId}`).fetchSockets();
          const peerIds = [...new Set(peers.map(peer => peer.data.userId).filter((id): id is string => typeof id === "string"))];
          await dispatchSocketToUsers(io, peerIds, "stream:peer-left", { userId, socketId: socket.id }, "stream:deliver", socket.id);
        }
        const remainingSockets = await io.in(userId).fetchSockets();
        if (remainingSockets.length === 0) {
          const callId = await redisRepository.getSocketCallIdForUserStrict(userId);
          if (callId) {
            const raw = await redisRepository.releaseSocketCallStrict(callId);
            if (raw) {
              clearCallTimeout(callId);
              const call = JSON.parse(raw) as ActiveCall;
              const peerId = call.callerId === userId ? call.recipientId : call.callerId;
              await dispatchSocketToUsers(io, [peerId], "call:ended", { callId }, "rtc:deliver");
            }
          }
        }
        if (remainingSockets.length > 0) return;
        const conversations = await conversationRepository.listForUser(userId);
        for (const conversation of conversations) {
          const members = await conversationRepository.getMembers(conversation.id);
          await dispatchSocketToUsers(io, members.filter(memberId => memberId !== userId), "presence:update",
            async(requester:SocketRequester)=>{
              await messageService.authorizeConversationDelivery(conversation.id,requester.userId);
              return {online:false,userId};
            },"presence:deliver",socket.id,
            requester=>messageService.authorizeConversationDelivery(conversation.id,requester.userId));
        }
      })().catch((error) => logger.warn({ error, userId }, "Could not broadcast offline presence"));
      logger.info({ userId }, "socket disconnected");
    });

    // Register listeners before awaiting room hydration: clients may send their
    // first event immediately after the connection acknowledgement.
      void conversationRepository.listForUser(userId).then((conversations) => {
      if (!socket.connected) return;
      for (const conv of conversations) {
        void (async () => {
          await authorizeSocketAction(userId, "conversation:join");
          const members = await conversationRepository.getMembers(conv.id);
          if (!members.includes(userId)) return;
          await messageService.authorizeConversationDelivery(conv.id,userId);
          await socket.join(`conversation:${conv.id}`);
          await dispatchSocketToUsers(io, members.filter(memberId => memberId !== userId), "presence:update",
            async(requester:SocketRequester)=>{
              await messageService.authorizeConversationDelivery(conv.id,requester.userId);
              return {online:true,userId};
            },"presence:deliver",socket.id,
            requester=>messageService.authorizeConversationDelivery(conv.id,requester.userId));
        })().catch((error) => logger.warn({ error, userId, conversationId: conv.id }, "Could not broadcast online presence"));
      }
    }).catch((err) => logger.error({ err, userId }, "Failed to join conversation rooms"));
  });

  return io;
};
