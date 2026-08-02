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

  const messageService = new MessageService(new ConversationRepository(), new MessageRepository(), new UserRepository());
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

    socket.on("typing:start", ({ conversationId }) => {
      socket.to(conversationId).emit("typing:start", { userId, conversationId });
    });

    socket.on("typing:end", ({ conversationId }) => {
      socket.to(conversationId).emit("typing:end", { userId, conversationId });
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

    socket.on("disconnect", () => {
      onlineUsers.delete(userId);
      logger.info({ userId }, "socket disconnected");
    });
  });

  return io;
};
