// Service Worker for HRMS PWA
// Handles push notifications, background sync, and minimal offline support

const CACHE_NAME = 'hrms-cache-v2';
const ESSENTIAL_ASSETS = [
  '/',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png'
];

// Install event - cache essential assets
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Caching essential assets');
        return cache.addAll(ESSENTIAL_ASSETS);
      })
      .catch((error) => {
        console.log('Failed to cache assets:', error);
      })
      .finally(() => {
        self.skipWaiting();
      })
  );
});

// Activate event - take control immediately
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(
    // Clean up old caches
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()).then(() => {
      // Start scheduling check-in reminders when service worker activates
      scheduleCheckInReminder();
    })
  );
});

// Fetch event - minimal offline support for essential assets only
self.addEventListener('fetch', (event) => {
  // Only handle GET requests for essential assets
  if (event.request.method !== 'GET') {
    return;
  }

  // Check if it's an essential asset
  const url = new URL(event.request.url);
  const isEssentialAsset = ESSENTIAL_ASSETS.some(asset => 
    url.pathname === asset || url.pathname.includes('icon-')
  );

  if (isEssentialAsset) {
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          // Return cached version or fetch from network
          return response || fetch(event.request);
        })
        .catch(() => {
          // Offline fallback for root path
          if (url.pathname === '/') {
            return new Response(
              '<html><body><h1>HRMS Offline</h1><p>Please check your internet connection</p></body></html>',
              { headers: { 'Content-Type': 'text/html' } }
            );
          }
        })
    );
  }
  // All other requests pass through naturally to prevent masking network errors
});

// Push notification handler
self.addEventListener('push', (event) => {
  console.log('Push notification received:', event);
  
  let notificationData = {
    title: 'HRMS Notification',
    body: 'You have a new notification',
    icon: '/icon.svg',
    badge: '/icon.svg',
    tag: 'hrms-notification',
    requireInteraction: true
  };

  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = {
        ...notificationData,
        ...data,
        actions: data.actions || []
      };
    } catch (e) {
      console.error('Error parsing push data:', e);
      notificationData.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationData)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  
  event.notification.close();
  
  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if app is already open
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.focus();
            if (urlToOpen !== '/') {
              client.postMessage({ type: 'NAVIGATE', url: urlToOpen });
            }
            return;
          }
        }
        
        // Open new window if app is not open
        if (self.clients.openWindow) {
          return self.clients.openWindow(urlToOpen);
        }
      })
  );
});

// Schedule daily check-in reminder at 9:25 AM
function scheduleCheckInReminder() {
  const now = new Date();
  const target = new Date();
  target.setHours(9, 25, 0, 0); // 9:25 AM
  
  // If it's already past 9:25 AM today, schedule for tomorrow
  if (now > target) {
    target.setDate(target.getDate() + 1);
  }
  
  const timeUntilReminder = target.getTime() - now.getTime();
  
  setTimeout(() => {
    // Check if it's a weekday (Monday = 1, Sunday = 0)
    const day = new Date().getDay();
    if (day >= 1 && day <= 5) { // Monday to Friday
      self.registration.showNotification('Check-in Reminder', {
        body: 'Don\'t forget to check in for work today!',
        icon: '/icon.svg',
        badge: '/icon.svg',
        tag: 'checkin-reminder',
        requireInteraction: true,
        actions: [
          {
            action: 'checkin',
            title: 'Check In Now'
          },
          {
            action: 'dismiss',
            title: 'Dismiss'
          }
        ],
        data: { url: '/dashboard' }
      });
    }
    
    // Schedule next reminder (24 hours later)
    scheduleCheckInReminder();
  }, timeUntilReminder);
}


// Handle background sync
self.addEventListener('sync', (event) => {
  console.log('Background sync triggered:', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Perform background tasks here
      fetch('/api/sync-data').catch(() => {
        console.log('Background sync failed, will retry later');
      })
    );
  }
});

// Message handler for communication with main app
self.addEventListener('message', (event) => {
  console.log('Service Worker received message:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, body, data } = event.data;
    self.registration.showNotification(title, {
      body,
      icon: '/icon.svg',
      badge: '/icon.svg',
      tag: 'app-notification',
      data
    });
  }
}); 