import { io, type Socket } from 'socket.io-client';
import { getStoredTokens, onStoredTokensChange } from './api-client';

let socket: Socket | null = null;

onStoredTokensChange((accessToken) => {
  if (!socket) return;
  if (!accessToken) {
    socket.disconnect();
    socket = null;
    return;
  }
  socket.auth = { token: accessToken };
  if (socket.connected) {
    socket.disconnect();
    socket.connect();
  }
});

/** Connects (or returns the existing connection) using the current access token. */
export function connectSocket(): Socket | null {
  const tokens = getStoredTokens();
  if (!tokens) return null;
  if (socket?.connected) return socket;

  if (socket) {
    socket.auth = { token: tokens.accessToken };
    socket.connect();
    return socket;
  }

  const realtimeUrl = (import.meta.env.VITE_REALTIME_URL as string | undefined)?.trim() || undefined;
  // Vercel's serverless function serves HTTP only. Keep production clients
  // from repeatedly attempting a Socket.IO connection to a host that cannot
  // keep a durable WebSocket process alive. Docker/Nginx explicitly opts in
  // with VITE_REALTIME_ENABLED=true because it proxies to the long-lived API.
  if (import.meta.env.PROD && !realtimeUrl && import.meta.env.VITE_REALTIME_ENABLED !== 'true') return null;
  socket = io(realtimeUrl, {
    auth: { token: tokens.accessToken },
    path: '/socket.io',
    reconnection: true,
    reconnectionAttempts: 3,
    reconnectionDelay: 5000,
    timeout: 3000,
    autoConnect: true,
    transports: ['websocket', 'polling'],
  });

  socket.on('connect_error', (error) => {
    console.warn('[Yor] Realtime connection unavailable:', error.message);
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
