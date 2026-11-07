// Lecturas "red primero, caché si no hay red".
// Si la consulta funciona se guarda una copia en el dispositivo; si falla (sin
// internet, timeout) se devuelve la última copia guardada.

import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = '@scout_rc_';

export async function readCached<T>(key: string): Promise<T | undefined> {
  try {
    const raw = await AsyncStorage.getItem(PREFIX + key);
    if (raw === null) return undefined;
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}

export async function writeCached<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch (e) {
    // Si el almacenamiento está lleno, no es grave: solo no habrá copia offline.
    console.warn('[readCache] No se pudo guardar copia offline de', key, e);
  }
}

/**
 * Ejecuta `fetcher` (que debe LANZAR error si falla, ver `must()`) con un tiempo máximo.
 * - Éxito: guarda la copia y la devuelve.
 * - Falla o tarda demasiado: devuelve la copia guardada, o `fallback` si nunca hubo una.
 */
export async function cachedQuery<T>(
  key: string,
  fetcher: () => Promise<T>,
  fallback: T,
  timeoutMs = 8000
): Promise<T> {
  try {
    const result = await Promise.race([
      fetcher(),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), timeoutMs)),
    ]);
    writeCached(key, result);
    return result;
  } catch (err) {
    const cached = await readCached<T>(key);
    if (cached !== undefined) return cached;
    return fallback;
  }
}
