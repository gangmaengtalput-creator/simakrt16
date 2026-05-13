/* eslint-disable no-restricted-globals */
const STATIC_CACHE = "simakrt-static-v1";
const RUNTIME_CACHE = "simakrt-runtime-v1";
const APP_SHELL = ["/", "/manifest.webmanifest", "/logo-maeng.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.map((key) => {
          if (key !== STATIC_CACHE && key !== RUNTIME_CACHE) return caches.delete(key);
          return Promise.resolve();
        })
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  const cacheName = request.destination === "document" ? STATIC_CACHE : RUNTIME_CACHE;

  event.respondWith(
    caches.match(request).then(async (cachedResponse) => {
      if (cachedResponse) return cachedResponse;

      try {
        const networkResponse = await fetch(request);
        // Cache only successful responses (avoid caching redirects/errors).
        if (networkResponse && networkResponse.ok) {
          const responseClone = networkResponse.clone();
          const cache = await caches.open(cacheName);
          try {
            await cache.put(request, responseClone);
          } catch {
            // Some responses may be non-cacheable; ignore.
          }
        }
        return networkResponse;
      } catch {
        // If offline and nothing cached yet, just bubble error (browser will show fallback).
        throw new Error("Network request failed and no cached response available.");
      }
    })
  );
});

