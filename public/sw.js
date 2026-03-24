// Service Worker for caching Pyodide (Production Silent Mode)
const CACHE_NAME = 'pyodide-cache-v1';
const PYODIDE_FILES = [
  '/pyodide/pyodide.js',
  '/pyodide/pyodide.asm.js',
  '/pyodide/pyodide.asm.wasm',
  '/pyodide/pyodide_py.tar',
  '/pyodide/packages.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Silent caching - no console output in production
      return cache.addAll(PYODIDE_FILES.map(url => new Request(url, { cache: 'reload' })))
        .catch(() => {
          // Silently ignore cache failures
        });
    }).catch(() => {
      // Silently ignore errors
    })
  );
  // Skip waiting to activate immediately
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/pyodide/')) {
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request).catch(() => {
          // Return empty response on network failure
          return new Response('', { status: 503 });
        });
      }).catch(() => {
        return fetch(event.request);
      })
    );
  }
});
