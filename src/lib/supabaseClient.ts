import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

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

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: { fetch: offlineAwareFetch },
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
