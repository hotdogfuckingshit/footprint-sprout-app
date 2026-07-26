self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(fetch(event.request));
});

function notificationUrl(data) {
  const raw = data?.url || data?.click_action || data?.link || './?tab=online';
  try {
    return new URL(raw, self.location.origin).toString();
  } catch {
    return new URL('./?tab=online', self.location.origin).toString();
  }
}

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {};
  }
  const data = payload.data || {};
  const notification = payload.notification || payload.webpush?.notification || {};
  const title = notification.title || data.title || '足跡';
  const options = {
    body: notification.body || data.body || '你有新的好友互動',
    icon: notification.icon || data.icon || './app-icon.svg',
    badge: notification.badge || data.badge || './app-icon.svg',
    tag: notification.tag || data.tag || data.type || 'footprint-online',
    renotify: true,
    data: {
      ...data,
      url: notificationUrl(data),
    },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = notificationUrl(event.notification.data || {});
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const sameOrigin = clients.find((client) => new URL(client.url).origin === self.location.origin);
      if (sameOrigin) {
        sameOrigin.navigate(url);
        return sameOrigin.focus();
      }
      return self.clients.openWindow(url);
    })
  );
});
