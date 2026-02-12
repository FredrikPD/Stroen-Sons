const CACHE_NAME = "stroen-sons-pwa-v1";
const OFFLINE_URL = "/offline";
const PUSH_META_CACHE_NAME = "stroen-sons-pwa-push-meta-v1";
const PUSH_SEEN_KEY = "/__push_seen_notifications";
const PRECACHE_ASSETS = [
  OFFLINE_URL,
  "/manifest.webmanifest",
  "/icon.png",
  "/apple-touch-icon.png",
  "/pwa-192x192.png",
  "/pwa-512x512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_ASSETS)).catch(() => undefined)
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
    return;
  }

  const shouldCacheAsset =
    request.destination === "style" ||
    request.destination === "script" ||
    request.destination === "image" ||
    request.destination === "font" ||
    url.pathname.startsWith("/_next/static/");

  if (!shouldCacheAsset) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request)
        .then((response) => {
          if (response.ok) {
            const cloned = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, cloned));
          }
          return response;
        })
        .catch(() => cached);

      return cached || networkFetch;
    })
  );
});

const getSeenNotificationIds = async () => {
  const cache = await caches.open(PUSH_META_CACHE_NAME);
  const cached = await cache.match(PUSH_SEEN_KEY);
  if (!cached) return [];

  try {
    const parsed = await cached.json();
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const setSeenNotificationIds = async (ids) => {
  const cache = await caches.open(PUSH_META_CACHE_NAME);
  await cache.put(
    PUSH_SEEN_KEY,
    new Response(JSON.stringify(ids), {
      headers: { "content-type": "application/json" },
    })
  );
};

self.addEventListener("push", (event) => {
  event.waitUntil((async () => {
    try {
      const response = await fetch("/api/push/latest", {
        credentials: "include",
        cache: "no-store",
      });

      if (!response.ok) return;

      const payload = await response.json();
      const notifications = Array.isArray(payload.notifications) ? payload.notifications : [];
      if (notifications.length === 0) return;

      const seenIds = await getSeenNotificationIds();

      const candidate =
        notifications.find((item) => !seenIds.includes(item.id) && item.read === false) ||
        notifications.find((item) => !seenIds.includes(item.id));

      if (!candidate) return;

      await self.registration.showNotification(candidate.title || "Ny varsling", {
        body: candidate.message || "",
        icon: "/pwa-192x192.png",
        badge: "/pwa-192x192.png",
        data: {
          url: candidate.link || "/dashboard",
          notificationId: candidate.id,
        },
        tag: `notification-${candidate.id}`,
      });

      const updatedSeen = [candidate.id, ...seenIds.filter((id) => id !== candidate.id)].slice(0, 50);
      await setSeenNotificationIds(updatedSeen);
    } catch {
      // Ignore push-display errors to avoid breaking SW lifecycle.
    }
  })());
});

self.addEventListener("notificationclick", (event) => {
  const targetPath = event.notification?.data?.url || "/dashboard";
  event.notification.close();

  event.waitUntil((async () => {
    const allClients = await clients.matchAll({
      type: "window",
      includeUncontrolled: true,
    });

    const targetUrl = new URL(targetPath, self.location.origin).toString();

    for (const client of allClients) {
      if ("focus" in client && client.url === targetUrl) {
        await client.focus();
        return;
      }
    }

    if (clients.openWindow) {
      await clients.openWindow(targetUrl);
    }
  })());
});
