import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, AuthRetryableFetchError } from '@supabase/supabase-js';

if (Platform.OS !== 'web') {
  require('react-native-url-polyfill/auto');
}

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

const REQUEST_TIMEOUT_MS = 20000;
/** Tras un fallo de red, cuánto tiempo se da por caído el servidor para las lecturas. */
const UNREACHABLE_COOLDOWN_MS = 15000;

let unreachableUntil = 0;

function offlineError(message: string) {
  const err: any = new Error(message);
  err.name = 'AbortError';
  return err;
}

/** fetch rechaza con TypeError cuando no llega al servidor (sin DNS, Wi-Fi sin internet…). */
function isFetchNetworkFailure(err: any) {
  return err?.name === 'TypeError';
}

/**
 * fetch para Supabase pensado para trabajar sin internet:
 * - Sin red (navigator.onLine === false) falla AL INSTANTE con AbortError. postgrest-js
 *   reintenta 3 veces los GET que fallan por red (1 s + 2 s + 4 s); con AbortError no
 *   reintenta, así las pantallas pasan enseguida a la copia guardada en el teléfono.
 * - "Conectado pero sin internet" (Wi-Fi sin salida, servidor caído): navigator.onLine
 *   sigue en true. Después del primer fallo de red, las lecturas de los siguientes 15 s
 *   fallan al instante en vez de esperar 7 s de reintentos cada una (el Inicio se quedaba
 *   cargando). Cualquier respuesta del servidor quita el bloqueo.
 * - Con señal muy mala, corta la petición a los 20 s para no dejar la pantalla cargando.
 */
const offlineAwareFetch: typeof fetch = (input: any, init: any = {}) => {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return Promise.reject(offlineError('Sin conexión a internet (offline)'));
  }
  // Solo lecturas: una subida (foto, certificado) con señal lenta no se debe cortar
  const method = String(init.method || 'GET').toUpperCase();
  const isRead = method === 'GET' || method === 'HEAD';
  if (isRead && Date.now() < unreachableUntil) {
    return Promise.reject(offlineError('Servidor no disponible (sin internet)'));
  }

  // Una cancelación pedida por la propia app (init.signal) no cuenta como servidor caído;
  // nuestro corte por tiempo sí.
  const track = (p: Promise<Response>, timedOut: () => boolean = () => false) => p.then(
    res => { unreachableUntil = 0; return res; },
    err => {
      if (isFetchNetworkFailure(err) || timedOut()) unreachableUntil = Date.now() + UNREACHABLE_COOLDOWN_MS;
      throw err;
    },
  );

  if (!isRead || init.signal || typeof AbortController === 'undefined') return track(fetch(input, init));
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  return track(fetch(input, { ...init, signal: controller.signal }), () => controller.signal.aborted)
    .finally(() => clearTimeout(timer));
};

/** Momento en que se saltó la renovación de la sesión por falta de internet. */
let refreshSkippedAt = 0;
const anonBearer = `Bearer ${supabaseAnonKey}`;

function readAuthHeader(init: any): string {
  const h = init?.headers;
  if (!h) return '';
  if (typeof Headers !== 'undefined' && h instanceof Headers) return h.get('Authorization') || '';
  if (Array.isArray(h)) return (h.find(([k]) => String(k).toLowerCase() === 'authorization') || [])[1] || '';
  return h.Authorization || h.authorization || '';
}

/**
 * Si se saltó la renovación de la sesión, supabase-js manda la consulta con la clave
 * pública (sin usuario). Esa consulta no se envía: las reglas de la base de datos
 * devolverían listas vacías que pisarían la copia guardada, y una escritura se
 * rechazaría. Se trata como «sin internet» y la pantalla usa la copia del teléfono.
 */
const guardedFetch: typeof fetch = (input: any, init: any = {}) => {
  if (Date.now() - refreshSkippedAt < 5000 && readAuthHeader(init) === anonBearer) {
    const url = String(typeof input === 'string' ? input : input?.url || '');
    if (/\/(rest|storage|functions)\/v1\//.test(url)) {
      return Promise.reject(offlineError('Sin conexión: la sesión se renovará al volver internet'));
    }
  }
  return offlineAwareFetch(input, init);
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: { fetch: guardedFetch },
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

/**
 * Abrir la app SIN internet con la sesión vencida (dura 1 hora) la dejaba cargando para
 * siempre: supabase-js intenta renovar la sesión con reintentos durante ~30 s, y cada
 * consulta espera esa renovación, una detrás de otra.
 * Sin internet ahora se responde al instante con un error «reintentable»: la sesión NO
 * se borra (sigue guardada) y se renueva sola cuando vuelve la conexión.
 * Con Wi-Fi sin salida (el teléfono cree que hay internet) se espera como máximo 5 s.
 */
const REFRESH_WAIT_MS = 5000;
const authClient: any = supabase.auth;
const originalCallRefresh = typeof authClient._callRefreshToken === 'function'
  ? authClient._callRefreshToken.bind(authClient)
  : null;

function skippedRefresh() {
  refreshSkippedAt = Date.now();
  return { data: null, error: new AuthRetryableFetchError('Sin conexión: la sesión se renovará al volver internet', 0) };
}

function looksOffline() {
  return (typeof navigator !== 'undefined' && navigator.onLine === false) || Date.now() < unreachableUntil;
}

if (originalCallRefresh) {
  authClient._callRefreshToken = (refreshToken: string) => {
    if (!refreshToken || !looksOffline()) {
      const real = originalCallRefresh(refreshToken);
      if (!refreshToken) return real;
      // Si tarda demasiado (Wi-Fi sin salida) se sigue intentando por detrás, pero la app no espera
      let timer: any;
      const slow = new Promise(resolve => {
        timer = setTimeout(() => resolve(skippedRefresh()), REFRESH_WAIT_MS);
      });
      return Promise.race([real.finally(() => clearTimeout(timer)), slow]);
    }
    return Promise.resolve(skippedRefresh());
  };
}

/** Al volver internet, renovar la sesión enseguida (avisa con TOKEN_REFRESHED). */
if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
  window.addEventListener('online', () => {
    unreachableUntil = 0;
    supabase.auth.getSession().catch(() => {});
  });
}
