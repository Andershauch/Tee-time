const CACHE = "tee-time-static-v2";
const PRECACHE = ["/offline", "/images/pwa-icon-192.png"];
const SENSITIVE_PATHS = [/^\/api\//, /^\/personale(?:\/|$)/, /^\/menuadmin(?:\/|$)/, /^\/auth(?:\/|$)/, /^\/ordre(?:\/|$)/, /^\/tidligere(?:\/|$)/];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (event) => {
  event.waitUntil(Promise.all([
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))),
    "navigationPreload" in self.registration ? self.registration.navigationPreload.enable() : Promise.resolve(),
    self.clients.claim(),
  ]));
});
self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || request.method !== "GET") return;
  if (SENSITIVE_PATHS.some((pattern) => pattern.test(url.pathname)) || url.pathname.startsWith("/_next/")) return;
  if (url.pathname.startsWith("/images/")) {
    event.respondWith(caches.match(request).then((cached) => {
      const fresh = fetch(request).then((response) => {
        if (response.ok && response.type === "basic") void caches.open(CACHE).then((cache) => cache.put(request, response.clone()));
        return response;
      });
      if (cached) {
        event.waitUntil(fresh);
        return cached;
      }
      return fresh;
    }));
    return;
  }
  if (request.mode === "navigate") event.respondWith(event.preloadResponse.then((response) => response || fetch(request)).catch(() => caches.match("/offline")));
});
