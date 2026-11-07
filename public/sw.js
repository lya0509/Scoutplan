// Service Worker de Plan Progresivo Scout (PWA offline)
//
// - Al compilar (`npm run build:web` → scripts/build-sw.js) se inyecta la lista de
//   archivos de la app (JS, imágenes, plantillas .docx/.pdf) y un BUILD_ID. Así todo
//   lo necesario para trabajar sin internet queda descargado desde la primera visita.
// - Las guías PDF van en su propia caché (DOCS_CACHE), que NO se borra al actualizar.
// - Las llamadas a Supabase NO se interceptan: si no hay red, la app recibe el error
//   y usa su copia local (ver src/lib/offline/). Inventar respuestas aquí la confundía.

const BUILD_ID = '__BUILD_ID__';
const PRECACHE = self.__PRECACHE__ || [];
const IS_DEV = BUILD_ID.indexOf('__') === 0; // sw.js sin procesar (expo start)

const APP_CACHE = 'scoutplan-app-' + BUILD_ID;
const DOCS_CACHE = 'scoutplan-docs-v1';
const RUNTIME_CACHE = 'scoutplan-runtime-v1';
const RUNTIME_MAX_ENTRIES = 80;

const DOC_PATH = /^\/(documentos|asv-pdf)\//;

// 1. Instalación: descargar la app completa
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(APP_CACHE);
    const urls = ['/', '/index.html', ...PRECACHE];
    // De a pocos y tolerando fallos: un archivo que falle no debe impedir la instalación
    const BATCH = 6;
    for (let i = 0; i < urls.length; i += BATCH) {
      await Promise.all(urls.slice(i, i + BATCH).map(async (url) => {
        try {
          const res = await fetch(url, { cache: 'reload' });
          if (res && res.ok) await cache.put(url, res);
        } catch (err) {
          console.warn('[SW] No se pudo pre-descargar', url, err);
        }
      }));
    }
  })());
  self.skipWaiting();
});

// 2. Activación: borrar versiones viejas de la app (las guías descargadas se conservan)
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.map((name) => {
      const isOldApp = (name.startsWith('scoutplan-app-') && name !== APP_CACHE) || name.startsWith('scoutplan-pwa-');
      return isOldApp ? caches.delete(name) : undefined;
    }));
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

async function trimCache(name, max) {
  const cache = await caches.open(name);
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i]);
}

async function cacheFirst(request, cacheName, { allowOpaque = false } = {}) {
  const cached = await caches.match(request, { ignoreSearch: false });
  if (cached) return cached;
  const res = await fetch(request);
  if (res && (res.ok || (allowOpaque && res.type === 'opaque'))) {
    const cache = await caches.open(cacheName);
    cache.put(request, res.clone()).then(() => trimCache(RUNTIME_CACHE, RUNTIME_MAX_ENTRIES)).catch(() => {});
  }
  return res;
}

// 3. Peticiones
self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  // A. Otros dominios
  if (url.origin !== self.location.origin) {
    // Fotos públicas de Supabase Storage (avatares, certificados, firmas). Se guardan solo
    // respuestas legibles (CORS) para que sirvan tanto a <img> como a la exportación a Word.
    const isStorageFile = url.hostname.endsWith('supabase.co') && url.pathname.includes('/storage/v1/object/public/');
    if (isStorageFile) {
      event.respondWith((async () => {
        const cached = await caches.match(request.url, { ignoreVary: true });
        if (cached) return cached;
        const res = await fetch(request);
        if (res && res.ok && res.type !== 'opaque') {
          const cache = await caches.open(RUNTIME_CACHE);
          cache.put(request.url, res.clone()).then(() => trimCache(RUNTIME_CACHE, RUNTIME_MAX_ENTRIES)).catch(() => {});
        }
        return res;
      })().catch(() => caches.match(request.url, { ignoreVary: true }).then(r => r || new Response('', { status: 504 }))));
      return;
    }
    // QR del carnet (imagen sin CORS)
    if (url.hostname === 'api.qrserver.com' && request.destination === 'image') {
      event.respondWith(cacheFirst(request, RUNTIME_CACHE, { allowOpaque: true }).catch(() => caches.match(request)));
    }
    // El resto (API de Supabase, realtime, YouTube...) va directo a la red
    return;
  }

  if (url.pathname.startsWith('/api/')) return;

  // B. Guías PDF: si están descargadas se abren sin internet (también dentro del visor/iframe)
  if (DOC_PATH.test(url.pathname)) {
    event.respondWith((async () => {
      const docs = await caches.open(DOCS_CACHE);
      const cached = await docs.match(request.url, { ignoreSearch: true });
      if (cached) return cached;
      try {
        const res = await fetch(request);
        // Lo que se abre una vez queda guardado para la próxima
        if (res && res.ok && (res.headers.get('content-type') || '').includes('pdf')) {
          docs.put(request.url, res.clone()).catch(() => {});
        }
        return res;
      } catch (err) {
        return new Response(
          '<!DOCTYPE html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width">' +
          '<body style="font-family:system-ui;padding:24px;color:#374151;text-align:center">' +
          '<p style="font-size:40px;margin:0">📄</p><h3>Esta guía no está descargada</h3>' +
          '<p>Conéctate a internet y ábrela una vez, o usa «Descargar para usar sin internet».</p></body></html>',
          { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        );
      }
    })());
    return;
  }

  // C. Navegación (abrir la app o recargar): red con tiempo límite, si no la copia guardada
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 3000);
        const res = await fetch(request, { signal: controller.signal });
        clearTimeout(timer);
        if (res && res.ok && !IS_DEV) {
          const cache = await caches.open(APP_CACHE);
          cache.put('/index.html', res.clone()).catch(() => {});
        }
        return res;
      } catch (err) {
        const cached = (await caches.match('/index.html')) || (await caches.match('/'));
        if (cached) return cached;
        return new Response('<!DOCTYPE html><html><body><p>Plan Progresivo: abre la app una vez con internet para usarla sin conexión.</p></body></html>', {
          headers: { 'Content-Type': 'text/html; charset=utf-8' }
        });
      }
    })());
    return;
  }

  // D. En desarrollo (expo start) siempre red primero, para no ver código viejo
  if (IS_DEV) {
    event.respondWith(fetch(request).catch(() => caches.match(request)));
    return;
  }

  // E. Archivos de la app (JS con hash, imágenes, plantillas): caché primero
  event.respondWith((async () => {
    const cached = await caches.match(request, { ignoreSearch: true });
    if (cached) return cached;
    try {
      const res = await fetch(request);
      if (res && res.ok) {
        const cache = await caches.open(RUNTIME_CACHE);
        cache.put(request, res.clone()).then(() => trimCache(RUNTIME_CACHE, RUNTIME_MAX_ENTRIES)).catch(() => {});
      }
      return res;
    } catch (err) {
      if (request.destination === 'image') {
        const fallback = await caches.match('/favicon.png');
        if (fallback) return fallback;
      }
      return new Response('', { status: 504, statusText: 'Sin conexión' });
    }
  })());
});

// 4. Notificaciones Web Push en segundo plano (app cerrada / pantalla bloqueada)
self.addEventListener('push', (event) => {
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

// 5. Toque en la notificación
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  // Solo se abren rutas de la propia app: un push no puede llevar a otro sitio.
  let targetUrl = '/';
  try {
    const parsed = new URL(event.notification.data?.url || '/', self.location.origin);
    if (parsed.origin === self.location.origin) {
      targetUrl = parsed.pathname + parsed.search + parsed.hash;
    }
  } catch (err) {}

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
