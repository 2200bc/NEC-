const CACHE_NAME = "calcuvolt-nec-2023-v5";
const APP_FILES = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js?v=20260802-2",
  "./manifest.json",
  "./src/data/nec.js",
  "./src/domain/conductors.js",
  "./src/domain/circuit-model.js",
  "./src/domain/derating.js",
  "./src/domain/panel.js",
  "./src/domain/voltage-drop.js",
  "./src/storage/project-store.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_FILES)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok && new URL(event.request.url).origin === self.location.origin) {
          const copy = response.clone();
          event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy)));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;
        if (event.request.mode === "navigate") return caches.match("./index.html");
        throw new Error("Resource unavailable offline");
      })
  );
});
