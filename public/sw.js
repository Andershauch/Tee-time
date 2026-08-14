const CACHE = "tee-time-static-v1";
const PRECACHE = ["/offline", "/images/tee-time-logo.png"];
const SENSITIVE_PATHS = [/^\/api\//, /^\/personale(?:\/|$)/, /^\/menuadmin(?:\/|$)/, /^\/auth(?:\/|$)/, /^\/ordre(?:\/|$)/, /^\/tidligere(?:\/|$)/];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)));
});
self.addEventListener("activate", (event) => {
  if ("navigationPreload" in self.registration) event.waitUntil(self.registration.navigationPreload.enable());
});
self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || request.method !== "GET") return;
  if (SENSITIVE_PATHS.some((pattern) => pattern.test(url.pathname)) || url.pathname.startsWith("/_next/")) {
    event.respondWith(fetch(request));
    return;
  }
  if (url.pathname.startsWith("/images/")) {
    event.respondWith(caches.match(request).then((cached) => cached || fetch(request).then((response) => {
      if (response.ok) void caches.open(CACHE).then((cache) => cache.put(request, response.clone()));
      return response;
    })));
    return;
  }
  if (request.mode === "navigate") event.respondWith(fetch(request).catch(() => caches.match("/offline")));
});
