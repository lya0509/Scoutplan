// Pañoleta de cada grupo scout (colores que define la Jefatura).
//
// Vive en `scout_groups.scarf` (supabase_panoleta_grupo.sql). Se lee una vez por sesión para
// todos los grupos (son pocos y el dato es pequeño), se guarda en el teléfono para verla sin
// internet, y se cambia solo con la función `guardar_panoleta_grupo` de la base de datos.
import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { isOnline } from './offline/net';
import { readCached, writeCached } from './offline/readCache';

export interface GroupScarf {
  /** Color de fondo de la pañoleta. */
  base: string;
  /** Franjas en orden (0 a MAX_STRIPES). */
  stripes: string[];
}

export const MAX_STRIPES = 8;
const CACHE_KEY = 'group_scarves_v1';
const HEX = /^#[0-9a-f]{6}$/i;

let scarves: Record<string, GroupScarf> = {};
let started = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach(l => l());

/** Acepta solo lo que tiene forma de pañoleta; cualquier otra cosa se ignora. */
export function parseScarf(raw: any): GroupScarf | null {
  if (!raw || typeof raw !== 'object' || !HEX.test(raw.base || '')) return null;
  const stripes = Array.isArray(raw.stripes) ? raw.stripes.filter((s: any) => typeof s === 'string' && HEX.test(s)) : [];
  return { base: raw.base.toLowerCase(), stripes: stripes.slice(0, MAX_STRIPES).map((s: string) => s.toLowerCase()) };
}

async function refresh(): Promise<void> {
  if (!isOnline()) return;
  const { data, error } = await supabase.from('scout_groups').select('name,scarf').not('scarf', 'is', null);
  if (error) return; // sin sesión, sin permiso o falta ejecutar el SQL: se queda lo que había
  const next: Record<string, GroupScarf> = {};
  for (const row of data || []) {
    const s = parseScarf((row as any).scarf);
    if (s && (row as any).name) next[(row as any).name] = s;
  }
  scarves = next;
  writeCached(CACHE_KEY, next);
  notify();
}

/** Carga las pañoletas (primero la copia del teléfono, luego la nube). */
export function loadGroupScarves(force = false): void {
  if (started && !force) return;
  const first = !started;
  started = true;
  (async () => {
    if (first) {
      const cached = await readCached<Record<string, GroupScarf>>(CACHE_KEY);
      if (cached && !Object.keys(scarves).length) { scarves = cached; notify(); }
    }
    await refresh().catch(() => {});
  })();
}

/** Pañoleta del grupo `groupName`, o null si no la han definido. Se actualiza sola. */
export function useGroupScarf(groupName?: string | null): GroupScarf | null {
  const [, tick] = useState(0);
  useEffect(() => {
    const l = () => tick(n => n + 1);
    listeners.add(l);
    loadGroupScarves();
    return () => { listeners.delete(l); };
  }, []);
  return (groupName && scarves[groupName]) || null;
}

/**
 * Guarda (o quita, con null) la pañoleta del grupo de quien tiene sesión. Solo Jefatura:
 * la base de datos rechaza a cualquier otro. En línea, para que vea el motivo al momento.
 */
export async function saveGroupScarf(groupName: string, scarf: GroupScarf | null): Promise<void> {
  if (!isOnline()) throw new Error('Necesitas conexión a internet para guardar la pañoleta.');
  const { error } = await supabase.rpc('guardar_panoleta_grupo', {
    p_base: scarf ? scarf.base : null,
    p_franjas: scarf ? scarf.stripes : [],
  });
  if (error) {
    if (error.code === '42501') throw new Error('Solo la Jefatura puede cambiar la pañoleta de su grupo.');
    if (error.code === 'PGRST202' || error.code === '42883') throw new Error('Esta función todavía no está activada en la base de datos.');
    throw new Error(error.message);
  }
  const next = { ...scarves };
  if (scarf) next[groupName] = scarf; else delete next[groupName];
  scarves = next;
  writeCached(CACHE_KEY, next);
  notify();
}
