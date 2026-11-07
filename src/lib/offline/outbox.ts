// Cola de cambios pendientes ("outbox") para trabajar sin internet.
//
// Cada cambio se guarda como una operación con nombre + datos. Cuando vuelve la
// conexión se envían en el mismo orden en que se hicieron. Si un envío falla por
// red, la cola se detiene y espera; si falla por otra causa (permisos, datos) se
// reintenta hasta MAX_ATTEMPTS y luego queda marcada como "con error" sin borrarse.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { isOnline, isRetryableError, onConnectivityChange, newId } from './net';

const OUTBOX_KEY = '@scout_outbox_v1';
const LEGACY_QUEUE_KEY = '@scout_offline_sync_queue';
const MAX_ATTEMPTS = 5;
const AUTO_SYNC_INTERVAL_MS = 30_000;

export interface OutboxOp {
  id: string;
  type: string;
  payload: any;
  /** Operaciones con la misma clave se reemplazan: solo vale la última (p. ej. marcar/desmarcar un requisito). */
  dedupeKey?: string;
  /** Texto corto para mostrar al usuario. */
  label?: string;
  createdAt: number;
  attempts: number;
  lastError?: string;
  failed?: boolean;
}

export interface OutboxStatus {
  online: boolean;
  syncing: boolean;
  pending: number;
  failed: number;
  lastSyncAt: number | null;
  lastSyncedCount: number;
}

type Handler = (payload: any) => Promise<any>;

const handlers = new Map<string, Handler>();
const listeners = new Set<(s: OutboxStatus) => void>();

let memQueue: OutboxOp[] | null = null;
let flushing: Promise<{ synced: number; remaining: number }> | null = null;
let status: OutboxStatus = {
  online: isOnline(),
  syncing: false,
  pending: 0,
  failed: 0,
  lastSyncAt: null,
  lastSyncedCount: 0,
};
let autoSyncStarted = false;

function emit(patch: Partial<OutboxStatus> = {}) {
  const q = memQueue || [];
  status = {
    ...status,
    ...patch,
    pending: q.filter(o => !o.failed).length,
    failed: q.filter(o => o.failed).length,
  };
  listeners.forEach(l => {
    try { l(status); } catch {}
  });
}

async function load(): Promise<OutboxOp[]> {
  if (memQueue) return memQueue;
  try {
    const raw = await AsyncStorage.getItem(OUTBOX_KEY);
    memQueue = raw ? JSON.parse(raw) : [];
  } catch {
    memQueue = [];
  }
  await migrateLegacyQueue();
  return memQueue!;
}

async function persist() {
  try {
    await AsyncStorage.setItem(OUTBOX_KEY, JSON.stringify(memQueue || []));
  } catch (e: any) {
    // Normalmente: almacenamiento lleno (fotos pesadas en la cola).
    console.warn('[Outbox] No se pudo guardar la cola en el dispositivo:', e);
    throw new Error('El almacenamiento del teléfono está lleno. Conéctate a internet para enviar lo pendiente y vuelve a intentarlo.');
  }
}

/** La cola vieja solo guardaba requisitos marcados: se pasa al nuevo formato una sola vez. */
async function migrateLegacyQueue() {
  try {
    const raw = await AsyncStorage.getItem(LEGACY_QUEUE_KEY);
    if (!raw) return;
    const legacy: any[] = JSON.parse(raw) || [];
    for (const item of legacy) {
      if (!item?.scoutId || !item?.stageId || !item?.reqId) continue;
      const dedupeKey = `req:${item.scoutId}:${item.stageId}:${item.reqId}`;
      if (memQueue!.some(o => o.dedupeKey === dedupeKey)) continue;
      memQueue!.push({
        id: newId('op_'),
        type: 'requirement.set',
        payload: { scoutId: item.scoutId, stageId: item.stageId, reqId: item.reqId, completed: !!item.completed },
        dedupeKey,
        label: 'Requisito marcado',
        createdAt: item.timestamp || Date.now(),
        attempts: 0,
      });
    }
    await AsyncStorage.setItem(OUTBOX_KEY, JSON.stringify(memQueue));
    await AsyncStorage.removeItem(LEGACY_QUEUE_KEY);
  } catch (e) {
    console.warn('[Outbox] Error migrando cola antigua:', e);
  }
}

