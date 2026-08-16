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
    path: '/socket.io',
    reconnection: true,
    reconnectionAttempts: 3,
    reconnectionDelay: 5000,
    timeout: 3000,
    autoConnect: true,
    transports: ['websocket', 'polling'],
  });

  socket.on('connect_error', () => {
    // Suppress noisy console logs when running on serverless hosts without persistent WebSocket listener
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
