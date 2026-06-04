const CACHE_NAME = 'scripturai-shell-v1';
const APP_SHELL = [
  '/',
  '/index.html'
];

// Install event - cache the core app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL);
    })
  );
  self.skipWaiting(); // Activate worker immediately
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim(); // Take control of all pages immediately
});

// Fetch event - Stale-while-revalidate / Network fallback
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Do NOT intercept API calls or Firebase auth requests
  // We let IndexedDB and normal network behavior handle these
  if (
    url.pathname.startsWith('/api') || 
    url.hostname.includes('getbible.net') || 
    url.hostname.includes('bible-api.com') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('firebase') ||
    url.pathname.startsWith('/api') // Exclude all /api calls from caching
  ) {
    return; 
  }

  // Dynamic Cache-First strategy for static assets (JS, CSS, Images, Fonts)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // For local Bible files, serve from cache immediately and don't revalidate
        if (url.pathname.startsWith('/bibles/')) {
          return cachedResponse;
        }
        // For other assets, fetch from network in background to update cache for next time (Stale-While-Revalidate)
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse.clone()));
          }
        }).catch(() => {});
        return cachedResponse;
      }
      
      // If not in cache, fetch from network and cache it dynamically
      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          if (event.request.url.startsWith('http') || url.pathname.startsWith('/bibles/')) { // Cache local Bible files
            cache.put(event.request, responseToCache);
          }
        });
        return networkResponse;
      }).catch(() => event.request.mode === 'navigate' ? caches.match('/index.html') : null);
    })
  );
});