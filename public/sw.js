// Service Worker para Plan Progresivo Scout (PWA 100% Offline & Standalone)
const CACHE_NAME = 'scoutplan-pwa-v6';

const CORE_STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.png',
  '/favicon.ico',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
  '/programa_assets/asv_header.png',
  '/programa_assets/asv_watermark.png',
  '/programa_assets/logo_caminantes.png',
  '/programa_assets/logo_manada.jpg',
  '/programa_assets/logo_tropa.png',
  '/programa_assets/logo_clan.jpg',
  '/programa_assets/logo_scout.png',
  '/programa_assets/orion.png',
  '/programa_assets/registro_2026.png'
];

// 1. Instalación: Precarga todos los recursos esenciales
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      console.log('[SW] Precargando assets esenciales offline...');
      for (const asset of CORE_STATIC_ASSETS) {
        try {
          await cache.add(asset);
        } catch (err) {
          console.warn('[SW] Aviso precargando:', asset, err);
        }
      }
    })
  );
  self.skipWaiting();
});

// 2. Activación: Limpia cachés antiguas
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[SW] Eliminando caché antigua:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 3. Interceptor de Peticiones (Estrategia Offline Robusta)
self.addEventListener('fetch', (event) => {
  const request = event.request;
  
  // Solo manejar peticiones GET
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // A. Peticiones a Supabase API: Red primero con fallback offline controlado
  if (url.hostname.includes('supabase.co')) {
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(JSON.stringify({ offline: true, data: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }

  // B. Navegación de páginas (SPA): Si no hay internet, entregar siempre index.html
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return networkResponse;
        })
        .catch(async () => {
          console.log('[SW] Modo offline: entregando index.html para navegación');
          const cache = await caches.open(CACHE_NAME);
          const cachedIndex = await cache.match('/index.html');
          if (cachedIndex) return cachedIndex;
          const cachedRoot = await cache.match('/');
          if (cachedRoot) return cachedRoot;
          return new Response('Offline - Plan Progresivo Scout', { status: 200, headers: { 'Content-Type': 'text/html' } });
        })
    );
    return;
  }

  // C. Bundles de JavaScript, CSS, Fuentes e Imágenes (Stale-While-Revalidate & Cache-First)
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      // Si está en caché, devolver de inmediato (0ms de carga)
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return networkResponse;
        })
        .catch(() => {
          // Si falla la red y no estaba en caché, fallback a placeholder si es imagen
          if (request.destination === 'image') {
            return caches.match('/favicon.png');
          }
        });

      return cachedResponse || fetchPromise;
    })
  );
});
