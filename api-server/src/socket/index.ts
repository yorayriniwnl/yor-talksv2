import { Server } from "socket.io";
import type { Server as HttpServer } from "node:http";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { logger } from "../lib/logger.js";

export const attachSocketServer = (httpServer: HttpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

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

    socket.on("message:send", ({ recipientId, content }) => {
      socket.to(recipientId).emit("message:receive", { senderId: userId, recipientId, content, createdAt: new Date().toISOString() });
    });

    socket.on("disconnect", () => {
      onlineUsers.delete(userId);
      logger.info({ userId }, "socket disconnected");
    });
  });

  return io;
};
