const CACHE_NAME = 'hrms-v3';
const STATIC_CACHE_NAME = 'hrms-static-v3';
const DYNAMIC_CACHE_NAME = 'hrms-dynamic-v3';

// Static assets to cache
const staticAssets = [
  '/',
  '/manifest.json',
  '/icon.svg'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        return Promise.allSettled(
          staticAssets.map(url => 
            cache.add(url).catch(err => {
              console.log(`Failed to cache ${url}:`, err);
              return null;
            })
          )
        );
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (
            cacheName !== STATIC_CACHE_NAME &&
            cacheName !== DYNAMIC_CACHE_NAME &&
            cacheName !== CACHE_NAME
          ) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - smart caching strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip caching for development server and API calls
  if (
    url.pathname.includes('/@') || // Vite HMR
    url.pathname.includes('/__') || // Vite internal
    url.pathname.includes('/api/') || // API calls
    url.pathname.endsWith('.js') || // JavaScript modules
    url.pathname.endsWith('.jsx') || // JSX modules
    url.pathname.endsWith('.ts') || // TypeScript modules
    url.pathname.endsWith('.tsx') || // TSX modules
    url.searchParams.has('t') || // Vite cache busting
    request.cache === 'no-cache' ||
    request.method !== 'GET'
  ) {
    // Always fetch from network for these requests
    event.respondWith(fetch(request));
    return;
  }

  // For other requests, try cache first, then network
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          // Return cached response but also fetch and update cache in background
          fetch(request)
            .then(response => {
              if (response.ok) {
                const responseClone = response.clone();
                caches.open(DYNAMIC_CACHE_NAME)
                  .then(cache => cache.put(request, responseClone));
              }
            })
            .catch(() => {}); // Silently handle network errors
          
          return cachedResponse;
        }
        
        // Not in cache, fetch from network
        return fetch(request)
          .then(response => {
            // Only cache successful responses
            if (response.ok && response.status === 200) {
              const responseClone = response.clone();
              
              // Cache non-module assets
              if (
                !request.url.includes('.js') &&
                !request.url.includes('.jsx') &&
                !request.url.includes('.ts') &&
                !request.url.includes('.tsx')
              ) {
                caches.open(DYNAMIC_CACHE_NAME)
                  .then(cache => cache.put(request, responseClone));
              }
            }
            return response;
          })
          .catch((error) => {
            // Handle network errors
            console.log('Fetch failed for:', request.url, error);
            
            // Return offline page for navigation requests
            if (request.destination === 'document') {
              return new Response(
                `<!DOCTYPE html>
                <html>
                <head><title>Offline</title></head>
                <body>
                  <h1>You're offline</h1>
                  <p>Please check your internet connection and try again.</p>
                </body>
                </html>`,
                { 
                  status: 200,
                  headers: { 'Content-Type': 'text/html' }
                }
              );
            }
            throw error;
          });
      })
  );
}); 