// HRMS service worker: push delivery, notification clicks, subscription rotation.
// Scheduling lives on the server — a worker is killed when idle, so timers here never fire.

const API_BASE = new URL(self.location.href).searchParams.get('api') || '/api';
const ICON = '/icon-192x192.png';
const BADGE = '/favicon-48x48.png';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

// Payloads use the Declarative Web Push shape ({ web_push: 8030, notification }),
// which Safari can render on its own; this handler covers every other browser.
const parsePush = (event) => {
  if (!event.data) return null;
  try {
    const payload = event.data.json();
    return payload.notification ?? payload;
  } catch {
    return { title: 'HRMS', body: event.data.text() };
  }
};

const toPath = (url) => {
  if (!url) return '/dashboard';
  try {
    const parsed = new URL(url, self.location.origin);
    return parsed.origin === self.location.origin ? parsed.pathname + parsed.search : '/dashboard';
  } catch {
    return '/dashboard';
  }
};

self.addEventListener('push', (event) => {
  const n = parsePush(event);
  if (!n) return;

  const actions = (n.actions ?? []).slice(0, 2);
  const options = {
    body: n.body ?? '',
    icon: ICON,
    badge: BADGE,
    lang: n.lang,
    dir: n.dir,
    silent: Boolean(n.silent),
    requireInteraction: Boolean(n.require_interaction),
    data: {
      url: toPath(n.navigate ?? n.data?.url),
      actions: Object.fromEntries(actions.map((a) => [a.action, toPath(a.navigate)])),
      inboxId: n.data?.inboxId,
    },
    actions: actions.map(({ action, title }) => ({ action, title })),
  };
  if (n.tag) {
    options.tag = n.tag;
    options.renotify = true;
  }

  const badge = Number(n.app_badge);
  event.waitUntil(
    Promise.all([
      self.registration.showNotification(n.title ?? 'HRMS', options),
      Number.isFinite(badge) && self.navigator.setAppBadge ? self.navigator.setAppBadge(badge).catch(() => {}) : null,
      self.clients
        .matchAll({ type: 'window', includeUncontrolled: true })
        .then((clients) => clients.forEach((c) => c.postMessage({ type: 'PUSH_RECEIVED' }))),
    ])
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const { url = '/dashboard', actions = {} } = event.notification.data ?? {};
  const target = (event.action && actions[event.action]) || url;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (clients) => {
      const client = clients.find((c) => new URL(c.url).origin === self.location.origin);
      if (client) {
        await client.focus();
        client.postMessage({ type: 'NAVIGATE', url: target });
        return;
      }
      return self.clients.openWindow(target);
    })
  );
});

// The browser rotated our endpoint. The worker has no auth token, so the server
// matches on the old endpoint, which only this device knows.
self.addEventListener('pushsubscriptionchange', (event) => {
  const oldEndpoint = event.oldSubscription?.endpoint;
  const options = event.oldSubscription?.options;
  if (!oldEndpoint || !options?.applicationServerKey) return;

  event.waitUntil(
    self.registration.pushManager
      .subscribe({ userVisibleOnly: true, applicationServerKey: options.applicationServerKey })
      .then((subscription) =>
        fetch(`${API_BASE}/notifications/resubscribe`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ oldEndpoint, subscription: subscription.toJSON() }),
        })
      )
      .catch(() => {})
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
