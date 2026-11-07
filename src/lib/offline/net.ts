// Utilidades de conectividad para el modo offline.
//
// OJO: supabase-js NO lanza excepción cuando no hay red. Devuelve
// { data: null, error: { message: 'TypeError: Failed to fetch', code: '' } }.
// Por eso todo acceso a datos debe revisar `error` (usar `must()`), no solo try/catch.

const NETWORK_PATTERNS = /failed to fetch|networkerror|network request failed|load failed|fetch failed|network error|err_internet_disconnected|err_network|aborted|aborterror|timeout|timed out|offline/i;
// Sesión vencida mientras no había red: al volver la conexión se renueva sola, así que se reintenta.
const AUTH_RETRY_PATTERNS = /jwt expired|invalid jwt|refresh token|auth session missing|pgrst301|pgrst303/i;

export function isOnline(): boolean {
  if (typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean') {
    return navigator.onLine;
  }
  return true;
}

export function isNetworkError(err: any): boolean {
  if (!err) return false;
  if (!isOnline()) return true;
  if (err.name === 'OfflineError') return true;
  const text = `${err.name || ''} ${err.message || ''} ${err.details || ''} ${err.code || ''}`;
  if (NETWORK_PATTERNS.test(text)) return true;
  // postgrest-js marca los fallos de fetch con status 0
  if (err.status === 0) return true;
  return false;
}

/** Errores que no son culpa de los datos: se puede reintentar más tarde sin perder nada. */
export function isRetryableError(err: any): boolean {
  if (isNetworkError(err)) return true;
  const text = `${err?.message || ''} ${err?.code || ''}`;
  return AUTH_RETRY_PATTERNS.test(text);
}

export class OfflineError extends Error {
  constructor(message = 'Sin conexión a internet') {
    super(message);
    this.name = 'OfflineError';
  }
}

/** Desenvuelve una respuesta de supabase-js lanzando el error si lo hay. */
export function must<T>(res: { data: T; error: any }): T {
  if (res.error) throw res.error;
  return res.data;
}

/** Código de Postgres para "ya existe": al reintentar un insert que sí llegó, se toma como éxito. */
export function isDuplicateError(err: any): boolean {
  return err?.code === '23505' || /duplicate key/i.test(err?.message || '');
}

export function onConnectivityChange(cb: (online: boolean) => void): () => void {
  if (typeof window === 'undefined' || !window.addEventListener) return () => {};
  const on = () => cb(true);
  const off = () => cb(false);
  window.addEventListener('online', on);
  window.addEventListener('offline', off);
  return () => {
    window.removeEventListener('online', on);
    window.removeEventListener('offline', off);
  };
}

export function newId(prefix = ''): string {
  const c: any = typeof globalThis !== 'undefined' ? (globalThis as any).crypto : undefined;
  if (c?.randomUUID) return prefix ? `${prefix}${c.randomUUID()}` : c.randomUUID();
  const rnd = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, ch => {
    const r = (Math.random() * 16) | 0;
    return (ch === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
  return prefix ? `${prefix}${rnd}` : rnd;
}
