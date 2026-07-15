// ─── Cache Names ─────────────────────────────────────────────────────────────
const SHELL_CACHE   = 'scripturai-shell-v3';
const BIBLE_CACHE   = 'scripturai-bibles-v1';
const FONT_CACHE    = 'scripturai-fonts-v1';
const DYNAMIC_CACHE = 'scripturai-dynamic-v3';

const ALL_CACHES = [SHELL_CACHE, BIBLE_CACHE, FONT_CACHE, DYNAMIC_CACHE];

// ─── App Shell — these are precached on install ───────────────────────────────
// Vite hashes JS/CSS filenames at build time, so we cache the root documents
// and let the dynamic cache absorb hashed assets on first visit.
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
];

// ─── Install ─────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

// ─── Activate — purge old caches ──────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => !ALL_CACHES.includes(key))
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// ─── Helpers ─────────────────────────────────────────────────────────────────
function isBibleFile(url) {
  return url.pathname.startsWith('/bibles/');
}

function isFontRequest(url) {
  return (
    url.hostname === 'fonts.googleapis.com' ||
    url.hostname === 'fonts.gstatic.com'
  );
}

function isExternalBibleAPI(url) {
  return (
    url.hostname.includes('bolls.life') ||
    url.hostname.includes('bible-api.com') ||
    url.hostname.includes('getbible.net') ||
    url.hostname.includes('bible.helloao.org')
  );
}

function isFirebaseOrAI(url) {
  return (
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('firebaseio.com') ||
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('fcm.googleapis.com') ||
    url.hostname.includes('identitytoolkit.googleapis.com') ||
    url.hostname.includes('openrouter.ai') ||
    url.hostname.includes('generativelanguage.googleapis.com') ||
    url.pathname.startsWith('/api/')
  );
}

// ─── Strategies ──────────────────────────────────────────────────────────────

/**
 * Cache-first: serve from cache, update cache in background.
 * Used for Bible JSON files — they never change content.
 */
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response && response.status === 200) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response(JSON.stringify({ error: 'offline' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Stale-while-revalidate: serve from cache immediately, refresh cache async.
 * Used for fonts — fast and stays current.
 */
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const networkFetch = fetch(request)
    .then((response) => {
      if (response && response.status === 200) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  return cached || networkFetch;
}

/**
 * Network-first with cache fallback.
 * Used for app shell assets — always try to get freshest version,
 * but work offline if network fails.
 */
async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response && response.status === 200) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;

    // SPA fallback for navigation requests
    if (request.mode === 'navigate') {
      const fallback = await caches.match('/index.html');
      if (fallback) return fallback;
    }

    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

// ─── Fetch Router ─────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle GET requests
  if (request.method !== 'GET') return;

  // Skip websocket upgrades
  if (request.headers.get('Upgrade') === 'websocket') return;

  const url = new URL(request.url);

  // Never intercept Firebase, AI, or /api/ — always go to network
  if (isFirebaseOrAI(url)) return;

  // Never intercept external Bible APIs — they are fallbacks only used online
  if (isExternalBibleAPI(url)) return;

  // ── Bible JSON files: cache-first (they never change) ──────────────────────
  if (isBibleFile(url)) {
    event.respondWith(cacheFirst(request, BIBLE_CACHE));
    return;
  }

  // ── Google Fonts: stale-while-revalidate ───────────────────────────────────
  if (isFontRequest(url)) {
    event.respondWith(staleWhileRevalidate(request, FONT_CACHE));
    return;
  }

  // ── Everything else (app shell, JS chunks, CSS): network-first ────────────
  event.respondWith(networkFirst(request, DYNAMIC_CACHE));
});

// ─── Push Notifications ───────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  let data = { title: 'Scripturai', body: '', icon: '/icon-192.png' };
  try {
    if (event.data) {
      const parsed = event.data.json();
      data = { ...data, ...parsed };
    }
  } catch {
    data.body = event.data?.text() || '';
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || '/icon-192.png',
      badge: '/icon-192.png',
      vibrate: [200, 100, 200],
      data: data.data || {},
      tag: data.tag || 'daily-verse',
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        if (windowClients.length > 0) {
          return windowClients[0].focus();
        }
        return clients.openWindow('/');
      })
  );
});
