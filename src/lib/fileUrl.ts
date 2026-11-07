// Archivos del bucket privado `scout-files` (fotos de perfil, certificados, firmas,
// comprobantes). En la base de datos se sigue guardando la dirección "pública" de siempre,
// pero ya no se puede abrir directamente: hay que pedir un enlace temporal firmado, y eso
// solo funciona con la sesión iniciada. Así nada se ve sin iniciar sesión.
//
// - resolveFileUrl(url): devuelve un enlace firmado (1 h). Cualquier otra dirección
//   (assets de la app, data:, sitios externos) pasa igual.
// - Sin internet devuelve el último enlace firmado (o el original): el service worker
//   guarda cada archivo por su ruta sin el token, así que la copia local sigue sirviendo.

import { supabase } from './supabaseClient';

const BUCKET = 'scout-files';
const MARKERS = [`/storage/v1/object/public/${BUCKET}/`, `/storage/v1/object/sign/${BUCKET}/`];
const TTL_SECONDS = 3600;
const RENEW_MARGIN_MS = 5 * 60 * 1000;
const PERSIST_KEY = '@scout_signed_urls_v1';
const MAX_PERSISTED = 300;

type Entry = { url: string; exp: number };
const memory = new Map<string, Entry>();
const inflight = new Map<string, Promise<string>>();
let loaded = false;

function loadPersisted() {
  if (loaded) return;
  loaded = true;
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(PERSIST_KEY) : null;
    if (raw) Object.entries(JSON.parse(raw) as Record<string, Entry>).forEach(([k, v]) => memory.set(k, v));
  } catch {}
}

function persist() {
  try {
    if (typeof localStorage === 'undefined') return;
    const entries = [...memory.entries()].sort((a, b) => b[1].exp - a[1].exp).slice(0, MAX_PERSISTED);
    localStorage.setItem(PERSIST_KEY, JSON.stringify(Object.fromEntries(entries)));
  } catch {}
}

/** Ruta dentro del bucket si la dirección es de scout-files; null si no lo es. */
export function storagePath(url?: string | null): string | null {
  if (!url || typeof url !== 'string') return null;
  for (const m of MARKERS) {
    const i = url.indexOf(m);
    if (i >= 0) {
      try {
        return decodeURIComponent(url.slice(i + m.length).split('?')[0]);
      } catch {
        return url.slice(i + m.length).split('?')[0];
      }
    }
  }
  return null;
}

/** Enlace firmado vigente que ya esté en memoria (sin pedir nada a la red). */
export function peekFileUrl(url?: string | null): string | null {
  const path = storagePath(url);
  if (!path) return url || null;
  loadPersisted();
  const hit = memory.get(path);
  return hit && hit.exp - RENEW_MARGIN_MS > Date.now() ? hit.url : null;
}

export async function resolveFileUrl(url?: string | null): Promise<string> {
  const path = storagePath(url);
  if (!path) return url || '';
  loadPersisted();
  const hit = memory.get(path);
  if (hit && hit.exp - RENEW_MARGIN_MS > Date.now()) return hit.url;
  if (inflight.has(path)) return inflight.get(path)!;

  const job = (async () => {
    try {
      const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, TTL_SECONDS);
      if (!error && data?.signedUrl) {
        memory.set(path, { url: data.signedUrl, exp: Date.now() + TTL_SECONDS * 1000 });
        persist();
        return data.signedUrl;
      }
    } catch {}
    // Sin red o sin permiso: el último enlace conocido o el original (el SW tiene la copia)
    return hit?.url || (url as string);
  })();
  inflight.set(path, job);
  try {
    return await job;
  } finally {
    inflight.delete(path);
  }
}

/** Abre un archivo en otra pestaña. La pestaña se abre antes de esperar al enlace para que el navegador no la bloquee. */
export async function openFileUrl(url: string) {
  if (typeof window !== 'undefined' && typeof window.open === 'function') {
    const win = window.open('', '_blank');
    const signed = await resolveFileUrl(url);
    if (win) {
      try { win.opener = null; } catch {}
      win.location.href = signed;
    } else {
      window.location.href = signed;
    }
    return;
  }
  const { Linking } = await import('react-native');
  Linking.openURL(await resolveFileUrl(url)).catch(() => {});
}

/** Al cerrar sesión: olvidar enlaces firmados y borrar del teléfono las copias de archivos privados. */
export async function clearFileCache() {
  memory.clear();
  inflight.clear();
  try { if (typeof localStorage !== 'undefined') localStorage.removeItem(PERSIST_KEY); } catch {}
  try {
    if (typeof caches === 'undefined') return;
    for (const name of await caches.keys()) {
      const cache = await caches.open(name);
      for (const req of await cache.keys()) {
        if (req.url.includes('/storage/v1/object/')) await cache.delete(req);
      }
    }
  } catch {}
}