export const outbox = {
  register(type: string, handler: Handler) {
    handlers.set(type, handler);
  },

  async list(): Promise<OutboxOp[]> {
    return [...(await load())];
  },

  /** Operaciones pendientes (no fallidas) de un tipo, para mostrar lo hecho offline en las pantallas. */
  async pending(type?: string): Promise<OutboxOp[]> {
    const q = await load();
    return q.filter(o => !o.failed && (!type || o.type === type));
  },

  async enqueue(type: string, payload: any, opts: { dedupeKey?: string; label?: string } = {}): Promise<OutboxOp> {
    const q = await load();
    const op: OutboxOp = {
      id: newId('op_'),
      type,
      payload,
      dedupeKey: opts.dedupeKey,
      label: opts.label,
      createdAt: Date.now(),
      attempts: 0,
    };
    const before = memQueue;
    if (opts.dedupeKey) {
      memQueue = q.filter(o => o.dedupeKey !== opts.dedupeKey);
    }
    memQueue = [...(memQueue || q), op];
    try {
      await persist();
    } catch (e) {
      memQueue = before;
      throw e;
    }
    emit();
    return op;
  },

  /**
   * Ejecuta un cambio ya mismo si hay internet; si no, lo deja en cola.
   * Devuelve { queued: true } cuando quedó pendiente. Lanza el error si falló
   * por una causa que no es de red (para que la pantalla avise al usuario).
   */
  async run<T = any>(type: string, payload: any, opts: { dedupeKey?: string; label?: string } = {}): Promise<{ queued: boolean; result?: T }> {
    const handler = handlers.get(type);
    if (!handler) throw new Error(`[Outbox] Operación sin manejador: ${type}`);
    const q = await load();
    // Si ya hay cosas en cola, esta va detrás para respetar el orden (p. ej. crear y luego borrar).
    const hasBacklog = q.some(o => !o.failed);
    if (!isOnline() || hasBacklog) {
      await this.enqueue(type, payload, opts);
      if (isOnline()) this.flush().catch(() => {});
      return { queued: true };
    }
    try {
      const result = await handler(payload);
      return { queued: false, result };
    } catch (err) {
      if (isRetryableError(err)) {
        await this.enqueue(type, payload, opts);
        emit({ online: isOnline() });
        return { queued: true };
      }
      throw err;
    }
  },

  async flush(): Promise<{ synced: number; remaining: number }> {
    if (flushing) return flushing;
    flushing = (async () => {
      const q = await load();
      let synced = 0;
      if (!q.some(o => !o.failed) || !isOnline()) {
        return { synced: 0, remaining: q.filter(o => !o.failed).length };
      }
      emit({ syncing: true });
      try {
        for (const op of [...q]) {
          if (op.failed) continue;
          const handler = handlers.get(op.type);
          if (!handler) continue; // el módulo que la maneja aún no se cargó
          try {
            await handler(op.payload);
            memQueue = (memQueue || []).filter(o => o.id !== op.id);
            synced++;
            await persist().catch(() => {});
            emit();
          } catch (err: any) {
            if (isRetryableError(err)) {
              // Sin red (o sesión aún renovándose): parar y reintentar después, en orden.
              break;
            }
            op.attempts += 1;
            op.lastError = String(err?.message || err);
            if (op.attempts >= MAX_ATTEMPTS) op.failed = true;
            console.warn(`[Outbox] Falló "${op.type}" (intento ${op.attempts}):`, err);
            await persist().catch(() => {});
            emit();
          }
        }
      } finally {
        emit({ syncing: false, lastSyncAt: Date.now(), lastSyncedCount: synced, online: isOnline() });
      }
      return { synced, remaining: (memQueue || []).filter(o => !o.failed).length };
    })();
    try {
      return await flushing;
    } finally {
      flushing = null;
    }
  },

  /** Vuelve a intentar las operaciones que quedaron con error. */
  async retryFailed() {
    const q = await load();
    q.forEach(o => {
      if (o.failed) {
        o.failed = false;
        o.attempts = 0;
      }
    });
    await persist().catch(() => {});
    emit();
    return this.flush();
  },

  /** Quita de la cola operaciones que ya no tienen sentido (p. ej. borrar algo que nunca se subió). */
  async removeWhere(pred: (op: OutboxOp) => boolean): Promise<number> {
    const q = await load();
    const keep = q.filter(o => !pred(o));
    const removed = q.length - keep.length;
    if (removed > 0) {
      memQueue = keep;
      await persist().catch(() => {});
      emit();
    }
    return removed;
  },

  async discardFailed() {
    const q = await load();
    memQueue = q.filter(o => !o.failed);
    await persist().catch(() => {});
    emit();
  },

  getStatus(): OutboxStatus {
    return status;
  },

  subscribe(listener: (s: OutboxStatus) => void): () => void {
    listeners.add(listener);
    load().then(() => emit()).catch(() => {});
    listener(status);
    return () => listeners.delete(listener);
  },

  /** Arranca la sincronización automática: al volver la red, al volver a la app y cada 30 s. */
  startAutoSync() {
    if (autoSyncStarted) return;
    autoSyncStarted = true;
    load().then(() => {
      emit({ online: isOnline() });
      this.flush().catch(() => {});
    });
    onConnectivityChange(online => {
      emit({ online });
      if (online) this.flush().catch(() => {});
    });
    if (typeof document !== 'undefined' && document.addEventListener) {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && isOnline()) this.flush().catch(() => {});
      });
    }
    setInterval(() => {
      if (isOnline() && status.pending > 0) this.flush().catch(() => {});
    }, AUTO_SYNC_INTERVAL_MS);
  },
};
