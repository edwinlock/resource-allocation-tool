const CACHE_NAME = 'resource-allocation-v3';
const urlsToCache = [
  './',
  './index.html',
  './sessiondetail.html',
  './slider.html',
  './survey.html',
  './manifest.json',
  './css/slider.css',
  './js/slider.js',
  './js/modules/app-state.js',
  './js/modules/chart-factory.js',
  './js/modules/constants.js',
  './js/modules/economic-engine.js',
  './js/modules/sessionDB.js',
  './js/modules/sliderResponseDB.js',
  './js/modules/surveyResponseDB.js',
  './js/modules/session-coordinator.js',
  './js/modules/session-renderer.js',
  './js/modules/shared-utils.js',
  './js/modules/ui-index.js',
  './js/modules/ui-sessiondetail.js',
  './js/modules/ui-slider.js',
  './js/modules/ui-survey.js',
  './js/modules/survey-system.js',
  './js/modules/api-service.js',
  './js/modules/utilities.js',
  './surveyChild.json',
  './surveyTreatment.json',
  './surveyControl.json',
  // External CDN resources for offline fallback
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels',
  'https://unpkg.com/dexie@latest/dist/dexie.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        // Add local files first (more likely to succeed)
        const localFiles = urlsToCache.filter(url => !url.startsWith('http'));
        const cdnFiles = urlsToCache.filter(url => url.startsWith('http'));

        return cache.addAll(localFiles).then(() => {
          // Try to cache CDN resources, but don't fail if they're not available
          return Promise.allSettled(
            cdnFiles.map(url =>
              cache.add(url).catch(err => {
                console.warn(`Failed to cache ${url}:`, err);
                return null;
              })
            )
          );
        });
      })
  );
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
});

self.addEventListener('fetch', event => {
  // Skip cross-origin requests and chrome-extension requests
  if (!event.request.url.startsWith(self.location.origin) &&
      !event.request.url.startsWith('https://cdn.jsdelivr.net') &&
      !event.request.url.startsWith('https://unpkg.com')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // For local files, use cache-first strategy
        if (event.request.url.startsWith(self.location.origin)) {
          if (response) {
            return response;
          }
          return fetch(event.request).then(fetchResponse => {
            // Cache the new response for future use
            const responseClone = fetchResponse.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseClone);
            });
            return fetchResponse;
          });
        }

        // For external resources, try network first, fallback to cache
        return fetch(event.request).then(fetchResponse => {
          const responseClone = fetchResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
          return fetchResponse;
        }).catch(() => {
          // Network failed, use cache if available
          return response || new Response('Resource not available offline', {
            status: 503,
            statusText: 'Service Unavailable'
          });
        });
      })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Take control of all pages immediately
      return self.clients.claim();
    })
  );
});