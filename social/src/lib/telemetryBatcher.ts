import { getStoredTokens } from './api-client';

type TelemetryEvent = {
  eventId?: string;
  type: string;
  timestamp?: string;
  payload?: Record<string, any>;
  _attempts?: number;
};

const STORAGE_KEY = 'yor:telemetry:queue:v1';
const CONSENT_KEY = 'yor:telemetry:consent:v1';
const BATCH_SIZE = 20;
const FLUSH_INTERVAL = 1000 * 10; // 10s
const MAX_ATTEMPTS = 3;
const DEFAULT_SAMPLING = 1; // 100%
let queue: TelemetryEvent[] = [];
let eligibilityAllowsTelemetry = false;
let telemetryOwnerId: string | null = null;
let consentWithdrawn = false;
let consentRevision = 0;
let activeRequest: AbortController | null = null;

function discardQueue(removeStored = true): void {
  consentRevision += 1;
  activeRequest?.abort();
  activeRequest = null;
  queue = [];
  if (removeStored) {
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* Storage may be unavailable. */ }
  }
}

function telemetryUrl(): string {
  return (import.meta.env as any).VITE_TELEMETRY_URL || '/api/telemetry/events';
}

function telemetryHeaders(url: string): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = getStoredTokens()?.accessToken;
  if (token && new URL(url, window.location.href).origin === window.location.origin) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

function serializeEvents(events: TelemetryEvent[]): string {
  return JSON.stringify({ events: events.map((event) => ({
    eventId: event.eventId,
    schemaVersion: 1,
    eventName: event.type,
    occurredAt: event.timestamp ?? new Date().toISOString(),
    properties: event.type === 'react:profiler' ? {
      id: event.payload?.id,
      phase: event.payload?.phase,
      actualDuration: event.payload?.actualDuration,
      baseDuration: event.payload?.baseDuration,
    } : {},
  })) });
}

export function hasTelemetryConsent(): boolean {
  return eligibilityAllowsTelemetry && hasSavedTelemetryConsent();
}

/** A saved choice can be withdrawn even while current policy prevents collection. */
export function hasSavedTelemetryConsent(ownerId: string | null = telemetryOwnerId): boolean {
  if (consentWithdrawn) return false;
  try {
    return Boolean(ownerId && localStorage.getItem(CONSENT_KEY) === ownerId);
  } catch (e) {
    return false;
  }
}

/** Optional telemetry stays off until a current server decision permits adult analytics. */
export function setTelemetryEligibility(allowed: boolean, ownerId: string | null = telemetryOwnerId): void {
  const ownerChanged = telemetryOwnerId !== null && telemetryOwnerId !== ownerId;
  if (ownerChanged) {
    discardQueue();
    consentWithdrawn = false;
  }
  eligibilityAllowsTelemetry = allowed;
  telemetryOwnerId = ownerId;
  if (!allowed) {
    discardQueue();
    return;
  }
  queue = loadQueue();
}

export function setTelemetryConsent(granted: boolean): boolean {
  if (granted && (!eligibilityAllowsTelemetry || !telemetryOwnerId)) return false;
  if (!granted) {
    // Withdrawal takes effect in memory even when browser storage is blocked.
    consentWithdrawn = true;
    discardQueue();
    try { localStorage.removeItem(CONSENT_KEY); } catch { /* Remain off in this page. */ }
    return false;
  }
  try {
    localStorage.setItem(CONSENT_KEY, telemetryOwnerId!);
    consentWithdrawn = false;
    return hasTelemetryConsent();
  } catch { return false; }
}

function loadQueue(): TelemetryEvent[] {
  if (!hasTelemetryConsent()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const stored = JSON.parse(raw) as TelemetryEvent[];
    return stored.map((event) => ({ ...event, eventId: event.eventId ?? crypto.randomUUID() }));
  } catch (e) {
    return [];
  }
}

function saveQueue(q: TelemetryEvent[]) {
  if (!hasTelemetryConsent()) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(q));
  } catch (e) {
    // ignore quota errors
  }
}

function getSampling(): number {
  try {
    const v = (import.meta.env as any).VITE_TELEMETRY_SAMPLING;
    if (v == null) return DEFAULT_SAMPLING;
    const n = Number(v);
    if (Number.isFinite(n) && n >= 0 && n <= 1) return n;
  } catch (e) {
    // noop
  }
  return DEFAULT_SAMPLING;
}

async function sendBatch(events: TelemetryEvent[], signal: AbortSignal) {
  if (!hasTelemetryConsent()) return true;
  const url = telemetryUrl();
  const body = serializeEvents(events);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: telemetryHeaders(url),
      body,
      credentials: 'include',
      keepalive: true,
      signal,
    });
    return res.ok;
  } catch (err) {
    if (signal.aborted) return false;
    // eslint-disable-next-line no-console
    console.warn('[telemetry-batch] send failed', err);
    return false;
  }
}

let flushTimer: number | null = null;
let initialized = false;

export function enqueueTelemetry(e: TelemetryEvent) {
  if (!hasTelemetryConsent()) return;
  const sampling = getSampling();
  if (Math.random() > sampling) {
    return; // sampled out
  }

  const ev: TelemetryEvent = { ...e, eventId: crypto.randomUUID(), timestamp: new Date().toISOString(), _attempts: 0 };
  queue.push(ev);
  saveQueue(queue);

  if (queue.length >= BATCH_SIZE) {
    void flush();
  }

  if (!initialized) init();
}

export async function flush() {
  if (!hasTelemetryConsent()) {
    discardQueue();
    return;
  }
  if (queue.length === 0 || activeRequest) return;
  const revision = consentRevision;
  const ownerId = telemetryOwnerId;
  const controller = new AbortController();
  activeRequest = controller;
  const batch = queue.slice(0, BATCH_SIZE);
  try {
    const ok = await sendBatch(batch, controller.signal);
    // A response from an earlier consent/session cannot mutate a newer queue.
    if (controller.signal.aborted || revision !== consentRevision || ownerId !== telemetryOwnerId || !hasTelemetryConsent()) return;
    const sentIds = new Set(batch.map((event) => event.eventId));
    if (ok) {
      queue = queue.filter((event) => !sentIds.has(event.eventId));
    } else {
      queue = queue.map((event) => sentIds.has(event.eventId) ? { ...event, _attempts: (event._attempts ?? 0) + 1 } : event)
        .filter((event) => (event._attempts ?? 0) < MAX_ATTEMPTS);
    }
    saveQueue(queue);
  } finally {
    if (activeRequest === controller) activeRequest = null;
  }
}

function init() {
  if (initialized) return;
  initialized = true;
  queue = loadQueue();

  // periodic flush
  flushTimer = window.setInterval(() => void flush(), FLUSH_INTERVAL);

  // flush on visibility change
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      void flush();
    }
  });

  // Use the same consent and eligibility checks for every send path.
  window.addEventListener('beforeunload', () => {
    void flush();
  });

  window.addEventListener('storage', (event) => {
    if ((event.key === CONSENT_KEY || event.key === null) && !hasTelemetryConsent()) {
      discardQueue();
    }
  });

  // attempt flush on idle
  const requestIdleCallback = (window as Window & {
    requestIdleCallback?: (callback: () => void, options: { timeout: number }) => number;
  }).requestIdleCallback;

  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(() => void flush(), { timeout: 2000 });
  } else {
    // fallback short timeout
    window.setTimeout(() => void flush(), 2000);
  }
}

export function initTelemetryBatcher() {
  init();
}

export default { enqueueTelemetry, flush, initTelemetryBatcher };
