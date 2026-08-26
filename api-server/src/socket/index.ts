import { Server } from "socket.io";
import type { Server as HttpServer } from "node:http";
import jwt from "jsonwebtoken";
import { env, corsOrigins } from "../config/env.js";
import { logger } from "../lib/logger.js";
import { setIo } from "../lib/realtime.js";
import { ConversationRepository, MessageRepository } from "../repositories/message-repository.js";
import { UserRepository } from "../repositories/user-repository.js";
import { MessageBlockedError, MessageService } from "../services/message-service.js";
import { RedisRepository } from "../repositories/redis-repository.js";
import { LiveStreamRepository } from "../repositories/live-stream-repository.js";

export const attachSocketServer = (httpServer: HttpServer) => {
  const io = new Server(httpServer, {
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
  const onlineUsers = new Map<string, string>();
  const activeCalls = new Map<string, { callerId: string; recipientId: string; createdAt: number }>();

  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error("Authentication error"));
    }
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as { sub?: string; deviceId?: string };
      if (!decoded.sub || !decoded.deviceId) return next(new Error("Authentication error"));
      const [session, user] = await Promise.all([
        redisRepository.getStrict(`session:${decoded.sub}:${decoded.deviceId}`),
        userRepository.findById(decoded.sub),
      ]);
      if (!session || !user || user.accountStatus === "suspended" || user.accountStatus === "deactivated") {
        return next(new Error("Session revoked"));
      }
      socket.data.userId = decoded.sub;
      socket.data.deviceId = decoded.deviceId;
      next();
    } catch {
      next(new Error("Authentication error"));
    }
  });

  io.on("connection", async (socket) => {
    const userId = socket.data.userId as string;
    const deviceId = socket.data.deviceId as string;
    const joinedStreams = new Set<string>();
    onlineUsers.set(userId, socket.id);
    socket.join(userId);
    logger.info({ userId }, "socket connected");
    socket.emit("presence:update", { online: true, userId });

    const sessionIsActive = async (): Promise<boolean> => {
      try {
        const [session, user] = await Promise.all([
          redisRepository.getStrict(`session:${userId}:${deviceId}`),
          userRepository.findById(userId),
        ]);
        if (session && user && user.accountStatus !== "suspended" && user.accountStatus !== "deactivated") return true;
      } catch (error) {
        logger.warn({ error, userId }, "Could not validate socket session");
      }
      socket.disconnect(true);
      return false;
    };

    socket.use(async (_packet, next) => {
      if (await sessionIsActive()) return next();
      return next(new Error("Session revoked"));
    });
    socket.on("error", (error) => logger.warn({ error, userId }, "Socket event rejected"));

    socket.on("conversation:join", async (payload: { conversationId?: unknown } = {}) => {
      const conversationId = payload.conversationId;
      if (typeof conversationId !== "string" || !/^[0-9a-f-]{36}$/i.test(conversationId)) return;
      const members = await conversationRepository.getMembers(conversationId);
      if (members.includes(userId)) socket.join(`conversation:${conversationId}`);
    });

    socket.on("conversation:leave", (payload: { conversationId?: unknown } = {}) => {
      if (typeof payload.conversationId === "string") socket.leave(`conversation:${payload.conversationId}`);
    });

    // Join all conversations the user is part of for group multicasting
    try {
      const conversations = await conversationRepository.listForUser(userId);
      for (const conv of conversations) {
        socket.join(`conversation:${conv.id}`);
      }
    } catch (err) {
      logger.error({ err, userId }, "Failed to join conversation rooms");
    }

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

    socket.on("typing:start", (payload: { conversationId?: unknown } = {}) => {
      void relayTyping("typing:start", payload.conversationId);
    });

    socket.on("typing:end", (payload: { conversationId?: unknown } = {}) => {
      void relayTyping("typing:end", payload.conversationId);
    });

    // Modified to support group chats via conversationId
    socket.on("message:send", async (payload: { recipientId?: unknown; conversationId?: unknown; content?: unknown } = {}) => {
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
          
          // Ensure sender is in the room if it's a new conversation
          socket.join(`conversation:${actualConversationId}`);
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
        } else {
          logger.error({ err, userId, recipientId, conversationId }, "Failed to persist socket message");
          socket.emit("message:error", { error: "Failed to send message" });
        }
      }
    });

    socket.on("message:seen", async (payload: { messageId?: unknown } = {}) => {
      const { messageId } = payload;
      if (typeof messageId !== "string") return;
      try {
        const updated = await messageService.markSeen(messageId, userId);
        if (updated) {
          // Notify others in the conversation that it was seen
          socket.to(`conversation:${updated.conversationId}`).emit("message:seen:update", { messageId, userId, seenAt: updated.seenAt });
        }
      } catch (err) {
        logger.warn({ err, messageId, userId }, "Failed to mark message seen");
      }
    });

    // WebRTC Live Stream Signaling
    socket.on("stream:join", async (payload: { streamId?: unknown } = {}) => {
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
      if (!stream || (stream.status !== "live" && stream.hostId !== userId)) {
        socket.emit("stream:error", { streamId, error: "Stream is unavailable" });
        return;
      }

      joinedStreams.add(streamId);
      socket.join(`stream:${streamId}`);
      socket.to(`stream:${streamId}`).emit("stream:peer-joined", { userId, socketId: socket.id });
    });

    socket.on("stream:leave", (payload: { streamId?: unknown } = {}) => {
      const { streamId } = payload;
      if (typeof streamId === "string" && joinedStreams.delete(streamId)) {
        socket.leave(`stream:${streamId}`);
        socket.to(`stream:${streamId}`).emit("stream:peer-left", { userId, socketId: socket.id });
      }
    });

    socket.on("webrtc:offer", (payload: { targetSocketId?: unknown; offer?: unknown; streamId?: unknown } = {}) => {
      const { targetSocketId, offer, streamId } = payload;
      if (typeof targetSocketId === "string" && offer && typeof streamId === "string" && joinedStreams.has(streamId)) {
        const target = io.sockets.sockets.get(targetSocketId);
        if (target?.rooms.has(`stream:${streamId}`)) {
          target.emit("webrtc:offer", { senderSocketId: socket.id, offer, streamId });
        }
      }
    });

    socket.on("webrtc:answer", (payload: { targetSocketId?: unknown; answer?: unknown; streamId?: unknown } = {}) => {
      const { targetSocketId, answer, streamId } = payload;
      if (typeof targetSocketId === "string" && answer && typeof streamId === "string" && joinedStreams.has(streamId)) {
        const target = io.sockets.sockets.get(targetSocketId);
        if (target?.rooms.has(`stream:${streamId}`)) {
          target.emit("webrtc:answer", { senderSocketId: socket.id, answer, streamId });
        }
      }
    });

    socket.on("webrtc:ice-candidate", (payload: { targetSocketId?: unknown; candidate?: unknown; streamId?: unknown } = {}) => {
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

    socket.on("call:invite", async (payload: {
      callId?: unknown;
      targetUserId?: unknown;
      callType?: unknown;
      offer?: unknown;
    } = {}) => {
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
      if (!io.sockets.adapter.rooms.get(targetUserId)?.size) {
        emitCallError("That account is currently offline");
        return;
      }

      activeCalls.set(callId, { callerId: userId, recipientId: targetUserId, createdAt: Date.now() });
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
        if (!current || current.createdAt !== activeCalls.get(callId)?.createdAt) return;
        activeCalls.delete(callId);
        io.to(userId).emit("call:ended", { callId });
        io.to(targetUserId).emit("call:ended", { callId });
      }, 90_000);
      timeout.unref?.();
    });

    socket.on("call:accept", (payload: { callId?: unknown } = {}) => {
      const call = callForParticipant(payload.callId);
      if (!call || call.recipientId !== userId) {
        emitCallError("Call is no longer available");
        return;
      }
      io.to(call.callerId).emit("call:accepted", { callId: payload.callId });
    });

    socket.on("call:reject", (payload: { callId?: unknown } = {}) => {
      const call = callForParticipant(payload.callId);
      if (!call || call.recipientId !== userId) return;
      activeCalls.delete(payload.callId as string);
      io.to(call.callerId).emit("call:rejected", { callId: payload.callId });
    });

    socket.on("call:answer", (payload: { callId?: unknown; answer?: unknown } = {}) => {
      const call = callForParticipant(payload.callId);
      if (!call || call.recipientId !== userId || !payload.answer || typeof payload.answer !== "object") return;
      io.to(call.callerId).emit("call:answer", { callId: payload.callId, answer: payload.answer });
    });

    socket.on("call:ice", (payload: { callId?: unknown; candidate?: unknown } = {}) => {
      const call = callForParticipant(payload.callId);
      if (!call || !payload.candidate || typeof payload.candidate !== "object") return;
      const peerId = call.callerId === userId ? call.recipientId : call.callerId;
      io.to(peerId).emit("call:ice", { callId: payload.callId, candidate: payload.candidate });
    });

    socket.on("call:end", (payload: { callId?: unknown } = {}) => {
      const call = callForParticipant(payload.callId);
      if (!call) return;
      activeCalls.delete(payload.callId as string);
      const peerId = call.callerId === userId ? call.recipientId : call.callerId;
      io.to(peerId).emit("call:ended", { callId: payload.callId });
    });

    socket.on("disconnect", () => {
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
      onlineUsers.delete(userId);
      logger.info({ userId }, "socket disconnected");
    });
  });

  return io;
};
