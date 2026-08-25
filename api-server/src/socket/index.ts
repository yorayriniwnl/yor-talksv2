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

  io.on("connection", async (socket) => {
    const userId = socket.data.userId as string;
    onlineUsers.set(userId, socket.id);
    socket.join(userId);
    logger.info({ userId }, "socket connected");
    socket.emit("presence:update", { online: true, userId });

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
    socket.on("message:send", async ({ recipientId, conversationId, content }) => {
      if (typeof content !== "string" || !content.trim()) {
        socket.emit("message:error", { error: "Invalid message payload" });
        return;
      }
      try {
        let message;
        let actualConversationId = conversationId;

        if (conversationId) {
          message = await messageService.sendMessageToConversation(userId, conversationId, content);
        } else if (recipientId) {
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

    socket.on("message:seen", async ({ messageId }) => {
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
