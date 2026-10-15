import type { Server } from "socket.io";
import { dispatchSocketToUsers } from "../socket/policy.js";

let ioInstance: Server | null = null;

export function setIo(io: Server): void {
  ioInstance = io;
}

/** Emits to a user's room if the socket server is attached and that user is connected. No-op otherwise (e.g. in tests, or if nobody's listening). */
export function emitToUser(userId: string, event: string, payload: unknown): void {
  const io = ioInstance;
  if (!io) return;
  void dispatchSocketToUsers(io, [userId], event, payload, "notification:deliver").catch(() => undefined);
}

export function getIo(): Server | null {
  return ioInstance;
}
