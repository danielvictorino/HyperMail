const CACHE_NAME = "hypermail-shell-v1";
const CORE_ASSETS = ["/", "/index.html"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
        )
      )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200) {
          return networkResponse;
        }

        const clone = networkResponse.clone();
        void caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        return networkResponse;
      });
    })
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type !== "HYPERMAIL_CACHE_STATUS") {
    return;
  }

  void reportCacheStatus();
});

async function reportCacheStatus() {
  const cache = await caches.open(CACHE_NAME);
  const keys = await cache.keys();
  const clients = await self.clients.matchAll({ includeUncontrolled: true });

  for (const client of clients) {
    client.postMessage({
      type: "HYPERMAIL_CACHE_STATUS",
      payload: {
        cacheName: CACHE_NAME,
        itemCount: keys.length
      }
    });
  }
}
