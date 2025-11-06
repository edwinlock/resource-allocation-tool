const CACHE_NAME = 'resource-allocation-v65';
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
  './css/pages.css',
  './js/config.js',
  './js/slider.js',
  './js/modules/app-state.js',
  './js/modules/chart-factory.js',
  './js/modules/constants.js',
  './js/modules/economic-engine.js',
  './js/modules/error-handler.js',
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
  './surveys/AI_course_seekable.mp4',
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
  './scenarios/scenarios-dummy-2.json',
  // Video files for instructions (add video files here as needed)
  // './videos/instructions.mp4',
  // './videos/practice-instructions.mp4',
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

// Helper function to handle Range requests for video files
async function handleRangeRequest(request, cachedResponse) {
  const rangeHeader = request.headers.get('Range');

  if (!rangeHeader) {
    // No range request, return full cached response
    return cachedResponse;
  }

  // Parse the range header (e.g., "bytes=0-1023")
  const rangeMatch = rangeHeader.match(/bytes=(\d+)-(\d*)/);
  if (!rangeMatch) {
    return cachedResponse;
  }

  const start = parseInt(rangeMatch[1], 10);
  const cachedBlob = await cachedResponse.blob();
  const totalSize = cachedBlob.size;

  // If end is not specified, use the total size
  const end = rangeMatch[2] ? parseInt(rangeMatch[2], 10) : totalSize - 1;

  // Validate range
  if (start >= totalSize || end >= totalSize || start > end) {
    return new Response(null, {
      status: 416,
      statusText: 'Range Not Satisfiable',
      headers: {
        'Content-Range': `bytes */${totalSize}`
      }
    });
  }

  // Slice the blob to get the requested range
  const slicedBlob = cachedBlob.slice(start, end + 1);
  const contentLength = end - start + 1;

  // Return 206 Partial Content response
  return new Response(slicedBlob, {
    status: 206,
    statusText: 'Partial Content',
    headers: {
      'Content-Type': cachedResponse.headers.get('Content-Type') || 'video/mp4',
      'Content-Length': contentLength.toString(),
      'Content-Range': `bytes ${start}-${end}/${totalSize}`,
      'Accept-Ranges': 'bytes'
    }
  });
}

self.addEventListener('fetch', event => {
  // Skip cross-origin requests and chrome-extension requests
  if (!event.request.url.startsWith(self.location.origin) &&
      !event.request.url.startsWith('https://cdn.jsdelivr.net') &&
      !event.request.url.startsWith('https://unpkg.com')) {
    return;
  }

  // Check if this is a request for a video file
  const isVideoRequest = event.request.url.endsWith('.mp4') ||
                         event.request.url.endsWith('.webm') ||
                         event.request.url.endsWith('.ogg');

  event.respondWith(
    (async () => {
      // Cache-first strategy for all resources (offline-first)
      // For all requests, ignore query parameters when matching (important for PWA navigation)
      const cachedResponse = await caches.match(event.request, { ignoreSearch: true });

      if (cachedResponse) {
        // For video files, handle Range requests
        if (isVideoRequest && event.request.headers.has('Range')) {
          return handleRangeRequest(event.request, cachedResponse);
        }
        // Return cached version immediately
        return cachedResponse;
      }

      // Not in cache, try exact match (for URLs with query params that were cached with params)
      const exactResponse = await caches.match(event.request);
      if (exactResponse) {
        if (isVideoRequest && event.request.headers.has('Range')) {
          return handleRangeRequest(event.request, exactResponse);
        }
        return exactResponse;
      }

      // Not in cache at all, fetch from network
      try {
        const fetchResponse = await fetch(event.request);
        // Cache the new response for future use (only if successful)
        if (fetchResponse.ok) {
          const responseClone = fetchResponse.clone();
          const cache = await caches.open(CACHE_NAME);
          cache.put(event.request, responseClone);
        }
        return fetchResponse;
      } catch (error) {
        return new Response('Resource not available', {
          status: 503,
          statusText: 'Service Unavailable'
        });
      }
    })()
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