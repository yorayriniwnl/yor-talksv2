// Yor Talks — Production Service Worker (Bharat Edition 🇮🇳)
const CACHE_NAME = 'yor-talks-v3';
const STATIC_ASSETS = [
  '/manifest.json',
  '/favicon.svg',
];

// Install: Cache critical static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate: Clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch: navigation is network-first so a deploy can never serve HTML that
// points at deleted hashed chunks. Hashed assets remain cache-first because
// Vite gives them immutable filenames.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // API requests go directly to network
  if (event.request.url.includes('/api/') || new URL(event.request.url).origin !== self.location.origin) return;

  const isNavigation = event.request.mode === 'navigate' || event.request.headers.get('accept')?.includes('text/html');
  if (isNavigation) {
    event.respondWith(
      fetch(new Request(event.request, { cache: 'no-store' }))
        .then((response) => {
          if (response.ok) {
            const cacheCopy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', cacheCopy));
          }
          return response;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  const url = new URL(event.request.url);
  const cacheable = url.pathname.startsWith('/assets/') || STATIC_ASSETS.includes(url.pathname);
  if (!cacheable) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const cacheCopy = response.clone();
            void caches.open(CACHE_NAME).then((cache) => cache.put(event.request, cacheCopy));
          }
          return response;
        })
        .catch(() => cached || Response.error());
    })
  );
});

// ── Web Push & Lockscreen Notification Handler ───────────────────────────
self.addEventListener('push', (event) => {
  let data = {
    title: 'Yor Talks 🇮🇳',
    body: 'You have a new update from a creator you follow!',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    data: { url: '/' },
  };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/favicon.svg',
    badge: data.badge || '/favicon.svg',
    vibrate: [200, 100, 200],
    data: data.data || { url: '/' },
    actions: [
      { action: 'open', title: 'Open Yor Talks' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// Notification Click Handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
