import type { Server } from "socket.io";

let ioInstance: Server | null = null;

export function setIo(io: Server): void {
  ioInstance = io;
}

/** Emits to a user's room if the socket server is attached and that user is connected. No-op otherwise (e.g. in tests, or if nobody's listening). */
export function emitToUser(userId: string, event: string, payload: unknown): void {
  ioInstance?.to(userId).emit(event, payload);
}

export function getIo(): Server | null {
  return ioInstance;
}
