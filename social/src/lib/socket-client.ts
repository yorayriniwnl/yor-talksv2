import { io, type Socket } from 'socket.io-client';
import { getStoredTokens } from './api-client';

let socket: Socket | null = null;

/** Connects (or returns the existing connection) using the current access token. */
export function connectSocket(): Socket | null {
  const tokens = getStoredTokens();
  if (!tokens) return null;
  if (socket?.connected) return socket;

  socket = io({
    auth: { token: tokens.accessToken },
    // Vite's dev proxy needs an explicit entry for the socket.io path too
    // (see vite.config.ts) — same-origin, no separate host/port needed.
    path: '/socket.io',
  });
  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}

export function getSocket(): Socket | null {
  return socket;
}
