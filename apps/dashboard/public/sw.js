const CACHE = 'cermin-shell-v2';
const SHELL = ['/', '/manifest.webmanifest', '/icon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then(async (cache) => {
      const response = await fetch('/');
      const html = await response.clone().text();
      const assets = [...html.matchAll(/(?:src|href)="(\/[^"]+)"/g)].map((match) => match[1]);
      await cache.put('/', response);
      await cache.addAll([...new Set([...SHELL.slice(1), ...assets])]);
    }),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))),
      ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (
    event.request.method !== 'GET' ||
    new URL(event.request.url).origin !== self.location.origin
  ) {
    return;
  }

  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).catch(() => caches.match('/')));
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fresh = fetch(event.request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          void caches.open(CACHE).then((cache) => cache.put(event.request, copy));
        }
        return response;
      });
      return cached ?? fresh;
    }),
  );
});
