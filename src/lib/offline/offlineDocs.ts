// Guías PDF disponibles sin internet (Cache Storage del navegador, compartida con public/sw.js).
//
// Las guías de especialidades están en scouts.org.ve, que no permite mostrarlas dentro
// de otra web (X-Frame-Options) ni descargarlas desde ella (sin CORS). En producción se
// piden a través de /asv-pdf/..., que vercel.json reenvía a scouts.org.ve: así quedan en
// nuestro dominio y se pueden ver en el visor y guardar offline.

declare const __DEV__: boolean;

export const DOCS_CACHE = 'scoutplan-docs-v1';
const ASV_UPLOADS = 'https://scouts.org.ve/wp-content/uploads/';

const hasCacheApi = () => typeof window !== 'undefined' && 'caches' in window;

/** URL a usar dentro de la app (proxy propio para las guías de scouts.org.ve). */
export function appPdfUrl(url: string): string {
  if (!url) return url;
  const isDev = typeof __DEV__ !== 'undefined' && __DEV__;
  if (!isDev && url.startsWith(ASV_UPLOADS)) {
    return '/asv-pdf/' + url.slice(ASV_UPLOADS.length);
  }
  return url;
}

function absolute(url: string): string {
  try {
    return new URL(appPdfUrl(url), window.location.origin).href;
  } catch {
    return url;
  }
}

/** Ids de las guías ya descargadas (según la URL). */
export async function getOfflineDocUrls(): Promise<Set<string>> {
  if (!hasCacheApi()) return new Set();
  try {
    const cache = await caches.open(DOCS_CACHE);
    const keys = await cache.keys();
    return new Set(keys.map(k => k.url));
  } catch {
    return new Set();
  }
}

export function isDocOffline(saved: Set<string>, url: string): boolean {
  return saved.has(absolute(url));
}

/** Pide al navegador no borrar lo descargado si el teléfono se queda sin espacio. */
async function requestPersistence() {
  try {
    const nav: any = navigator;
    if (nav.storage?.persist && !(await nav.storage.persisted?.())) await nav.storage.persist();
  } catch {}
}

export async function saveDocOffline(url: string): Promise<void> {
  if (!hasCacheApi()) throw new Error('Este navegador no permite guardar guías sin conexión.');
  const target = absolute(url);
  const res = await fetch(target, { cache: 'no-cache' });
  const type = res.headers.get('content-type') || '';
  if (!res.ok || !type.includes('pdf')) {
    throw new Error(`No se pudo descargar la guía (${res.status}).`);
  }
  const cache = await caches.open(DOCS_CACHE);
  await cache.put(target, res);
  requestPersistence();
}

export async function removeDocOffline(url: string): Promise<void> {
  if (!hasCacheApi()) return;
  const cache = await caches.open(DOCS_CACHE);
  await cache.delete(absolute(url));
}

/**
 * Descarga varias guías de a una (para no saturar datos móviles).
 * Devuelve cuántas quedaron guardadas y cuáles fallaron.
 */
export async function saveDocsOffline(
  urls: string[],
  onProgress?: (done: number, total: number) => void,
  shouldStop?: () => boolean
): Promise<{ saved: number; failed: string[] }> {
  const already = await getOfflineDocUrls();
  const pending = [...new Set(urls)].filter(u => !already.has(absolute(u)));
  const failed: string[] = [];
  let saved = 0;
  onProgress?.(0, pending.length);
  for (let i = 0; i < pending.length; i++) {
    if (shouldStop?.()) break;
    try {
      await saveDocOffline(pending[i]);
      saved++;
    } catch {
      failed.push(pending[i]);
    }
    onProgress?.(i + 1, pending.length);
  }
  return { saved, failed };
}

export async function getStorageEstimate(): Promise<{ usedMb: number; quotaMb: number } | null> {
  try {
    const est = await (navigator as any).storage?.estimate?.();
    if (!est) return null;
    return { usedMb: (est.usage || 0) / 1048576, quotaMb: (est.quota || 0) / 1048576 };
  } catch {
    return null;
  }
}
