import axiosInstance, { API_BASE_URL } from '@/lib/axios';
import { API_ENDPOINTS } from '@/lib/apiEndpoints';

/**
 * - `needs-install`: iOS Safari only delivers web push to a home-screen app.
 * - `unconfigured`: the server has no VAPID keys.
 */
export type PushState = 'unsupported' | 'needs-install' | 'unconfigured' | 'denied' | 'prompt' | 'subscribed';

export type SwMessage = { type: 'NAVIGATE'; url: string } | { type: 'PUSH_RECEIVED' };

export const SW_MESSAGE_EVENT = 'hrms:sw-message';

const isIOS = (): boolean =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

const isStandalone = (): boolean =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

const pushSupported = (): boolean =>
  'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

export function registerServiceWorker(): void {
  if (!('serviceWorker' in navigator)) return;

  navigator.serviceWorker.addEventListener('message', (event: MessageEvent<SwMessage>) => {
    window.dispatchEvent(new CustomEvent<SwMessage>(SW_MESSAGE_EVENT, { detail: event.data }));
  });

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(`/sw.js?api=${encodeURIComponent(API_BASE_URL)}`)
      .catch((error: unknown) => console.warn('Service worker registration failed', error));
  });
}

let vapidKey: string | null = null;

async function getVapidKey(): Promise<string | null> {
  if (vapidKey) return vapidKey;
  try {
    const { data } = await axiosInstance.get<{ data?: { vapidKey?: string } }>(API_ENDPOINTS.NOTIFICATIONS.VAPID_KEY);
    vapidKey = data.data?.vapidKey ?? null;
  } catch {
    vapidKey = null;
  }
  return vapidKey;
}

function base64UrlToBytes(base64: string): Uint8Array<ArrayBuffer> {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(padded);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

async function currentSubscription(): Promise<PushSubscription | null> {
  if (!pushSupported()) return null;
  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
}

async function register(subscription: PushSubscription): Promise<void> {
  await axiosInstance.post(API_ENDPOINTS.NOTIFICATIONS.SUBSCRIBE, { subscription: subscription.toJSON() });
}

async function subscribe(): Promise<PushSubscription | null> {
  const key = await getVapidKey();
  if (!key) return null;
  const registration = await navigator.serviceWorker.ready;
  const existing = await registration.pushManager.getSubscription();
  if (existing) return existing;
  return registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64UrlToBytes(key) });
}

export async function getPushState(): Promise<PushState> {
  if (!pushSupported()) return isIOS() && !isStandalone() ? 'needs-install' : 'unsupported';
  if (isIOS() && !isStandalone()) return 'needs-install';
  if (Notification.permission === 'denied') return 'denied';
  if (!(await getVapidKey())) return 'unconfigured';
  if (Notification.permission === 'granted' && (await currentSubscription())) return 'subscribed';
  return 'prompt';
}

/** Must run inside a user gesture: it may show the browser's permission prompt. */
export async function enablePush(): Promise<PushState> {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return permission === 'denied' ? 'denied' : 'prompt';
  const subscription = await subscribe();
  if (!subscription) return 'unconfigured';
  await register(subscription);
  return 'subscribed';
}

/**
 * Re-register this device for the signed-in user. Idempotent (the server
 * upserts on endpoint), and never prompts — it only acts on granted permission.
 */
export async function syncPush(): Promise<boolean> {
  if (!pushSupported() || Notification.permission !== 'granted') return false;
  const subscription = await subscribe();
  if (!subscription) return false;
  await register(subscription);
  return true;
}

export async function disablePush(): Promise<void> {
  const subscription = await currentSubscription();
  if (!subscription) return;
  const { endpoint } = subscription;
  await subscription.unsubscribe();
  await axiosInstance.post(API_ENDPOINTS.NOTIFICATIONS.UNSUBSCRIBE, { endpoint });
}

/**
 * Unlink this device from the account being signed out, so the next person on
 * a shared machine doesn't receive it. Call while the auth token still exists.
 */
export async function detachPushOnLogout(): Promise<void> {
  try {
    const subscription = await currentSubscription();
    if (subscription) {
      await axiosInstance.post(API_ENDPOINTS.NOTIFICATIONS.UNSUBSCRIBE, { endpoint: subscription.endpoint });
    }
    if ('clearAppBadge' in navigator) await navigator.clearAppBadge();
  } catch {
    // Logging out must never be blocked by push cleanup.
  }
}
