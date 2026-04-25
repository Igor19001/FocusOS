/* ═══════════════════════════════════════════════════════════════
   FocusOS — sw.js
   Service Worker: cache-first strategia offline
   ═══════════════════════════════════════════════════════════════ */

   const CACHE_NAME   = 'focusos-v1.0';
   const CACHE_STATIC = [
     '/',
     '/index.html',
     '/style.css',
     '/app.js',
     '/db.js',
     '/math.js',
     '/manifest.json',
     '/icons/icon.svg',
     '/icons/icon-192.png',
     '/icons/icon-512.png',
   ];
   
   /* ── Instalacja: zapisz zasoby lokalne ──────────────────────── */
   self.addEventListener('install', (event) => {
     event.waitUntil(
       caches.open(CACHE_NAME).then((cache) => {
         return cache.addAll(CACHE_STATIC).catch((err) => {
           // Nie blokuj instalacji jeśli PNG-iki jeszcze nie istnieją
           console.warn('[SW] Pominięto niektóre zasoby podczas instalacji:', err);
         });
       })
     );
     self.skipWaiting();
   });
   
   /* ── Aktywacja: usuń stare cache ────────────────────────────── */
   self.addEventListener('activate', (event) => {
     event.waitUntil(
       caches.keys().then((keys) =>
         Promise.all(
           keys
             .filter((k) => k !== CACHE_NAME)
             .map((k) => caches.delete(k))
         )
       )
     );
     self.clients.claim();
   });
   
   /* ── Fetch: cache-first dla lokalnych, sieć dla CDN ─────────── */
   self.addEventListener('fetch', (event) => {
     const { request } = event;
   
     // Tylko GET
     if (request.method !== 'GET') return;
   
     const url = new URL(request.url);
     const isLocal = url.origin === self.location.origin;
   
     if (isLocal) {
       // Cache-first: najpierw cache, potem sieć (i zapisz do cache)
       event.respondWith(
         caches.match(request).then((cached) => {
           if (cached) return cached;
           return fetch(request).then((response) => {
             if (!response || response.status !== 200) return response;
             const clone = response.clone();
             caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
             return response;
           });
         })
       );
     } else {
       // Network-first dla zewnętrznych zasobów (fonty, CDN)
       event.respondWith(
         fetch(request).catch(() => caches.match(request))
       );
     }
   });