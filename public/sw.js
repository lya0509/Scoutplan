// Service Worker para Plan Progresivo Scout (PWA 100% Offline & Standalone)
const CACHE_NAME = 'scoutplan-pwa-v10';

const CORE_STATIC_ASSETS = [
  '/',
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

// 1. Instalación: Precarga HTML, bundles de JavaScript de Expo y assets esenciales
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      console.log('[SW] Instalando Service Worker PWA v10...');
      const cache = await caches.open(CACHE_NAME);

      // A. Pre-cachear página principal y descubrir dinámicamente el bundle JS activo de Expo
      try {
        const rootResponse = await fetch('/', { cache: 'no-cache' });
        if (rootResponse && rootResponse.status === 200) {
          const htmlText = await rootResponse.clone().text();
          // Guardar el HTML bajo / y bajo /index.html
          await cache.put('/', rootResponse.clone());
          await cache.put('/index.html', rootResponse.clone());

          // Extraer los scripts <script src="..."> del HTML para pre-cachear el bundle JS de Expo
          const scriptMatches = [...htmlText.matchAll(/src=["']([^"']+\.js)["']/g)];
          for (const match of scriptMatches) {
            let scriptUrl = match[1];
            if (!scriptUrl.startsWith('http') && !scriptUrl.startsWith('/')) {
              scriptUrl = '/' + scriptUrl;
            }
            try {
              console.log('[SW] Pre-cacheando bundle JS de Expo:', scriptUrl);
              const scriptRes = await fetch(scriptUrl);
              if (scriptRes && scriptRes.status === 200) {
                await cache.put(scriptUrl, scriptRes);
              }
            } catch (scriptErr) {
              console.warn('[SW] No se pudo pre-cachear script:', scriptUrl, scriptErr);
            }
          }
        }
      } catch (e) {
        console.warn('[SW] Error obteniendo root HTML durante install:', e);
      }

      // B. Pre-cachear assets estáticos conocidos
      for (const asset of CORE_STATIC_ASSETS) {
        try {
          const res = await fetch(asset);
          if (res && res.status === 200) {
            await cache.put(asset, res);
          }
        } catch (err) {
          console.warn('[SW] Error pre-cacheando asset:', asset, err);
        }
      }
    })()
  );
  self.skipWaiting();
});

// 2. Activación: Limpia cachés antiguas y toma el control de todos los clientes
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

// 3. Interceptor de Peticiones (Estrategia 100% Offline Garantizada)
self.addEventListener('fetch', (event) => {
  const request = event.request;
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

  // B. Navegación de páginas (SPA): Network con timeout y fallback garantizado al HTML en caché
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(
      (async () => {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 2500);

          const networkResponse = await fetch(request, { signal: controller.signal });
          clearTimeout(timeoutId);

          if (networkResponse && networkResponse.status === 200) {
            const cache = await caches.open(CACHE_NAME);
            cache.put('/', networkResponse.clone());
            cache.put('/index.html', networkResponse.clone());
            cache.put(request, networkResponse.clone());
            return networkResponse;
          }
        } catch (err) {
          console.log('[SW] Sin conexión a internet. Entregando aplicación desde caché offline.');
        }

        // Recuperar HTML de la aplicación desde caché
        const cache = await caches.open(CACHE_NAME);
        const cachedMatch =
          (await cache.match('/index.html')) ||
          (await cache.match('/', { ignoreSearch: true })) ||
          (await cache.match(request, { ignoreSearch: true }));

        if (cachedMatch) return cachedMatch;

        return new Response('<!DOCTYPE html><html><body><p>Plan Progresivo Offline</p></body></html>', {
          headers: { 'Content-Type': 'text/html' }
        });
      })()
    );
    return;
  }

  // C. Bundles de JavaScript, CSS, Fuentes e Imágenes (Cache-First con Stale-While-Revalidate)
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cachedResponse = await cache.match(request, { ignoreSearch: true });

      // Si está en caché, devolver de inmediato (0ms de carga en modo avión / offline)
      if (cachedResponse) {
        // Si hay internet, refrescar silenciosamente en segundo plano
        fetch(request)
          .then((networkRes) => {
            if (networkRes && networkRes.status === 200) {
              cache.put(request, networkRes);
            }
          })
          .catch(() => {});
        return cachedResponse;
      }

      // Si no estaba en caché, buscar en la red y guardar copia
      try {
        const networkResponse = await fetch(request);
        if (networkResponse && networkResponse.status === 200) {
          cache.put(request, networkResponse.clone());
        }
        return networkResponse;
      } catch (networkError) {
        // Fallback para scripts si el hash varió
        if (request.destination === 'script' || url.pathname.endsWith('.js')) {
          const keys = await cache.keys();
          const jsKey = keys.find((k) => k.url.includes('/_expo/static/js/') || k.url.endsWith('.js'));
          if (jsKey) {
            const fallbackJs = await cache.match(jsKey);
            if (fallbackJs) return fallbackJs;
          }
        }
        if (request.destination === 'image') {
          const fallbackImg = await cache.match('/favicon.png');
          if (fallbackImg) return fallbackImg;
        }
        return new Response('', { status: 408, statusText: 'Offline' });
      }
    })()
  );
});

// 4. Receptor de Notificaciones Web Push en Segundo Plano (App Cerrada y Pantalla Bloqueada)
self.addEventListener('push', (event) => {
  console.log('[SW] Evento Push recibido en segundo plano:', event);
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (err) {
      data = {
        title: 'Plan Progresivo Scout ⚜️',
        body: event.data.text()
      };
    }
  }

  const title = data.title || 'Plan Progresivo Scout ⚜️';
  const options = {
    body: data.body || data.message || 'Tienes una nueva actualización en tu Plan Progresivo.',
    icon: data.icon || '/icon-192.png',
    badge: data.badge || '/icon-192.png',
    image: data.image || undefined,
    vibrate: [300, 150, 300, 150, 300],
    tag: data.tag || `scout_push_${Date.now()}`,
    renotify: true,
    requireInteraction: true,
    data: {
      url: data.url || '/',
      id: data.id || null,
      timestamp: Date.now()
    },
    actions: [
      { action: 'open', title: '⚜️ Ver en la App' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// 5. Interacción del Usuario con la Notificación en la Pantalla de Bloqueo
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          if ('navigate' in client && targetUrl !== '/') {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
