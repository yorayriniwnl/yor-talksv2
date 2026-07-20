type TelemetryEvent = {
  type: string;
  timestamp?: string;
  payload?: Record<string, any>;
  _attempts?: number;
};

const STORAGE_KEY = 'yor:telemetry:queue:v1';
const BATCH_SIZE = 20;
const FLUSH_INTERVAL = 1000 * 10; // 10s
const MAX_ATTEMPTS = 3;
const DEFAULT_SAMPLING = 1; // 100%

function loadQueue(): TelemetryEvent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as TelemetryEvent[];
  } catch (e) {
    return [];
  }
}

function saveQueue(q: TelemetryEvent[]) {
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
  const url = (import.meta.env as any).VITE_TELEMETRY_URL;
  const body = JSON.stringify(events.map((e) => ({ ...e, timestamp: e.timestamp ?? new Date().toISOString() })));

  if (!url) {
    // no endpoint — drop to console in dev
    // eslint-disable-next-line no-console
    console.debug('[telemetry-batch] dropping batch (no url):', events.length);
    return true;
  }

  try {
    if (navigator && 'sendBeacon' in navigator) {
      const blob = new Blob([body], { type: 'application/json' });
      const ok = navigator.sendBeacon(url, blob);
      return ok;
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    });
    return res.ok;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[telemetry-batch] send failed', err);
    return false;
  }
}

let queue: TelemetryEvent[] = [];
let flushTimer: number | null = null;
let initialized = false;

export function enqueueTelemetry(e: TelemetryEvent) {
  const sampling = getSampling();
  if (Math.random() > sampling) {
    return; // sampled out
  }

  const ev: TelemetryEvent = { ...e, timestamp: new Date().toISOString(), _attempts: 0 };
  queue.push(ev);
  saveQueue(queue);

  if (queue.length >= BATCH_SIZE) {
    void flush();
  }

  if (!initialized) init();
}

export async function flush() {
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
    const url = (import.meta.env as any).VITE_TELEMETRY_URL;
    if (!url) return;
    try {
      const payload = JSON.stringify(queue.map((e) => ({ ...e, timestamp: e.timestamp ?? new Date().toISOString() })));
      if (navigator && 'sendBeacon' in navigator) {
        const blob = new Blob([payload], { type: 'application/json' });
        navigator.sendBeacon(url, blob);
      }
    } catch (e) {
      // ignore
    }
  });

  // attempt flush on idle
  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(() => void flush(), { timeout: 2000 });
  } else {
    // fallback short timeout
    window.setTimeout(() => void flush(), 2000);
  }
}

export function initTelemetryBatcher() {
  init();
}

export default { enqueueTelemetry, flush, initTelemetryBatcher };
