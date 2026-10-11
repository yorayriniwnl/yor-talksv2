export type RealtimeTargetKind = "user" | "room" | "socket";
export type AuthorizedRealtimeDispatcher = (
  kind: RealtimeTargetKind,
  target: string,
  event: string,
  payload: unknown,
  excludeSocketId?: string,
) => Promise<number>;

let dispatcher: AuthorizedRealtimeDispatcher | null = null;

export function setAuthorizedRealtimeDispatcher(next: AuthorizedRealtimeDispatcher | null): void {
  dispatcher = next;
}

export function clearAuthorizedRealtimeDispatcher(current: AuthorizedRealtimeDispatcher): void {
  if (dispatcher === current) dispatcher = null;
}

function dispatch(kind: RealtimeTargetKind, target: string, event: string, payload: unknown, excludeSocketId?: string): Promise<number> {
  if (!dispatcher) return Promise.resolve(0);
  // Delivery is best-effort for callers that publish domain events after commit.
  // The configured dispatcher logs infrastructure failures and always fails closed.
  return dispatcher(kind, target, event, payload, excludeSocketId).catch(() => 0);
}

export function emitToUser(userId: string, event: string, payload: unknown): Promise<number> {
  return dispatch("user", userId, event, payload);
}

export function emitToRoom(room: string, event: string, payload: unknown, excludeSocketId?: string): Promise<number> {
  return dispatch("room", room, event, payload, excludeSocketId);
}

export function emitToSocket(socketId: string, event: string, payload: unknown): Promise<number> {
  return dispatch("socket", socketId, event, payload);
}
