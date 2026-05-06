const SHELL_CACHE = "vta-shell-v1";
const DATA_CACHE = "vta-data-v1";
const OFFLINE_URL = "/offline.html";
const QUEUE_KEY = "vta-offline-queue";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(["/", "/index.html", OFFLINE_URL])),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  const currentCaches = new Set([SHELL_CACHE, DATA_CACHE]);
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => !currentCaches.has(key))
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  if (req.method === "POST" && url.pathname.includes("/signatures")) {
    event.respondWith(
      fetch(req).catch(async () => {
        const cache = await caches.open(DATA_CACHE);
        const old = (await cache.match(QUEUE_KEY)) || new Response("[]");
        const queued = await old.json();
        queued.push({ url: req.url, body: await req.clone().text(), headers: Object.fromEntries(req.headers.entries()) });
        await cache.put(QUEUE_KEY, new Response(JSON.stringify(queued)));
        return new Response(JSON.stringify({ queued: true }), { headers: { "content-type": "application/json" } });
      }),
    );
    return;
  }

  if (url.pathname.startsWith("/assets/") || url.pathname.startsWith("/icons/") || url.pathname.startsWith("/screenshots/")) {
    event.respondWith(caches.match(req).then((c) => c || fetch(req).then((r) => {
      const clone = r.clone();
      caches.open(SHELL_CACHE).then((cache) => cache.put(req, clone));
      return r;
    })));
    return;
  }

  event.respondWith(
    fetch(req).then((res) => {
      if (req.method === "GET" && (url.pathname.includes("/PetitionDetail") || url.pathname.includes("/petitions"))) {
        caches.open(DATA_CACHE).then((cache) => cache.put(req, res.clone()));
      }
      return res;
    }).catch(async () => {
      const cached = await caches.match(req);
      return cached || caches.match(OFFLINE_URL);
    }),
  );
});

self.addEventListener("sync", (event) => {
  if (event.tag !== "vta-sync") return;
  event.waitUntil((async () => {
    const cache = await caches.open(DATA_CACHE);
    const queuedRes = await cache.match(QUEUE_KEY);
    if (!queuedRes) return;
    const queued = await queuedRes.json();
    const rest = [];
    for (const item of queued) {
      try {
        await fetch(item.url, { method: "POST", headers: item.headers, body: item.body });
      } catch {
        rest.push(item);
      }
    }
    await cache.put(QUEUE_KEY, new Response(JSON.stringify(rest)));
  })());
});
