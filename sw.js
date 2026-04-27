/* FocusOS Service Worker
 * Strategia cache:
 * - Cache First: zasoby statyczne (CSS/JS/ikony/fonty)
 * - Network First: dokumenty i reszta żądań (z fallbackiem offline)
 */

const SW_VERSION = 'focusos-v3';
const STATIC_CACHE = `${SW_VERSION}-static`;
const RUNTIME_CACHE = `${SW_VERSION}-runtime`;
const OFFLINE_URL = '/index.html';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/db.js',
  '/math.js',
  '/manifest.json',
  '/FocusOS/icons/icon-192.png',
  '/FocusOS/icons/icon-512.png',
  '/FocusOS/icons/icon.svg',
];

self.addEventListener('install', (event) => {
  // Precache najważniejszych plików, aby aplikacja uruchamiała się offline.
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Usuwamy stare cache po zmianie wersji SW.
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE && key !== RUNTIME_CACHE)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

function isCacheFirstAsset(request) {
  const url = new URL(request.url);
  const pathname = url.pathname.toLowerCase();
  return (
    pathname.endsWith('.css') ||
    pathname.endsWith('.js') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.jpg') ||
    pathname.endsWith('.jpeg') ||
    pathname.endsWith('.svg') ||
    pathname.endsWith('.webp') ||
    pathname.endsWith('.woff') ||
    pathname.endsWith('.woff2') ||
    pathname.includes('/icons/')
  );
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  const cache = await caches.open(STATIC_CACHE);
  cache.put(request, response.clone());
  return response;
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    const cache = await caches.open(RUNTIME_CACHE);
    cache.put(request, response.clone());
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) return cached;

    // Fallback offline dla dokumentów HTML.
    if (request.mode === 'navigate') {
      return caches.match(OFFLINE_URL);
    }

    return new Response('Offline', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  if (isCacheFirstAsset(request)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  event.respondWith(networkFirst(request));
});
