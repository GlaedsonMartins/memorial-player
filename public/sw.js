const APP_CACHE = "memorial-player-app-v1";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(APP_CACHE).then((cache) => cache.addAll(["/", "/setup"])),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== APP_CACHE && !key.startsWith("memorial-player-media")).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  // Let Storage/Firestore requests preserve their own errors and CORS semantics.
  if (new URL(event.request.url).origin !== self.location.origin) return;

  if (event.request.destination === "image" || event.request.destination === "video" || event.request.destination === "audio") {
    if (event.request.headers.has("range")) return;
    event.respondWith(
      (async () => {
        const cache = await caches.open("memorial-player-media-v1").catch(() => null);
        const cached = await cache?.match(event.request).catch(() => undefined);
        if (cached) return cached;
        const response = await fetch(event.request);
        if (response.status === 200) await cache?.put(event.request, response.clone()).catch(() => undefined);
        return response;
      })(),
    );
    return;
  }

  event.respondWith(
    fetch(event.request).catch(() =>
      caches.match(event.request).then(async (response) => {
        if (response) return response;
        if (event.request.mode === "navigate") return (await caches.match("/")) || Response.error();
        return Response.error();
      }),
    ),
  );
});
