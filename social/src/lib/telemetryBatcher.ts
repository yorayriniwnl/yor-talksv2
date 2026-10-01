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
  try {
    return localStorage.getItem(CONSENT_KEY) === 'granted';
  } catch (e) {
    return false;
  }
}

export function setTelemetryConsent(granted: boolean): void {
  try {
    if (granted) {
      localStorage.setItem(CONSENT_KEY, 'granted');
      return;
    }
    localStorage.removeItem(CONSENT_KEY);
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    // Storage can be unavailable in private or restricted browser contexts.
  }
  queue = [];
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

async function sendBatch(events: TelemetryEvent[]) {
  if (!hasTelemetryConsent()) return true;
  const url = telemetryUrl();
  const body = serializeEvents(events);

  if (!url) {
    // no endpoint — drop to console in dev
    // eslint-disable-next-line no-console
    console.debug('[telemetry-batch] dropping batch (no url):', events.length);
    return true;
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: telemetryHeaders(url),
      body,
      credentials: 'include',
      keepalive: true,
    });
    return res.ok;
  } catch (err) {
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
    queue = [];
    return;
  }
  if (queue.length === 0) return;
  const batch = queue.slice(0, BATCH_SIZE);
  const ok = await sendBatch(batch);
  if (ok) {
    queue = queue.slice(batch.length);
    saveQueue(queue);
    return;
  }

  // failed — increment attempts and drop ones that exceeded attempts
  queue = queue.map((ev) => ({ ...ev, _attempts: (ev._attempts ?? 0) + 1 })).filter((ev) => (ev._attempts ?? 0) < MAX_ATTEMPTS);
  saveQueue(queue);
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
      // try a last flush via sendBeacon
      void flush();
    }
  });

  // beforeunload — attempt sendBeacon
  window.addEventListener('beforeunload', () => {
    if (queue.length === 0) return;
    const url = telemetryUrl();
    try {
      void fetch(url, {
        method: 'POST',
        headers: telemetryHeaders(url),
        body: serializeEvents(queue),
        credentials: 'include',
        keepalive: true,
      });
    } catch (e) {
      // ignore
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
