const CACHE_NAME = "stroen-sons-pwa-v4";
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

  const isCriticalAsset =
    request.destination === "style" ||
    request.destination === "script" ||
    url.pathname.startsWith("/_next/static/");

  if (isCriticalAsset) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const cloned = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, cloned));
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  const shouldCacheAsset =
    request.destination === "image" ||
    request.destination === "font";

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

const showGenericNotification = async () => {
  await self.registration.showNotification("Ny varsling", {
    body: "Du har en ny oppdatering i Strøen Søns.",
    icon: "/pwa-192x192.png",
    badge: "/pwa-192x192.png",
    data: { url: "/dashboard" },
    tag: "notification-generic",
  });
};

self.addEventListener("push", (event) => {
  event.waitUntil((async () => {
    try {
      const subscription = await self.registration.pushManager.getSubscription();
      const endpoint = subscription?.endpoint;

      if (!endpoint) {
        await showGenericNotification();
        return;
      }

      const response = await fetch("/api/push/latest-by-subscription", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ endpoint }),
        cache: "no-store",
      });

      if (!response.ok) {
        await showGenericNotification();
        return;
      }

      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        await showGenericNotification();
        return;
      }

      const payload = await response.json();
      const notifications = Array.isArray(payload.notifications) ? payload.notifications : [];
      if (notifications.length === 0) {
        await showGenericNotification();
        return;
      }

      const sortedNotifications = [...notifications].sort((a, b) => {
        const aTs = new Date(a.createdAt || 0).getTime();
        const bTs = new Date(b.createdAt || 0).getTime();
        return bTs - aTs;
      });

      const seenIds = await getSeenNotificationIds();

      const candidate = sortedNotifications.find(
        (item) => item.read === false && !seenIds.includes(item.id)
      );

      if (!candidate) {
        await showGenericNotification();
        return;
      }

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
      try {
        await showGenericNotification();
      } catch {
        // Ignore push-display errors to avoid breaking SW lifecycle.
      }
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
