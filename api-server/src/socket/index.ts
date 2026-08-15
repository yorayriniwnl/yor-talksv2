import { Server } from "socket.io";
import type { Server as HttpServer } from "node:http";
import jwt from "jsonwebtoken";
import { env, corsOrigins } from "../config/env.js";
import { logger } from "../lib/logger.js";
import { setIo } from "../lib/realtime.js";
import { ConversationRepository, MessageRepository } from "../repositories/message-repository.js";
import { UserRepository } from "../repositories/user-repository.js";
import { MessageBlockedError, MessageService } from "../services/message-service.js";

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
  const messageService = new MessageService(conversationRepository, new MessageRepository(), userRepository);
  const onlineUsers = new Map<string, string>();

  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error("Authentication error"));
    }
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as { sub: string };
      socket.data.userId = decoded.sub;
      next();
    } catch {
      next(new Error("Authentication error"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.data.userId as string;
    onlineUsers.set(userId, socket.id);
    socket.join(userId);
    logger.info({ userId }, "socket connected");
    socket.emit("presence:update", { online: true, userId });

    const relayTyping = async (event: "typing:start" | "typing:end", conversationId: unknown) => {
      if (typeof conversationId !== "string") return;

      try {
        const conversation = await conversationRepository.findById(conversationId);
        if (!conversation || !conversation.participantIds?.includes(userId)) return;

        const recipientId = conversation.participantIds.find((participantId) => participantId !== userId);
        if (!recipientId) return;

        // Presence signals follow the same block boundary as direct messages.
        const recipient = await userRepository.findById(recipientId);
        if (recipient?.blockedUsers?.includes(userId)) return;

        io.to(recipientId).emit(event, { userId, conversationId });
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

    // Previously this just relayed the raw payload in-memory with no
    // persistence at all — a message sent while the recipient was offline
    // was lost forever, and blocked users could still reach you. Now it goes
    // through the same MessageService the REST endpoint uses: persisted to
    // Postgres, block-list checked, with a real message id and timestamp.
    socket.on("message:send", async ({ recipientId, content }) => {
      if (typeof recipientId !== "string" || typeof content !== "string" || !content.trim()) {
        socket.emit("message:error", { error: "Invalid message payload" });
        return;
      }
      try {
        const message = await messageService.sendMessage(userId, recipientId, content);
        io.to(recipientId).emit("message:receive", message);
        socket.emit("message:sent", message);
      } catch (err) {
        if (err instanceof MessageBlockedError) {
          socket.emit("message:error", { error: err.message });
        } else {
          logger.error({ err, userId, recipientId }, "Failed to persist socket message");
          socket.emit("message:error", { error: "Failed to send message" });
        }
      }
    });

    // WebRTC Live Stream Signaling
    socket.on("stream:join", ({ streamId }) => {
      if (typeof streamId === "string") {
        socket.join(`stream:${streamId}`);
        socket.to(`stream:${streamId}`).emit("stream:peer-joined", { userId, socketId: socket.id });
      }
    });

    socket.on("stream:leave", ({ streamId }) => {
      if (typeof streamId === "string") {
        socket.leave(`stream:${streamId}`);
        socket.to(`stream:${streamId}`).emit("stream:peer-left", { userId, socketId: socket.id });
      }
    });

    socket.on("webrtc:offer", ({ targetSocketId, offer, streamId }) => {
      if (targetSocketId) {
        io.to(targetSocketId).emit("webrtc:offer", { senderSocketId: socket.id, offer, streamId });
      }
    });

    socket.on("webrtc:answer", ({ targetSocketId, answer, streamId }) => {
      if (targetSocketId) {
        io.to(targetSocketId).emit("webrtc:answer", { senderSocketId: socket.id, answer, streamId });
      }
    });

    socket.on("webrtc:ice-candidate", ({ targetSocketId, candidate, streamId }) => {
      if (targetSocketId) {
        io.to(targetSocketId).emit("webrtc:ice-candidate", { senderSocketId: socket.id, candidate, streamId });
      }
    });

    socket.on("disconnect", () => {
      onlineUsers.delete(userId);
      logger.info({ userId }, "socket disconnected");
    });
  });

  return io;
};
