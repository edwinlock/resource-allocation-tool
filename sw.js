const CACHE_NAME = 'resource-allocation-v31';
const urlsToCache = [
  './',
  './index.html',
  './sessiondetail.html',
  './session-json.html',
  './slider.html',
  './survey.html',
  './thanks.html',
  './help.html',
  './manifest.json',
  './schools.json',
  './css/slider.css',
  './css/shared-styles.css',
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
  './js/modules/scenario-loader.js',
  './surveys/surveyChild.json',
  './surveys/surveyTreatment.json',
  './surveys/surveyControl.json',
  './surveys/surveyExit.json',
  './surveys/surveySandwich.json',
  './surveys/raven/mat1.png',
  './surveys/raven/mat2.png',
  './surveys/raven/mat3.png',
  './surveys/raven/mat4.png',
  './surveys/raven/mat5.png',
  './surveys/raven/mat6.png',
  './surveys/raven/mat7.png',
  './surveys/raven/mat8.png',
  './surveys/raven/mat9.png',
  './surveys/raven/mat10.png',
  './surveys/raven/mat11.png',
  './surveys/raven/mat12.png',
  './scenarios/scenarios.json',
  './scenarios/scenarios-dummy.json',
  './guides/enumerator_guide.html',
  './guides/enumerator_guide_files/libs/bootstrap/bootstrap-d6a003b94517c951b2d65075d42fb01b.min.css',
  './guides/enumerator_guide_files/libs/bootstrap/bootstrap-icons.css',
  './guides/enumerator_guide_files/libs/bootstrap/bootstrap-icons.woff',
  './guides/enumerator_guide_files/libs/bootstrap/bootstrap.min.js',
  './guides/enumerator_guide_files/libs/clipboard/clipboard.min.js',
  './guides/enumerator_guide_files/libs/quarto-html/anchor.min.js',
  './guides/enumerator_guide_files/libs/quarto-html/axe/axe-check.js',
  './guides/enumerator_guide_files/libs/quarto-html/popper.min.js',
  './guides/enumerator_guide_files/libs/quarto-html/quarto-syntax-highlighting-dc55a5b9e770e841cd82e46aadbfb9b0.css',
  './guides/enumerator_guide_files/libs/quarto-html/quarto.js',
  './guides/enumerator_guide_files/libs/quarto-html/tabsets/tabsets.js',
  './guides/enumerator_guide_files/libs/quarto-html/tippy.css',
  './guides/enumerator_guide_files/libs/quarto-html/tippy.umd.min.js',
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
    // Cache-first strategy for all resources (offline-first)
    // For HTML files, ignore query parameters when matching
    caches.match(event.request, { ignoreSearch: true }).then(response => {
      if (response) {
        // Return cached version immediately
        return response;
      }

      // Not in cache, fetch from network
      return fetch(event.request).then(fetchResponse => {
        // Cache the new response for future use
        const responseClone = fetchResponse.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseClone);
        });
        return fetchResponse;
      }).catch(() => {
        return new Response('Resource not available', {
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