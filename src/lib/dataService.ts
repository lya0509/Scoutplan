import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabaseClient';
import { RequirementProgress, StageStatus } from '../types/progression';
import { stagesData } from '../data/progressionTemplate';
import { notificationService } from '../services/notificationService';
import { presenceService } from '../services/presenceService';
import { storageService } from './storageService';
import { outbox } from './offline/outbox';
import { must, isDuplicateError, isRetryableError, isOnline, newId } from './offline/net';
import { cachedQuery, readCached, writeCached } from './offline/readCache';
import { isSafeFileUrl } from '../utils/safeUrl';
import { todayLocal } from '../utils/dateLocal';

const SYNC_QUEUE_KEY = '@scout_offline_sync_queue'; // cola antigua: outbox.ts la migra sola

/** Tablas a las que la cola offline puede escribir con las operaciones genéricas row.*. */
const OUTBOX_TABLES = new Set([
  'profiles', 'requirement_progress', 'stage_progress', 'certificates', 'quarterly_plans',
  'calendar_events', 'scout_notifications', 'notifications', 'bug_reports', 'scout_programas',
]);

const reqDedupeKey = (scoutId: string, stageId: string, reqId: string) => `req:${scoutId}:${stageId}:${reqId}`;
const stageDedupeKey = (scoutId: string, stageId: string) => `stage:${scoutId}:${stageId}`;

/** Requisitos marcados/desmarcados sin conexión que aún no llegan a Supabase. */
async function pendingRequirementMap(scoutId: string): Promise<Map<string, boolean>> {
  const map = new Map<string, boolean>();
  const ops = await outbox.pending('requirement.set');
  ops.forEach(o => {
    if (o.payload?.scoutId === scoutId) map.set(`${o.payload.stageId}:${o.payload.reqId}`, !!o.payload.completed);
  });
  return map;
}

/** Filas de `certificates` creadas/borradas sin conexión, para mostrarlas antes de sincronizar. */
async function pendingCertificateRows(scoutId: string) {
  const inserts: any[] = [];
  const deletes = new Set<string>();
  const updates = new Map<string, any>();
  const ops = await outbox.pending();
  for (const o of ops) {
    const p = o.payload || {};
    if (o.type === 'row.insert' && p.table === 'certificates') {
      const rows = Array.isArray(p.rows) ? p.rows : [p.row];
      rows.forEach((r: any) => { if (r?.scout_id === scoutId) inserts.push({ ...r, created_at: r.created_at || new Date(o.createdAt).toISOString(), _pending: true }); });
    } else if (o.type === 'row.delete' && p.table === 'certificates' && p.match?.id) {
      deletes.add(p.match.id);
    } else if (o.type === 'certificate.upload' && p.scoutId === scoutId) {
      inserts.push({
        id: p.tempId, scout_id: scoutId, title: p.title, category: p.category, level: p.level,
        file_url: p.fileUrl, created_at: new Date(o.createdAt).toISOString(), _pending: true,
      });
    } else if (o.type === 'certificate.update' && p.scoutId === scoutId) {
      updates.set(p.certificateId, p.updates);
    } else if (o.type === 'certificate.delete' && p.scoutId === scoutId) {
      deletes.add(p.certificateId);
    }
  }
  return { inserts, deletes, updates };
}

function applyPendingRows(rows: any[], pend: { inserts: any[]; deletes: Set<string>; updates: Map<string, any> }, filter: (r: any) => boolean) {
  const ids = new Set(rows.map(r => r.id));
  const merged = [
    ...pend.inserts.filter(r => filter(r) && !ids.has(r.id)),
    ...rows,
  ]
    .filter(r => !pend.deletes.has(r.id))
    .map(r => (pend.updates.has(r.id) ? { ...r, ...pend.updates.get(r.id) } : r));
  return merged;
}

interface QuarterlyPlanInput {
  scout_id: string;
  quarter: string;
  year: number;
  elaborated_by?: string;
  general_objectives?: string;
  trimestre_goals?: string;
  specific_objectives?: string;
  educational_areas?: Record<string, boolean>;
  monthly_activities?: any[];
  goals?: string;
  group_name?: string;
  unit?: string;
}

/** Algunos planes viejos guardaron todo como JSON dentro de `goals`. */
function expandPlanGoals(item: any) {
  if (item && typeof item.goals === 'string' && item.goals.startsWith('{')) {
    try {
      return { ...item, ...JSON.parse(item.goals) };
    } catch {}
  }
  return item;
}

/** Plan trimestral guardado sin conexión que aún no se envía (manda sobre lo que haya en el servidor). */
async function pendingQuarterlyPlan(groupName: string | null, unit: string | null, quarter: string, year: number, scoutId?: string) {
  const ops = await outbox.pending('quarterly.save');
  const match = ops.filter(o => {
    const p = o.payload || {};
    if (p.quarter !== quarter || Number(p.year) !== Number(year)) return false;
    if (scoutId && p.scout_id === scoutId) return true;
    if (groupName !== null && unit !== null) {
      let u = (p.unit || 'clan').toLowerCase().trim();
      if (u === 'comunidad') u = 'caminantes';
      return u === unit && (!groupName || (p.group_name || '') === groupName);
    }
    return false;
  }).pop();
  if (!match) return null;
  return { ...match.payload, general_objectives: match.payload.general_objectives || match.payload.goals, status: 'Enviado', updated_at: new Date(match.createdAt).toISOString(), _pending: true };
}

/** Convierte un registro local antiguo (noche / vida de grupo / CIP) en fila de `certificates`. */
function legacyEntryToRow(scoutId: string, category: string, e: any) {
  const id = newId();
  if (category.startsWith('aire_libre_')) {
    return { id, scout_id: scoutId, category, title: e.location || 'Campamento / Pernocta', level: String(e.nightsCount || 1), file_url: JSON.stringify({ date: e.date || '', notes: e.notes || '' }) };
  }
  if (category.startsWith('vida_grupo_')) {
    return { id, scout_id: scoutId, category, title: e.title || 'Evento de Vida de Grupo', level: e.subtype || e.type || null, file_url: JSON.stringify({ type: e.type, subtype: e.subtype || null, location: e.location || '', date: e.date || '', description: e.description || '' }) };
  }
  if (category.startsWith('cip_sel_')) {
    return { id, scout_id: scoutId, category, title: e.title, level: e.scope || 'distrital', file_url: JSON.stringify({ eventId: e.id || null, location: e.location || '', description: e.description || '', date: e.date || '' }) };
  }
  return null;
}

export interface MembershipReceipt {
  id: string; year: string; imageUrl: string; reference: string; amount: string; paidOn: string; createdAt: string; pending: boolean;
}
export interface MembershipHistoryEntry {
  id: string; status: 'approved' | 'rejected'; expiresAt: string; year: string; byName: string; reason: string; decidedAt: string; pending: boolean;
}

export const dataService = {
  // --- MOTOR DE SINCRONIZACIÓN OFFLINE (ver src/lib/offline/outbox.ts) ---
  async getSyncQueue() {
    return outbox.list();
  },

  async addToSyncQueue(item: { scoutId: string; stageId: string; reqId: string; completed: boolean }) {
    await outbox.enqueue('requirement.set', item, {
      dedupeKey: reqDedupeKey(item.scoutId, item.stageId, item.reqId),
      label: 'Requisito marcado',
    });
  },

  /** Envía a Supabase todo lo que se hizo sin conexión (no solo requisitos; se mantiene el nombre). */
  async syncPendingRequirements(): Promise<{ synced: number; remaining: number }> {
    return outbox.flush();
  },

  async initializeScout(scoutId: string) {
    try {
      const existing = must(await supabase
        .from('stage_progress')
        .select('id')
        .eq('scout_id', scoutId)
        .eq('stage_id', 'precursor')
        .maybeSingle());

      if (!existing) {
        await supabase.from('stage_progress').insert({
          scout_id: scoutId,
          stage_id: 'precursor',
          status: 'En Progreso'
        });
      }
    } catch (e) {
      console.warn('Initialize scout offline/cache mode');
    }
  },

  async getStageStatus(scoutId: string, stageId: string): Promise<StageStatus> {
    const localKey = `@scout_stage_status_${scoutId}_${stageId}`;
    // Un cambio de estado hecho sin conexión manda hasta que se sincronice
    const pendingStage = (await outbox.pending()).filter(o => o.dedupeKey === stageDedupeKey(scoutId, stageId)).pop();
    if (pendingStage?.payload?.status) return pendingStage.payload.status as StageStatus;

    const res = await supabase
      .from('stage_progress')
      .select('status')
      .eq('scout_id', scoutId)
      .eq('stage_id', stageId)
      .maybeSingle();

    if (!res.error) {
      if (res.data?.status) {
        AsyncStorage.setItem(localKey, res.data.status).catch(() => {});
        return res.data.status as StageStatus;
      }
      AsyncStorage.removeItem(localKey).catch(() => {});
    } else {
      // Sin red: usar el último estado conocido (nunca borrarlo por un fallo de conexión)
      const local = await AsyncStorage.getItem(localKey).catch(() => null);
      if (local) return local as StageStatus;
    }
    return stageId === 'precursor' ? 'En Progreso' : 'Bloqueada';
  },

  /** Estado de todas las etapas del scout { stageId: status }, con copia offline y cambios pendientes. */
  async getAllStageStatuses(scoutId: string): Promise<Record<string, string>> {
    const map = await cachedQuery<Record<string, string>>(`stage_statuses_${scoutId}`, async () => {
      const rows = must(await supabase.from('stage_progress').select('stage_id, status').eq('scout_id', scoutId));
      const m: Record<string, string> = {};
      (rows || []).forEach((r: any) => { m[r.stage_id] = r.status; });
      return m;
    }, {});
    const result = { ...map };
    (await outbox.pending('stage.setStatus')).forEach(o => {
      if (o.payload?.scoutId === scoutId) result[o.payload.stageId] = o.payload.status;
    });
    return result;
  },

  /** Fecha del último cambio de estado de cada etapa { stageId: ISO }. En etapas aprobadas = fecha de aprobación. */
  async getStageDates(scoutId: string): Promise<Record<string, string>> {
    return cachedQuery<Record<string, string>>(`stage_dates_${scoutId}`, async () => {
      const rows = must(await supabase.from('stage_progress').select('stage_id, updated_at').eq('scout_id', scoutId));
      const m: Record<string, string> = {};
      (rows || []).forEach((r: any) => { if (r.updated_at) m[r.stage_id] = r.updated_at; });
      return m;
    }, {});
  },

  /** Todas las filas de requirement_progress del scout, con copia offline y cambios pendientes. */
  async getRequirementRows(scoutId: string): Promise<{ requirement_id: string; stage_id: string; completed: boolean }[]> {
    const rows = await cachedQuery<any[]>(`req_rows_${scoutId}`, async () =>
      must(await supabase.from('requirement_progress').select('requirement_id, stage_id, completed').eq('scout_id', scoutId)) || [], []);
    const pending = await pendingRequirementMap(scoutId);
    if (pending.size === 0) return rows;
    const byKey = new Map(rows.map((r: any) => [`${r.stage_id}:${r.requirement_id}`, r]));
    pending.forEach((completed, key) => {
      const [stage_id, ...rest] = key.split(':');
      byKey.set(key, { stage_id, requirement_id: rest.join(':'), completed });
    });
    return Array.from(byKey.values());
  },

  async getRequirement(scoutId: string, stageId: string, reqId: string): Promise<boolean> {
    const localKey = `@scout_req_${scoutId}_${stageId}_${reqId}`;
    const pending = await pendingRequirementMap(scoutId);
    if (pending.has(`${stageId}:${reqId}`)) return pending.get(`${stageId}:${reqId}`)!;

    const res = await supabase
      .from('requirement_progress')
      .select('completed')
      .eq('scout_id', scoutId)
      .eq('stage_id', stageId)
      .eq('requirement_id', reqId)
      .maybeSingle();

    if (!res.error) {
      if (res.data && res.data.completed !== undefined && res.data.completed !== null) {
        AsyncStorage.setItem(localKey, String(res.data.completed)).catch(() => {});
        return res.data.completed;
      }
      AsyncStorage.removeItem(localKey).catch(() => {});
      return false;
    }
    const local = await AsyncStorage.getItem(localKey).catch(() => null);
    return local === 'true';
  },

  async getCompletedCatalogActivityIds(scoutId: string): Promise<string[]> {
    const ids = await cachedQuery<string[]>(`catalog_ids_${scoutId}`, async () => {
      const data = must(await supabase
        .from('requirement_progress')
        .select('requirement_id')
        .eq('scout_id', scoutId)
        .eq('completed', true));
      return (data || []).map((item: any) => item.requirement_id);
    }, []);

    const pending = await pendingRequirementMap(scoutId);
    if (pending.size === 0) return ids;
    const set = new Set(ids);
    pending.forEach((completed, key) => {
      const reqId = key.split(':').slice(1).join(':');
      if (completed) set.add(reqId); else set.delete(reqId);
    });
    return Array.from(set);
  },

  async getProgressForAllStages(scoutId: string) {
    const arr = await cachedQuery<string[]>(`all_completed_${scoutId}`, async () => {
      const data = must(await supabase
        .from('requirement_progress')
        .select('stage_id, requirement_id')
        .eq('scout_id', scoutId)
        .eq('completed', true));
      return (data || []).map((req: any) => `${req.stage_id}:${req.requirement_id}`);
    }, []);

    const completedReqSet = new Set<string>(arr);
    (await pendingRequirementMap(scoutId)).forEach((completed, key) => {
      if (completed) completedReqSet.add(key); else completedReqSet.delete(key);
    });

    return stagesData.map(stageTemplate => {
      const totalReqs = stageTemplate.requirements.length;
      const completed = stageTemplate.requirements.filter(r => 
        completedReqSet.has(`${stageTemplate.id}:${r.id}`)
      ).length;
      
      let progress = 0;
      if (totalReqs > 0) {
        progress = Math.min(100, Math.round((completed / totalReqs) * 100));
      }

      return {
        id: stageTemplate.id,
        name: stageTemplate.title,
        progress: progress,
      };
    });
  },

  async toggleRequirement(scoutId: string, stageId: string, reqId: string, completed: boolean) {
    const localKey = `@scout_req_${scoutId}_${stageId}_${reqId}`;
    // 1. Guardar de inmediato en el dispositivo (respuesta instantánea, funciona sin red)
    await AsyncStorage.setItem(localKey, String(completed)).catch(() => {});
    // 2. Enviar ya si hay red; si no, queda en la cola y se envía al volver la conexión
    await outbox.run('requirement.set', { scoutId, stageId, reqId, completed }, {
      dedupeKey: reqDedupeKey(scoutId, stageId, reqId),
      label: completed ? 'Requisito completado' : 'Requisito desmarcado',
    });
  },

  async submitStageForReview(scoutId: string, stageId: string, notifyScouters?: any) {
    AsyncStorage.setItem(`@scout_stage_status_${scoutId}_${stageId}`, 'En Revision').catch(() => {});
    return outbox.run('stage.setStatus', { scoutId, stageId, status: 'En Revision', notifyPayload: notifyScouters }, {
      dedupeKey: stageDedupeKey(scoutId, stageId),
      label: 'Etapa enviada a revisión',
    });
  },

  async approveStage(scoutId: string, stageId: string) {
    await outbox.run('stage.setStatus', { scoutId, stageId, status: 'Aprobada', notify: 'approve' }, {
      dedupeKey: stageDedupeKey(scoutId, stageId),
      label: 'Etapa aprobada',
    });
  },

  async rejectStage(scoutId: string, stageId: string, reason?: string) {
    // Al rechazar / devolver, se cambia a 'En Progreso' para que se DESBLOQUEEN las actividades
    await outbox.run('stage.setStatus', { scoutId, stageId, status: 'En Progreso', notify: 'reject', reason }, {
      dedupeKey: stageDedupeKey(scoutId, stageId),
      label: 'Etapa devuelta',
    });
  },

  async getScoutsForScouter(unit: string, groupName: string) {
    return cachedQuery<any[]>(`scouts_${unit}_${groupName}`, async () => {
      const data = must(await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'scout')
        .eq('unit', unit)
        .eq('group_name', groupName));
      return data || [];
    }, []);
  },

  // ----------------------------------------------------
  // MÓDULO DE CERTIFICADOS
  // ----------------------------------------------------
  async getCertificates(scoutId: string) {
    const rows = await cachedQuery<any[] | null>(`certs_${scoutId}`, async () => {
      const data = must(await supabase
        .from('certificates')
        .select('*')
        .eq('scout_id', scoutId)
        .order('created_at', { ascending: false }));
      return data || [];
    }, null);
    if (rows === null) throw new Error('Sin conexión y sin copia guardada de tus certificados.');

    const isRealCert = (d: any) =>
      !d.category?.startsWith('vida_grupo_') &&
      !d.category?.startsWith('cip_sel_') &&
      !d.category?.startsWith('linked_cert_') &&
      !d.category?.startsWith('aire_libre_') &&
      !d.category?.startsWith('personal_') &&
      !d.category?.startsWith('membresia_');
    const pend = await pendingCertificateRows(scoutId);
    return applyPendingRows(rows, pend, isRealCert).filter(isRealCert);
  },

  async uploadCertificate(scoutId: string, title: string, category: string, level: string | null, fileUrl: string, date?: string) {
    if (fileUrl && !isSafeFileUrl(fileUrl)) throw new Error('El enlace del archivo debe ser una imagen o una dirección web (https://).');
    const payload = { scoutId, title, category, level, fileUrl, date, tempId: newId('pending_') };
    const res = await outbox.run('certificate.upload', payload, { label: `Certificado: ${title}` });
    if (res.queued) {
      // Se guardó en el teléfono; se sube solo al volver la conexión.
      return { id: payload.tempId, scout_id: scoutId, title, category, level, file_url: fileUrl, _pending: true };
    }
    return null;
  },

  /** Implementación real (la llama la cola). Lanza error si falla, para poder reintentar. */
  async _uploadCertificateNow(scoutId: string, title: string, category: string, level: string | null, fileUrl: string, date?: string) {
    let safeUrl = fileUrl;
    // Si la imagen es un Data URL de base64, subirla a Supabase Storage bucket 'scout-files'
    if (safeUrl && safeUrl.startsWith('data:image')) {
      // throwOnNetworkError: si no hay red, la cola lo reintenta más tarde en vez de
      // guardar la imagen en base64 dentro de la base de datos.
      const uploadedUrl = await storageService.uploadImage(
        'scout-files',
        'certificates',
        `cert_${scoutId}_${Date.now()}.png`,
        safeUrl,
        { throwOnNetworkError: true }
      );
      if (uploadedUrl && uploadedUrl.startsWith('http')) safeUrl = uploadedUrl;
    }

    const payload: any = {
      scout_id: scoutId,
      title,
      category,
      level,
      file_url: safeUrl
    };

    const { data, error } = await supabase
      .from('certificates')
      .insert(payload)
      .select();

    if (error) {
      console.error('Error insertando certificado en Supabase:', error);
      throw error;
    }

    // Sincronizar automáticamente con el currículum scout
    await this.syncCertificateToCurriculum(scoutId, {
      title,
      category,
      level,
      date: date || todayLocal()
    });

    return data ? data[0] : null;
  },

  async updateCertificate(certificateId: string, scoutId: string, updates: {
    title?: string;
    category?: string;
    area?: string | null;
    level?: string | null;
    date?: string;
    file_url?: string;
  }) {
    if (updates.file_url && !isSafeFileUrl(updates.file_url)) throw new Error('El enlace del archivo debe ser una imagen o una dirección web (https://).');
    const res = await outbox.run('certificate.update', { certificateId, scoutId, updates }, {
      dedupeKey: `certupd:${certificateId}`,
      label: `Certificado editado: ${updates.title || ''}`,
    });
    return res.queued ? { id: certificateId, ...updates, _pending: true } : null;
  },

  async _updateCertificateNow(certificateId: string, scoutId: string, updates: {
    title?: string;
    category?: string;
    area?: string | null;
    level?: string | null;
    date?: string;
    file_url?: string;
  }) {
    let safeUrl = updates.file_url;
    if (safeUrl && safeUrl.startsWith('data:image')) {
      const uploadedUrl = await storageService.uploadImage(
        'scout-files',
        'certificates',
        `cert_${scoutId}_${Date.now()}.png`,
        safeUrl,
        { throwOnNetworkError: true }
      );
      if (uploadedUrl && uploadedUrl.startsWith('http')) {
        safeUrl = uploadedUrl;
      }
    }

    // Sanitizar updates para enviar únicamente columnas existentes en Supabase
    const cleanUpdates: any = {};
    if (updates.title !== undefined) cleanUpdates.title = updates.title;
    if (updates.category !== undefined) cleanUpdates.category = updates.category;
    if (updates.level !== undefined) cleanUpdates.level = updates.level;
    if (safeUrl !== undefined) cleanUpdates.file_url = safeUrl;

    const { data, error } = await supabase
      .from('certificates')
      .update(cleanUpdates)
      .eq('id', certificateId)
      .select();

    if (error) {
      console.error('Error actualizando certificado en Supabase:', error);
      throw error;
    }

    if (updates.title && updates.category) {
      await this.syncCertificateToCurriculum(scoutId, {
        title: updates.title,
        category: updates.category,
        level: updates.level,
        date: updates.date || todayLocal()
      });
    }

    return data ? data[0] : null;
  },

  async syncCertificateToCurriculum(scoutId: string, cert: {
    title: string;
    category: string;
    level?: string | null;
    date: string;
    director?: string;
  }) {
    try {
      // Si esta lectura falla (sin red) NO se continúa: escribir encima borraría el currículum.
      const prof: any = must(await supabase
        .from('profiles')
        .select('curriculum_data')
        .eq('id', scoutId)
        .maybeSingle());

      let curr = prof?.curriculum_data || {};
      if (typeof curr === 'string') {
        try { curr = JSON.parse(curr); } catch {}
      }

      const certDate = cert.date || todayLocal();
      const normTitle = (cert.title || '').toLowerCase();

      // 1. Cursos de Liderazgo Scout (Horqueta, Remo, Canoa, Plan de Formación)
      if (normTitle.includes('horqueta')) {
        curr.horquetaCert = { date: certDate, director: cert.director || curr.horquetaCert?.director || '', certDate };
      } else if (normTitle.includes('remo')) {
        curr.remoCert = { date: certDate, director: cert.director || curr.remoCert?.director || '', certDate };
      } else if (normTitle.includes('canoa')) {
        curr.canoaCert = { date: certDate, director: cert.director || curr.canoaCert?.director || '', certDate };
      } else if (normTitle.includes('bronce') && (normTitle.includes('punta') || normTitle.includes('formacion') || normTitle.includes('liderazgo'))) {
        curr.pfBronce = { date: certDate, director: cert.director || curr.pfBronce?.director || '', certDate };
      } else if (normTitle.includes('plata') && (normTitle.includes('punta') || normTitle.includes('formacion') || normTitle.includes('liderazgo'))) {
        curr.pfPlata = { date: certDate, director: cert.director || curr.pfPlata?.director || '', certDate };
      } else if (normTitle.includes('oro') && (normTitle.includes('punta') || normTitle.includes('formacion') || normTitle.includes('liderazgo'))) {
        curr.pfOro = { date: certDate, director: cert.director || curr.pfOro?.director || '', certDate };
      }
      // 2. Programas Mundiales e Iniciativas (Tribu de la Tierra, Campeones Naturaleza, Scout Solar, Enseñas, etc.)
      else if (cert.category === 'programas_mundiales' || cert.category === 'iniciativas_programa' || normTitle.includes('tribu') || normTitle.includes('solar') || normTitle.includes('naturaleza') || normTitle.includes('paz') || normTitle.includes('mundo') || normTitle.includes('enseñas') || normTitle.includes('plastico') || normTitle.includes('planeta') || normTitle.includes('sdg') || normTitle.includes('ods')) {
        if (!curr.worldProgramsList) curr.worldProgramsList = [];
        const existingIdx = curr.worldProgramsList.findIndex((item: any) => item.title?.toLowerCase() === cert.title.toLowerCase());
        if (existingIdx >= 0) {
          curr.worldProgramsList[existingIdx] = { title: cert.title, role: 'Aprobado / Certificado', date: certDate };
        } else {
          curr.worldProgramsList.push({ title: cert.title, role: 'Aprobado / Certificado', date: certDate });
        }
      }
      // 3. Talleres y Cursos
      else if (cert.category === 'cursos' || normTitle.includes('taller') || normTitle.includes('curso')) {
        if (!curr.workshopsList) curr.workshopsList = [];
        const existingIdx = curr.workshopsList.findIndex((item: any) => item.title?.toLowerCase() === cert.title.toLowerCase());
        if (existingIdx >= 0) {
          curr.workshopsList[existingIdx] = { title: cert.title, date: certDate, director: cert.director || '' };
        } else {
          curr.workshopsList.push({ title: cert.title, date: certDate, director: cert.director || '' });
        }
      }
      // 4. Condecoraciones y Reconocimientos
      else if (cert.category === 'reconocimientos' || normTitle.includes('condecoracion') || normTitle.includes('merito') || normTitle.includes('reconocimiento')) {
        if (!curr.distinctionsList) curr.distinctionsList = [];
        const existingIdx = curr.distinctionsList.findIndex((item: any) => item.title?.toLowerCase() === cert.title.toLowerCase());
        if (existingIdx >= 0) {
          curr.distinctionsList[existingIdx] = { title: cert.title, date: certDate };
        } else {
          curr.distinctionsList.push({ title: cert.title, date: certDate });
        }
      }
      // 5. Especialidades
      else {
        const specName = cert.level ? `${cert.title} (${cert.level.toUpperCase()})` : cert.title;
        if (!curr.workshopsList) curr.workshopsList = [];
        const existingIdx = curr.workshopsList.findIndex((item: any) => item.title?.toLowerCase() === specName.toLowerCase());
        if (existingIdx >= 0) {
          curr.workshopsList[existingIdx] = { title: specName, date: certDate, director: 'Scouter de Rama' };
        } else {
          curr.workshopsList.push({ title: specName, date: certDate, director: 'Scouter de Rama' });
        }
      }

      must(await supabase
        .from('profiles')
        .update({ curriculum_data: curr })
        .eq('id', scoutId));

      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(`curriculum_data_${scoutId}`, JSON.stringify(curr));
      }
      return curr;
    } catch (err) {
      // Sin red: lanzar para que la cola reintente el certificado completo más tarde
      if (isRetryableError(err)) throw err;
      console.warn('Error sincronizando certificado con currículum:', err);
      return null;
    }
  },

  async syncAllCertificatesToCurriculum(scoutId: string) {
    try {
      if (!isOnline()) return { curriculum: null, count: 0, total: 0 };
      const certs = (await this.getCertificates(scoutId)).filter((c: any) => !c._pending);
      const prof: any = must(await supabase
        .from('profiles')
        .select('curriculum_data')
        .eq('id', scoutId)
        .maybeSingle());

      let curr = prof?.curriculum_data || {};
      if (typeof curr === 'string') {
        try { curr = JSON.parse(curr); } catch {}
      }

      if (!curr.worldProgramsList) curr.worldProgramsList = [];
      if (!curr.workshopsList) curr.workshopsList = [];
      if (!curr.distinctionsList) curr.distinctionsList = [];

      let importedCount = 0;

      for (const cert of certs) {
        const certDate = cert.date || (cert.created_at ? cert.created_at.split('T')[0] : todayLocal());
        const normTitle = (cert.title || '').toLowerCase();

        // 1. Cursos de Liderazgo Scout
        if (normTitle.includes('horqueta')) {
          curr.horquetaCert = { date: certDate, director: cert.director || curr.horquetaCert?.director || '', certDate };
          importedCount++;
        } else if (normTitle.includes('remo')) {
          curr.remoCert = { date: certDate, director: cert.director || curr.remoCert?.director || '', certDate };
          importedCount++;
        } else if (normTitle.includes('canoa')) {
          curr.canoaCert = { date: certDate, director: cert.director || curr.canoaCert?.director || '', certDate };
          importedCount++;
        } else if (normTitle.includes('bronce') && (normTitle.includes('punta') || normTitle.includes('formacion') || normTitle.includes('liderazgo'))) {
          curr.pfBronce = { date: certDate, director: cert.director || curr.pfBronce?.director || '', certDate };
          importedCount++;
        } else if (normTitle.includes('plata') && (normTitle.includes('punta') || normTitle.includes('formacion') || normTitle.includes('liderazgo'))) {
          curr.pfPlata = { date: certDate, director: cert.director || curr.pfPlata?.director || '', certDate };
          importedCount++;
        } else if (normTitle.includes('oro') && (normTitle.includes('punta') || normTitle.includes('formacion') || normTitle.includes('liderazgo'))) {
          curr.pfOro = { date: certDate, director: cert.director || curr.pfOro?.director || '', certDate };
          importedCount++;
        }
        // 2. Programas Mundiales e Iniciativas
        else if (cert.category === 'programas_mundiales' || cert.category === 'iniciativas_programa' || normTitle.includes('tribu') || normTitle.includes('solar') || normTitle.includes('naturaleza') || normTitle.includes('paz') || normTitle.includes('mundo') || normTitle.includes('enseñas') || normTitle.includes('plastico') || normTitle.includes('planeta') || normTitle.includes('sdg') || normTitle.includes('ods')) {
          const exists = curr.worldProgramsList.some((item: any) => item.title?.toLowerCase() === cert.title.toLowerCase());
          if (!exists) {
            curr.worldProgramsList.push({ title: cert.title, role: 'Aprobado / Certificado', date: certDate });
            importedCount++;
          }
        }
        // 3. Talleres y Cursos
        else if (cert.category === 'cursos' || normTitle.includes('taller') || normTitle.includes('curso')) {
          const exists = curr.workshopsList.some((item: any) => item.title?.toLowerCase() === cert.title.toLowerCase());
          if (!exists) {
            curr.workshopsList.push({ title: cert.title, date: certDate, director: cert.director || 'Scouter de Formación' });
            importedCount++;
          }
        }
        // 4. Condecoraciones
        else if (cert.category === 'reconocimientos' || normTitle.includes('condecoracion') || normTitle.includes('merito') || normTitle.includes('reconocimiento')) {
          const exists = curr.distinctionsList.some((item: any) => item.title?.toLowerCase() === cert.title.toLowerCase());
          if (!exists) {
            curr.distinctionsList.push({ title: cert.title, date: certDate });
            importedCount++;
          }
        }
        // 5. Especialidades
        else {
          const specName = cert.level ? `${cert.title} (${cert.level.toUpperCase()})` : cert.title;
          const exists = curr.workshopsList.some((item: any) => item.title?.toLowerCase() === specName.toLowerCase());
          if (!exists) {
            curr.workshopsList.push({ title: specName, date: certDate, director: 'Scouter de Rama' });
            importedCount++;
          }
        }
      }

      must(await supabase
        .from('profiles')
        .update({ curriculum_data: curr })
        .eq('id', scoutId));

      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(`curriculum_data_${scoutId}`, JSON.stringify(curr));
      }

      return { curriculum: curr, count: importedCount, total: certs.length };
    } catch (err) {
      console.warn('Error en syncAllCertificatesToCurriculum:', err);
      return { curriculum: null, count: 0, total: 0 };
    }
  },

  async deleteCertificate(certificateId: string, scoutId: string, certTitle?: string, reason?: string, notifyScout = true) {
    // Un certificado que aún no se subía: basta con sacarlo de la cola
    if (String(certificateId).startsWith('pending_')) {
      await outbox.removeWhere(o => o.type === 'certificate.upload' && o.payload?.tempId === certificateId);
      return;
    }
    await outbox.run('certificate.delete', { certificateId, scoutId, certTitle, reason, notifyScout }, {
      dedupeKey: `certdel:${certificateId}`,
      label: `Certificado eliminado: ${certTitle || ''}`,
    });
  },

  // ----------------------------------------------------
  // MÓDULO DE NOTIFICACIONES AL SCOUT
  // ----------------------------------------------------
  async getUnreadNotifications(scoutId: string) {
    const { data, error } = await supabase
      .from('scout_notifications')
      .select('*')
      .eq('scout_id', scoutId)
      .eq('is_read', false)
      .order('created_at', { ascending: false });

    if (error) return [];
    return data || [];
  },

  async markNotificationRead(notificationId: string) {
    await outbox.run('row.update', { table: 'scout_notifications', values: { is_read: true }, match: { id: notificationId } }, {
      dedupeKey: `notifread:${notificationId}`,
    }).catch(() => {});
  },

  // ----------------------------------------------------
  // MÓDULO DE CICLOS INSTITUCIONALES DE PROGRAMA (CIP)
  // ----------------------------------------------------
  async createCipEvent(event: {
    title: string;
    scope: 'distrital' | 'regional' | 'nacional' | 'internacional';
    unit: string;
    date: string;
    description?: string;
    created_by: string;
  }) {
    const row = {
      id: newId(),
      title: `[CIP ${event.scope.toUpperCase()}] ${event.title}`,
      description: event.description || `Ciclo Institucional de Programa (CIP) de alcance ${event.scope}.`,
      date: event.date,
      unit: event.unit,
      created_by: event.created_by
    };
    await outbox.run('row.insert', { table: 'calendar_events', row }, { label: `Evento CIP: ${event.title}` });
    return row;
  },

  async getCipEvents(unit?: string) {
    const rows = await cachedQuery<any[]>(`cip_events_${unit || 'all'}`, async () => {
      let query = supabase
        .from('calendar_events')
        .select('*')
        .or('title.ilike.%[CIP%,title.ilike.%[6P%')
        .order('date', { ascending: false });

      if (unit) {
        query = query.in('unit', [unit.toLowerCase(), 'grupo']);
      }
      return must(await query) || [];
    }, []);

    // Eventos creados sin conexión
    const ids = new Set(rows.map((r: any) => r.id));
    const pendingRows = (await outbox.pending('row.insert'))
      .filter(o => o.payload?.table === 'calendar_events' && o.payload.row && !ids.has(o.payload.row.id))
      .map(o => ({ ...o.payload.row, _pending: true }))
      .filter((r: any) => !unit || [unit.toLowerCase(), 'grupo'].includes(String(r.unit).toLowerCase()));
    return [...pendingRows, ...rows];
  },

  // ----------------------------------------------------
  // MÓDULO DE PLANES TRIMESTRALES (Q1 - Q4)
  // ----------------------------------------------------
  async getQuarterlyPlan(scoutId: string, quarter: string, year: number, opts: { skipPending?: boolean } = {}) {
    const pending = opts.skipPending ? null : await pendingQuarterlyPlan(null, null, quarter, year, scoutId);
    if (pending) return pending;
    return cachedQuery<any>(`qplan_${scoutId}_${quarter}_${year}`, async () => {
      const { data, error } = await supabase
        .from('quarterly_plans')
        .select('*')
        .eq('scout_id', scoutId)
        .eq('quarter', quarter)
        .eq('year', year)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      return expandPlanGoals(data) || null;
    }, null, 6000);
  },

  async getQuarterlyPlansHistory(scoutId: string, groupName?: string, unit?: string) {
    let cleanUnit = (unit || 'clan').toLowerCase().trim();
    if (cleanUnit === 'comunidad') cleanUnit = 'caminantes';
    const cacheKey = groupName && unit ? `qplan_hist_${groupName}_${cleanUnit}` : `qplan_hist_${scoutId}`;
    return cachedQuery<any[]>(cacheKey, async () => {
      let query = supabase.from('quarterly_plans').select('*');
      if (groupName && unit) {
        query = query.eq('group_name', groupName).eq('unit', cleanUnit);
      } else {
        query = query.eq('scout_id', scoutId);
      }

      const data = must(await query
        .order('year', { ascending: false })
        .order('quarter', { ascending: false }));
      return (data || []).map(expandPlanGoals);
    }, [], 6000);
  },

  async saveQuarterlyPlan(plan: QuarterlyPlanInput) {
    let cleanUnit = (plan.unit || 'clan').toLowerCase().trim();
    if (cleanUnit === 'comunidad') cleanUnit = 'caminantes';
    const res = await outbox.run('quarterly.save', plan, {
      dedupeKey: `qplan:${plan.group_name || ''}:${cleanUnit}:${plan.quarter}:${plan.year}`,
      label: `Plan trimestral ${plan.quarter} ${plan.year}`,
    });
    if (res.queued) {
      // Guardado en el teléfono: devolver lo que se va a enviar para que la pantalla lo muestre
      return { ...plan, unit: cleanUnit, status: 'Enviado', updated_at: new Date().toISOString(), _pending: true };
    }
    return res.result;
  },

  async _saveQuarterlyPlanNow(plan: QuarterlyPlanInput) {
    let cleanUnit = (plan.unit || 'clan').toLowerCase().trim();
    if (cleanUnit === 'comunidad') cleanUnit = 'caminantes';

    // skipPending: aquí se busca la fila REAL del servidor (con id), no la copia en cola
    const found = await this.getUnitSharedQuarterlyPlan(plan.group_name || '', cleanUnit, plan.quarter, plan.year, { skipPending: true })
      || await this.getQuarterlyPlan(plan.scout_id, plan.quarter, plan.year, { skipPending: true });
    const existing = found && found.id ? found : null;

    const fullPayload = {
      scout_id: plan.scout_id,
      unit: cleanUnit,
      group_name: plan.group_name || 'Grupo Scout Orión #84',
      goals: plan.general_objectives || plan.goals || '',
      general_objectives: plan.general_objectives || plan.goals || '',
      trimestre_goals: plan.trimestre_goals || '',
      specific_objectives: plan.specific_objectives || '',
      elaborated_by: plan.elaborated_by || '',
      educational_areas: plan.educational_areas || {
        corporalidad: true, creatividad: true, afectividad: true,
        espiritualidad: true, caracter: true, sociabilidad: true
      },
      monthly_activities: plan.monthly_activities || [],
      status: 'Enviado',
      updated_at: new Date().toISOString()
    };

    try {
      // Intento 1: Guardar con el esquema completo de columnas
      if (existing) {
        const { data, error } = await supabase
          .from('quarterly_plans')
          .update(fullPayload)
          .eq('id', existing.id)
          .select()
          .single();

        if (!error) return data;
        throw error;
      } else {
        const { data, error } = await supabase
          .from('quarterly_plans')
          .insert({
            quarter: plan.quarter,
            year: plan.year,
            ...fullPayload
          })
          .select()
          .single();

        if (!error) return data;
        throw error;
      }
    } catch (primaryErr: any) {
      // Sin red: que la cola lo reintente tal cual (no usar el plan B de columnas)
      if (isRetryableError(primaryErr)) throw primaryErr;
      // Fallback seguro: Si faltan columnas en Supabase, guardar como JSON en la columna 'goals'
      const fallbackGoalsStr = JSON.stringify(fullPayload);
      if (existing) {
        const { data, error } = await supabase
          .from('quarterly_plans')
          .update({
            goals: fallbackGoalsStr,
            status: 'Enviado',
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        return { ...data, ...fullPayload };
      } else {
        const { data, error } = await supabase
          .from('quarterly_plans')
          .insert({
            scout_id: plan.scout_id,
            quarter: plan.quarter,
            year: plan.year,
            goals: fallbackGoalsStr,
            status: 'Enviado',
            updated_at: new Date().toISOString()
          })
          .select()
          .single();

        if (error) throw error;
        return { ...data, ...fullPayload };
      }
    }
  },

  async getUnitQuarterlyPlans(unit: string, groupName: string, quarter: string, year: number) {
    return cachedQuery<any[]>(`unit_qplans_${unit}_${groupName}_${quarter}_${year}`, async () => {
      let query = supabase
        .from('profiles')
        .select('id, name, unit')
        .eq('role', 'scout')
        .eq('group_name', groupName);

      if (unit && unit !== 'all') {
        query = query.eq('unit', unit.toLowerCase());
      }

      const scouts = must(await query.order('unit', { ascending: true }).order('name', { ascending: true }));
      if (!scouts || scouts.length === 0) return [];

      const scoutIds = scouts.map((s: any) => s.id);
      const plans = must(await supabase
        .from('quarterly_plans')
        .select('*')
        .in('scout_id', scoutIds)
        .eq('quarter', quarter)
        .eq('year', year));

      const planMap: Record<string, any> = {};
      plans?.forEach((p: any) => { planMap[p.scout_id] = p; });

      return scouts.map((s: any) => ({
        scout: s,
        plan: planMap[s.id] || null
      }));
    }, []);
  },

  // OBTENER Y GUARDAR PLAN TRIMESTRAL ÚNICO Y COMPARTIDO POR UNIDAD
  async getUnitSharedQuarterlyPlan(groupName: string, unit: string, quarter: string, year: number, opts: { skipPending?: boolean } = {}) {
    try {
      let cleanUnit = (unit || 'clan').toLowerCase().trim();
      if (cleanUnit === 'comunidad') cleanUnit = 'caminantes';
      const unitAliases = [cleanUnit, cleanUnit === 'caminantes' ? 'comunidad' : cleanUnit];

      const pending = opts.skipPending ? null : await pendingQuarterlyPlan(groupName || '', cleanUnit, quarter, year);
      if (pending) return pending;

      const cacheKey = `unit_qplan_${groupName}_${cleanUnit}_${quarter}_${year}`;
      // Si hay error de red en cualquier consulta se lanza, y se usa la copia guardada.
      const fetchPromise = (async () => {
        // 1. Intento principal: buscar directamente en quarterly_plans por group_name y unit
        if (groupName && groupName.trim().length > 0) {
          const { data: directData, error: err1 } = await supabase
            .from('quarterly_plans')
            .select('*')
            .eq('group_name', groupName.trim())
            .in('unit', unitAliases)
            .eq('quarter', quarter)
            .eq('year', year)
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (err1) throw err1;
          if (directData) return directData;
        }

        // 2. Intento rápido: buscar directamente por unit, quarter, year sin depender de discrepancias en el texto de group_name
        const { data: unitData, error: err2 } = await supabase
          .from('quarterly_plans')
          .select('*')
          .in('unit', unitAliases)
          .eq('quarter', quarter)
          .eq('year', year)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (err2) throw err2;
        if (unitData) return unitData;

        // 3. Fallback legacy: Buscar a través de los perfiles de la unidad
        let query = supabase.from('profiles').select('id');
        if (groupName && groupName.trim().length > 0) query = query.eq('group_name', groupName.trim());
        query = query.in('unit', unitAliases);

        const { data: scouts } = await query;
        if (scouts && scouts.length > 0) {
          const scoutIds = scouts.map(s => s.id);
          const { data: fallbackData } = await supabase
            .from('quarterly_plans')
            .select('*')
            .in('scout_id', scoutIds)
            .eq('quarter', quarter)
            .eq('year', year)
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (fallbackData) return fallbackData;
        }

        return null;
      })();

      const result: any = await cachedQuery<any>(cacheKey, async () => (await fetchPromise) || null, null, 6000);
      return result ? expandPlanGoals(result) : null;
    } catch (e) {
      return null;
    }
  },

  async updateLastSeen(scoutId: string) {
    if (!isOnline()) return;
    try {
      await supabase.from('profiles').update({
        updated_at: new Date().toISOString()
      }).eq('id', scoutId);
    } catch (e) {
      console.warn('Aviso actualizando estado online:', e);
    }
  },

  async getUnitRoversDirectory(groupName: string, unit: string) {
    try {
      let targetUnit = (unit || 'clan').toLowerCase().trim();
      if (targetUnit === 'comunidad') targetUnit = 'caminantes';

      // Las reglas RLS solo dejan a un scout leer su propio perfil: el directorio
      // del grupo viene de la función directorio_grupo() (solo datos públicos).
      // Sin red se usa la última copia del directorio.
      const data: any[] = await cachedQuery<any[]>(`directorio_${groupName}`, async () => {
        const { data: directorio, error } = await supabase.rpc('directorio_grupo');
        if (error && isRetryableError(error)) throw error;
        if (!error && directorio && directorio.length > 0) return directorio;
        return must(await supabase.from('profiles').select('*')) || [];
      }, []);

      if (!data || data.length === 0) return [];

      // Filtrar por unidad de forma flexible
      let filtered = data.filter(p => {
        if (!p.unit) return true; // Incluir si no tiene unidad especificada
        let pUnit = (p.unit || '').toLowerCase().trim();
        if (pUnit === 'comunidad') pUnit = 'caminantes';
        return pUnit === targetUnit || pUnit.includes(targetUnit) || targetUnit.includes(pUnit);
      });

      // Fallback absoluto: Si el filtro de unidad deja la lista vacía pero hay perfiles registrados en la BD, mostrar todos los perfiles
      if (filtered.length === 0 && data.length > 0) {
        filtered = data;
      }

      return filtered.map(p => {
        const isOnline = presenceService.isUserOnline(p.id, p.updated_at);
        return {
          ...p,
          name: p.name || p.full_name || 'Scout',
          isOnline
        };
      });
    } catch (e) {
      console.error('Error en getUnitRoversDirectory:', e);
      return [];
    }
  },

  async updateQuarterlyPlanByScouter(planId: string, feedback: string, status: string) {
    const res = await outbox.run('row.update', {
      table: 'quarterly_plans',
      values: { scouter_feedback: feedback, status },
      match: { id: planId },
    }, { dedupeKey: `qplanreview:${planId}`, label: 'Revisión de plan trimestral' });
    return res.queued ? { id: planId, scouter_feedback: feedback, status, _pending: true } : res.result;
  },

  async updateCedula(scoutId: string, cedula: string) {
    await this.updateProfileFields(scoutId, { cedula: cedula.trim() }, 'Cédula actualizada').catch(e => console.warn('Aviso actualizando cédula:', e));
  },

  /** Actualiza columnas del perfil; sin red queda en cola. */
  async updateProfileFields(profileId: string, values: Record<string, any>, label = 'Perfil actualizado') {
    const keys = Object.keys(values).sort().join(',');
    return outbox.run('row.update', { table: 'profiles', values, match: { id: profileId } }, {
      dedupeKey: `profile:${profileId}:${keys}`,
      label,
    });
  },

  /** Fila completa del perfil, con copia offline y los cambios pendientes ya aplicados. */
  async getProfileRow(profileId: string): Promise<any | null> {
    const row = await cachedQuery<any>(`profile_row_${profileId}`, async () =>
      must(await supabase.from('profiles').select('*').eq('id', profileId).maybeSingle()) || null, null);
    const ops = await outbox.pending();
    let merged = row ? { ...row } : null;
    for (const o of ops) {
      const p = o.payload || {};
      if (o.type === 'row.update' && p.table === 'profiles' && p.match?.id === profileId) {
        merged = { ...(merged || { id: profileId }), ...p.values };
      } else if (o.type === 'profile.mergeJson' && p.id === profileId) {
        merged = merged || { id: profileId };
        let base = merged[p.column] || {};
        if (typeof base === 'string') { try { base = JSON.parse(base); } catch { base = {}; } }
        merged[p.column] = { ...base, ...p.patch };
      }
    }
    return merged;
  },

  /** Sube una foto de perfil y guarda su URL; sin red queda en cola (la imagen viaja en la cola). */
  async setProfilePhoto(profileId: string, field: 'avatar_url' | 'custom_avatar_url', dataUrlOrHttp: string) {
    return outbox.run<string>('profile.photo', { profileId, field, image: dataUrlOrHttp }, {
      dedupeKey: `photo:${profileId}:${field}`,
      label: 'Foto de perfil',
    });
  },

  /** Mezcla campos dentro de una columna JSON del perfil (medical_data, curriculum_data) sin pisar el resto. */
  async mergeProfileJson(profileId: string, column: 'medical_data' | 'curriculum_data', patch: Record<string, any>, label = 'Datos guardados') {
    return outbox.run('profile.mergeJson', { id: profileId, column, patch }, {
      dedupeKey: `profilejson:${profileId}:${column}:${Object.keys(patch).sort().join(',')}`,
      label,
    });
  },

  async proposeMembershipDate(scoutId: string, expiresAt: string) {
    await this.updateProfileFields(scoutId, {
      membership_expires_at: expiresAt,
      membership_status: 'pending_approval',
      membership_rejected_reason: null
    }, 'Fecha de membresía propuesta').catch(e => console.warn('Aviso proponiendo membresía:', e));
  },

  /** `expiresAt` y `byName` se guardan en el historial de membresía (año por año). */
  async approveMembershipDate(scoutId: string, expiresAt?: string | null, byName?: string | null) {
    await outbox.run('row.update', {
      table: 'profiles',
      values: { membership_status: 'approved', membership_rejected_reason: null },
      match: { id: scoutId },
    }, { dedupeKey: `membership:${scoutId}`, label: 'Membresía aprobada' }).catch(e => console.warn('Aviso aprobando membresía:', e));
    await this._recordMembershipHistory(scoutId, { status: 'approved', expiresAt, byName });
  },

  async rejectMembershipDate(scoutId: string, reason: string, expiresAt?: string | null, byName?: string | null) {
    await this._recordMembershipHistory(scoutId, { status: 'rejected', expiresAt, byName, reason });
    await outbox.run('row.update', {
      table: 'profiles',
      values: { membership_status: 'rejected', membership_rejected_reason: reason },
      match: { id: scoutId },
      notify: {
        receiverId: scoutId,
        title: '📑 Registro de Membresía Devuelto',
        message: reason && reason.trim()
          ? `Tu fecha de registro/membresía fue devuelta: ${reason}`
          : 'Tu dirigente ha revisado tu fecha de membresía y requiere corrección.',
        type: 'membership'
      },
    }, { dedupeKey: `membership:${scoutId}`, label: 'Membresía devuelta' }).catch(e => console.warn('Aviso rechazando membresía:', e));
  },

  // ───────────────────────── Administración de grupos y roles ─────────────────────────
  // Se hace en línea (no por la cola): son cambios de permisos y la base de datos puede
  // rechazarlos (regla proteger_perfil); el dirigente tiene que ver el motivo al momento.

  /**
   * Grupos del catálogo `scout_groups` (columnas region_id / district_id) y distritos de
   * `scout_districts`. `missingTable` = falta ejecutar supabase_administracion.sql.
   */
  async getScoutGroups(): Promise<{ groups: any[]; districts: any[]; missingTable: boolean }> {
    try {
      const [gr, dr] = await Promise.all([
        supabase.from('scout_groups').select('id,name,region_id,district_id,active').order('name'),
        supabase.from('scout_districts').select('id,region_id,name').order('name'),
      ]);
      if (gr.error) {
        const missing = ['42P01', '42703', 'PGRST204', 'PGRST205'].includes(gr.error.code) || /active|scout_groups/.test(gr.error.message || '');
        if (!missing) throw gr.error;
        const cached = (await readCached<any>('admin_groups_v2')) || {};
        return { groups: cached.groups || [], districts: cached.districts || [], missingTable: true };
      }
      const groups = (gr.data || []).map((g: any) => ({ id: g.id, name: g.name, region: g.region_id, district: g.district_id, active: g.active }));
      const districts = dr.error ? [] : (dr.data || []);
      writeCached('admin_groups_v2', { groups, districts });
      return { groups, districts, missingTable: false };
    } catch {
      const cached = (await readCached<any>('admin_groups_v2')) || {};
      return { groups: cached.groups || [], districts: cached.districts || [], missingTable: false };
    }
  },

  /** Crea un grupo. Si `newDistrictName` viene, crea antes el distrito (Comisionado Regional / admin). */
  async createScoutGroup(g: { name: string; region: string; district: string; newDistrictName?: string }, createdBy?: string) {
    if (!isOnline()) throw new Error('Necesitas conexión a internet para crear un grupo.');
    if (g.newDistrictName) {
      const { error: de } = await supabase.from('scout_districts')
        .insert({ id: g.district, region_id: g.region, name: g.newDistrictName.trim() });
      if (de && !isDuplicateError(de)) {
        throw new Error(de.code === '42501' ? 'Solo un Comisionado Regional o el admin puede crear distritos nuevos.' : de.message);
      }
    }
    const row = { name: g.name.trim(), region_id: g.region, district_id: g.district, active: true, created_by: createdBy || null };
    const { data, error } = await supabase.from('scout_groups').insert(row).select('id,name,region_id,district_id,active').single();
    if (error) {
      if (isDuplicateError(error)) throw new Error('Ya existe un grupo con ese nombre.');
      if (error.code === '42501') throw new Error('Solo puedes crear grupos dentro de tu territorio.');
      throw new Error(error.message);
    }
    return data;
  },

  async setScoutGroupActive(id: string, active: boolean) {
    if (!isOnline()) throw new Error('Necesitas conexión a internet.');
    must(await supabase.from('scout_groups').update({ active }).eq('id', id));
  },

  /** Personas que este usuario puede administrar (la base de datos ya limita por territorio). */
  async getAdminPeople(scope: { role?: string; region?: string | null; district?: string | null; group_name?: string | null }) {
    return cachedQuery<any[]>(`admin_people_${scope.role}_${scope.region || ''}_${scope.district || ''}_${scope.group_name || ''}`, async () => {
      let q = supabase
        .from('profiles')
        .select('id,name,email,cedula,role,unit,group_name,region,district,account_status,birth_date,created_at')
        .order('name');
      if (scope.role === 'jefe_grupo' && scope.group_name) q = q.eq('group_name', scope.group_name);
      else if (scope.role === 'comisionado_regional' && scope.region) q = q.eq('region', scope.region);
      else if ((scope.role === 'comisionado_distrital' || scope.role === 'comisionado') && scope.district) q = q.eq('district', scope.district);
      return must(await q) as any[];
    }, []);
  },

  /**
   * Cambia rol, rama, grupo o estado de una persona y le avisa. `changes` solo lleva lo que cambió.
   * Errores de la regla proteger_perfil llegan con su mensaje en español.
   */
  async updateMemberAdmin(
    member: { id: string; name?: string },
    changes: { role?: string; unit?: string; group_name?: string; region?: string | null; district?: string | null; account_status?: string },
    notice?: { senderId?: string; text: string }
  ) {
    if (!isOnline()) throw new Error('Necesitas conexión a internet para cambiar roles o grupos.');
    const { data, error } = await supabase.from('profiles').update(changes).eq('id', member.id).select('id');
    if (error) throw new Error(error.message || 'No se pudo guardar.');
    if (!data || !data.length) throw new Error('No tienes permiso para modificar a esta persona.');
    if (notice?.text) {
      notificationService.sendNotification({
        senderId: notice.senderId,
        receiverId: member.id,
        title: '🛡️ Cambio en tu cuenta',
        message: notice.text,
        type: 'info',
      }).catch(() => {});
    }
  },

  /** Scouter / Jefatura aprueban o rechazan una cuenta nueva (account_status). */
  async setAccountStatus(memberId: string, status: 'approved' | 'rejected', groupName?: string | null) {
    await outbox.run('row.update', {
      table: 'profiles',
      values: { account_status: status },
      match: { id: memberId },
      notify: {
        receiverId: memberId,
        title: status === 'approved' ? '✅ Cuenta aprobada' : 'Cuenta no aprobada',
        message: status === 'approved'
          ? `Tu cuenta fue aprobada${groupName ? ` en ${groupName}` : ''}. Ya puedes usar el Plan Progresivo.`
          : 'Tu solicitud de acceso no fue aprobada. Habla con tu Scouter o la Jefatura de tu grupo.',
        type: 'info',
      },
    }, { dedupeKey: `account:${memberId}`, label: status === 'approved' ? 'Cuenta aprobada' : 'Cuenta rechazada' });
  },

  async deleteProfilePhotoWithReason(scoutId: string, reason: string, photoType: 'scout' | 'custom' | 'both' = 'both') {
    const updatePayload: any = { photo_rejected_reason: reason || null };
    if (photoType === 'scout' || photoType === 'both') updatePayload.avatar_url = null;
    if (photoType === 'custom' || photoType === 'both') updatePayload.custom_avatar_url = null;
    const typeLabel = photoType === 'custom' ? 'Foto Personal' : (photoType === 'scout' ? 'Foto Scout con Uniforme' : 'Foto de Perfil');

    await outbox.run('row.update', {
      table: 'profiles',
      values: updatePayload,
      match: { id: scoutId },
      notify: {
        receiverId: scoutId,
        title: `📷 ${typeLabel} Removida por Dirigente`,
        message: reason && reason.trim()
          ? `Tu dirigente ha solicitado cambiar tu ${typeLabel.toLowerCase()}: ${reason}`
          : `Tu dirigente ha removido tu ${typeLabel.toLowerCase()}. Por favor sube una foto adecuada.`,
        type: 'alert'
      },
    }, { label: 'Foto de perfil removida' }).catch(e => console.warn('Aviso eliminando foto de perfil:', e));
  },

  // --- REGISTROS GUARDADOS EN `certificates` POR CATEGORÍA (noches, vida de grupo, CIP, vínculos) ---
  // Red primero (así el dirigente ve lo último), con lo pendiente offline encima, y copia local de respaldo.
  async _getCategoryRows(scoutId: string, category: string, localKey: string, mapRow: (d: any) => any) {
    const res = await supabase
      .from('certificates')
      .select('*')
      .eq('scout_id', scoutId)
      .eq('category', category)
      .order('created_at', { ascending: false });

    if (res.error) {
      try {
        const raw = await AsyncStorage.getItem(localKey);
        if (raw) return JSON.parse(raw);
      } catch {}
      return [];
    }

    const remoteRows = res.data || [];
    await this._rescueLocalOnlyRows(scoutId, category, localKey, remoteRows);
    const pend = await pendingCertificateRows(scoutId);
    const rows = applyPendingRows(remoteRows, pend, r => r.category === category);
    const entries = rows.map(mapRow);
    AsyncStorage.setItem(localKey, JSON.stringify(entries)).catch(() => {});
    return entries;
  },

  /**
   * Antes de esta versión, estos registros se creaban con ids tipo "night_123" y la
   * columna `certificates.id` es UUID: el insert fallaba siempre y solo quedaban en el
   * teléfono. La primera vez que se leen con red, se suben los que falten.
   */
  async _rescueLocalOnlyRows(scoutId: string, category: string, localKey: string, remoteRows: any[]) {
    const flagKey = `@scout_rescued_v1_${localKey}`;
    try {
      if (await AsyncStorage.getItem(flagKey)) return;
      const raw = await AsyncStorage.getItem(localKey);
      const local: any[] = raw ? JSON.parse(raw) : [];
      const remoteIds = new Set(remoteRows.map(r => r.id));
      const isUuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id || '');
      const remoteTitles = new Set(remoteRows.map(r => r.title));
      const lost = category.startsWith('cip_sel_')
        ? local.filter(e => e && e.title && !remoteTitles.has(e.title))
        : local.filter(e => e && e.id && !isUuid(e.id) && !remoteIds.has(e.id));
      for (const e of lost) {
        const row = legacyEntryToRow(scoutId, category, e);
        if (row) await outbox.enqueue('row.insert', { table: 'certificates', row }, { label: 'Registro recuperado del teléfono' });
      }
      await AsyncStorage.setItem(flagKey, '1');
    } catch (err) {
      console.warn('Aviso recuperando registros locales:', err);
    }
  },

  // --- GESTIÓN DE REGISTRO DE NOCHES DE VIDA AL AIRE LIBRE ---
  async getNightsLog(scoutId: string, stageId: string, reqId: string) {
    const key = `@scout_noches_${scoutId}_${stageId}_${reqId}`;
    return this._getCategoryRows(scoutId, `aire_libre_${stageId}_${reqId}`, key, d => {
      let dateVal = d.created_at ? d.created_at.split('T')[0] : '';
      let notesVal = '';
      if (d.file_url) {
        if (d.file_url.startsWith('date:')) {
          dateVal = d.file_url.replace('date:', '');
        } else if (d.file_url.startsWith('{')) {
          try {
            const meta = JSON.parse(d.file_url);
            if (meta.date) dateVal = meta.date;
            if (meta.notes) notesVal = meta.notes;
          } catch {}
        }
      }
      return {
        id: d.id,
        date: dateVal,
        location: d.title || 'Campamento / Pernocta',
        nightsCount: parseInt(d.level || '1', 10) || 1,
        notes: notesVal,
        createdAt: d.created_at,
        pending: !!d._pending
      };
    });
  },

  async addNightEntry(scoutId: string, stageId: string, reqId: string, entry: { date: string; location: string; nightsCount: number; notes?: string }) {
    const row = {
      id: newId(),
      scout_id: scoutId,
      category: `aire_libre_${stageId}_${reqId}`,
      title: entry.location || 'Campamento / Pernocta',
      level: String(entry.nightsCount || 1),
      file_url: JSON.stringify({ date: entry.date, notes: entry.notes || '' })
    };
    const res = await outbox.run('row.insert', { table: 'certificates', row }, { label: `Noche: ${row.title}` });
    const newEntry = { ...entry, id: row.id, createdAt: new Date().toISOString(), pending: res.queued };
    const key = `@scout_noches_${scoutId}_${stageId}_${reqId}`;
    let current: any[] = [];
    try { current = JSON.parse((await AsyncStorage.getItem(key)) || '[]'); } catch {}
    const updated = [newEntry, ...current.filter(e => e.id !== row.id)];
    await AsyncStorage.setItem(key, JSON.stringify(updated)).catch(() => {});
    return updated;
  },

  async deleteNightEntry(scoutId: string, stageId: string, reqId: string, entryId: string) {
    await this._deleteCategoryRow(entryId, 'Noche eliminada');
    const key = `@scout_noches_${scoutId}_${stageId}_${reqId}`;
    let current: any[] = [];
    try { current = JSON.parse((await AsyncStorage.getItem(key)) || '[]'); } catch {}
    const updated = current.filter((e: any) => e.id !== entryId);
    await AsyncStorage.setItem(key, JSON.stringify(updated)).catch(() => {});
    return updated;
  },

  /** Borra una fila de certificates; si nunca llegó a subirse, basta con sacarla de la cola. */
  async _deleteCategoryRow(rowId: string, label: string) {
    const removed = await outbox.removeWhere(o =>
      o.type === 'row.insert' && o.payload?.table === 'certificates' && o.payload?.row?.id === rowId);
    if (removed > 0) return;
    await outbox.run('row.delete', { table: 'certificates', match: { id: rowId } }, { label });
  },

  // --- GESTIÓN DE REGISTRO DE VIDA DE GRUPO (PEREGRINAJES, CAMPAMENTOS, PROYECTOS) ---
  async getVidaGrupoLog(scoutId: string, stageId: string, reqId: string) {
    const key = `@scout_vidagrupo_${scoutId}_${stageId}_${reqId}`;
    return this._getCategoryRows(scoutId, `vida_grupo_${stageId}_${reqId}`, key, d => {
      let meta: any = {};
      if (d.file_url && d.file_url.startsWith('{')) {
        try { meta = JSON.parse(d.file_url); } catch {}
      }
      return {
        id: d.id,
        type: (meta.type || d.level || 'peregrinaje') as any,
        subtype: meta.subtype || d.level || undefined,
        location: meta.location || '',
        title: d.title || 'Evento de Vida de Grupo',
        date: meta.date || (d.created_at ? d.created_at.split('T')[0] : ''),
        description: meta.description || '',
        createdAt: d.created_at,
        pending: !!d._pending
      };
    });
  },

  async addVidaGrupoEntry(
    scoutId: string,
    stageId: string,
    reqId: string,
    entry: { type: string; subtype?: string; location: string; title: string; date: string; description?: string }
  ) {
    const row = {
      id: newId(),
      scout_id: scoutId,
      category: `vida_grupo_${stageId}_${reqId}`,
      title: entry.title || 'Evento de Vida de Grupo',
      level: entry.subtype || entry.type || null,
      file_url: JSON.stringify({
        type: entry.type,
        subtype: entry.subtype || null,
        location: entry.location || '',
        date: entry.date || todayLocal(),
        description: entry.description || ''
      })
    };
    const res = await outbox.run('row.insert', { table: 'certificates', row }, { label: `Vida de grupo: ${row.title}` });
    const newEntry = { ...entry, id: row.id, createdAt: new Date().toISOString(), pending: res.queued };
    const key = `@scout_vidagrupo_${scoutId}_${stageId}_${reqId}`;
    let current: any[] = [];
    try { current = JSON.parse((await AsyncStorage.getItem(key)) || '[]'); } catch {}
    await AsyncStorage.setItem(key, JSON.stringify([newEntry, ...current.filter(e => e.id !== row.id)])).catch(() => {});
    return newEntry;
  },

  async deleteVidaGrupoEntry(scoutId: string, stageId: string, reqId: string, entryId: string) {
    await this._deleteCategoryRow(entryId, 'Vida de grupo eliminada');
    const key = `@scout_vidagrupo_${scoutId}_${stageId}_${reqId}`;
    let current: any[] = [];
    try { current = JSON.parse((await AsyncStorage.getItem(key)) || '[]'); } catch {}
    const updated = current.filter((e: any) => e.id !== entryId);
    await AsyncStorage.setItem(key, JSON.stringify(updated)).catch(() => {});
    return updated;
  },

  // --- ACTIVIDADES PERSONALES (de creación propia del Rover) ---
  // Se guardan como filas de `certificates` con categoría personal_<etapa>_<requisito>.
  async getPersonalActivities(scoutId: string, stageId: string, reqId: string) {
    const key = `@scout_personales_${scoutId}_${stageId}_${reqId}`;
    return this._getCategoryRows(scoutId, `personal_${stageId}_${reqId}`, key, d => {
      let meta: any = {};
      if (d.file_url && d.file_url.startsWith('{')) {
        try { meta = JSON.parse(d.file_url); } catch {}
      }
      return {
        id: d.id,
        title: d.title || 'Actividad personal',
        date: meta.date || (d.created_at ? d.created_at.split('T')[0] : ''),
        description: meta.description || '',
        createdAt: d.created_at,
        pending: !!d._pending
      };
    });
  },

  async addPersonalActivity(scoutId: string, stageId: string, reqId: string, entry: { title: string; date: string; description?: string }) {
    const row = {
      id: newId(),
      scout_id: scoutId,
      category: `personal_${stageId}_${reqId}`,
      title: entry.title || 'Actividad personal',
      level: null,
      file_url: JSON.stringify({ date: entry.date || todayLocal(), description: entry.description || '' })
    };
    const res = await outbox.run('row.insert', { table: 'certificates', row }, { label: `Actividad personal: ${row.title}` });
    const newEntry = { ...entry, id: row.id, createdAt: new Date().toISOString(), pending: res.queued };
    const key = `@scout_personales_${scoutId}_${stageId}_${reqId}`;
    let current: any[] = [];
    try { current = JSON.parse((await AsyncStorage.getItem(key)) || '[]'); } catch {}
    const updated = [newEntry, ...current.filter(e => e.id !== row.id)];
    await AsyncStorage.setItem(key, JSON.stringify(updated)).catch(() => {});
    return updated;
  },

  async deletePersonalActivity(scoutId: string, stageId: string, reqId: string, entryId: string) {
    await this._deleteCategoryRow(entryId, 'Actividad personal eliminada');
    const key = `@scout_personales_${scoutId}_${stageId}_${reqId}`;
    let current: any[] = [];
    try { current = JSON.parse((await AsyncStorage.getItem(key)) || '[]'); } catch {}
    const updated = current.filter((e: any) => e.id !== entryId);
    await AsyncStorage.setItem(key, JSON.stringify(updated)).catch(() => {});
    return updated;
  },

  // --- MEMBRESÍA: COMPROBANTES DE PAGO E HISTORIAL POR AÑO ---
  // Filas de `certificates`: categoría membresia_pago (comprobante que sube el miembro)
  // y membresia_hist (cada aprobación o devolución de Jefatura). No necesitan SQL nuevo.
  async getMembershipRecords(scoutId: string): Promise<{ receipts: MembershipReceipt[]; history: MembershipHistoryEntry[] }> {
    const parse = (d: any) => {
      if (d.file_url && String(d.file_url).startsWith('{')) {
        try { return JSON.parse(d.file_url); } catch {}
      }
      return {};
    };
    const [receipts, history] = await Promise.all([
      this._getCategoryRows(scoutId, 'membresia_pago', `@scout_mem_pago_${scoutId}`, (d: any): MembershipReceipt => {
        const m = parse(d);
        return {
          id: d.id,
          year: m.year || d.level || '',
          imageUrl: m.imageUrl || '',
          reference: m.reference || '',
          amount: m.amount || '',
          paidOn: m.paidOn || '',
          createdAt: d.created_at || m.createdAt || '',
          pending: !!d._pending,
        };
      }),
      this._getCategoryRows(scoutId, 'membresia_hist', `@scout_mem_hist_${scoutId}`, (d: any): MembershipHistoryEntry => {
        const m = parse(d);
        return {
          id: d.id,
          status: m.status === 'rejected' ? 'rejected' : 'approved',
          expiresAt: m.expiresAt || '',
          year: m.year || d.level || '',
          byName: m.byName || '',
          reason: m.reason || '',
          decidedAt: m.decidedAt || d.created_at || '',
          pending: !!d._pending,
        };
      }),
    ]);
    return { receipts, history };
  },

  /** El miembro sube su comprobante. La imagen necesita internet (se guarda en Storage). */
  async addMembershipReceipt(scoutId: string, entry: { imageDataUrl?: string | null; reference?: string; amount?: string; paidOn?: string; year?: string }) {
    let imageUrl = '';
    if (entry.imageDataUrl) {
      if (!isOnline()) throw new Error('Para adjuntar la foto del comprobante necesitas internet. Puedes guardar solo el número de referencia y agregar la foto después.');
      let url = '';
      try {
        url = await storageService.uploadImage('scout-files', 'membresias', `pago_${scoutId}.png`, entry.imageDataUrl, { throwOnNetworkError: true });
      } catch {
        throw new Error('No hay conexión con el servidor para subir la foto. Guarda solo el número de referencia o inténtalo más tarde.');
      }
      if (!url || !url.startsWith('http')) throw new Error('No se pudo subir la imagen del comprobante. Inténtalo de nuevo.');
      imageUrl = url;
    }
    const year = entry.year || String(new Date().getFullYear());
    const row = {
      id: newId(),
      scout_id: scoutId,
      category: 'membresia_pago',
      title: `Comprobante de membresía ${year}`,
      level: year,
      file_url: JSON.stringify({
        year,
        imageUrl,
        reference: (entry.reference || '').trim().slice(0, 80),
        amount: (entry.amount || '').trim().slice(0, 40),
        paidOn: entry.paidOn || todayLocal(),
        createdAt: new Date().toISOString(),
      }),
    };
    const res = await outbox.run('row.insert', { table: 'certificates', row }, { label: `Comprobante de membresía ${year}` });
    const meta = JSON.parse(row.file_url);
    await this._prependLocalEntry(`@scout_mem_pago_${scoutId}`, {
      id: row.id, year, imageUrl, reference: meta.reference, amount: meta.amount, paidOn: meta.paidOn,
      createdAt: meta.createdAt, pending: res.queued,
    });
    return { id: row.id, pending: res.queued };
  },

  /** Copia local para que lo recién guardado se vea también sin conexión. */
  async _prependLocalEntry(key: string, entry: any) {
    let current: any[] = [];
    try { current = JSON.parse((await AsyncStorage.getItem(key)) || '[]'); } catch {}
    await AsyncStorage.setItem(key, JSON.stringify([entry, ...current.filter(e => e?.id !== entry.id)])).catch(() => {});
  },

  async deleteMembershipReceipt(scoutId: string, receiptId: string) {
    await this._deleteCategoryRow(receiptId, 'Comprobante eliminado');
    const key = `@scout_mem_pago_${scoutId}`;
    try {
      const current: any[] = JSON.parse((await AsyncStorage.getItem(key)) || '[]');
      await AsyncStorage.setItem(key, JSON.stringify(current.filter(e => e?.id !== receiptId)));
    } catch {}
  },

  async _recordMembershipHistory(scoutId: string, e: { status: 'approved' | 'rejected'; expiresAt?: string | null; byName?: string | null; reason?: string }) {
    const year = (e.expiresAt || '').slice(0, 4) || String(new Date().getFullYear());
    const row = {
      id: newId(),
      scout_id: scoutId,
      category: 'membresia_hist',
      title: e.status === 'approved' ? `Membresía ${year} aprobada` : `Membresía ${year} devuelta`,
      level: year,
      file_url: JSON.stringify({
        status: e.status,
        expiresAt: e.expiresAt || '',
        year,
        byName: e.byName || '',
        reason: e.reason || '',
        decidedAt: new Date().toISOString(),
      }),
    };
    try {
      const res = await outbox.run('row.insert', { table: 'certificates', row }, { label: 'Historial de membresía' });
      const meta = JSON.parse(row.file_url);
      await this._prependLocalEntry(`@scout_mem_hist_${scoutId}`, {
        id: row.id, status: e.status, expiresAt: meta.expiresAt, year, byName: meta.byName, reason: meta.reason,
        decidedAt: meta.decidedAt, pending: res.queued,
      });
    } catch (err) {
      console.warn('Aviso guardando historial de membresía:', err);
    }
  },

  // --- GESTIÓN DE SELECCIONES MÚLTIPLES DE CIP / CICLOS INSTITUCIONALES ---
  async getCipSelections(scoutId: string, stageId: string, reqId: string) {
    const key = `@scout_cip_selections_${scoutId}_${stageId}_${reqId}`;
    // Si hay un cambio sin enviar, lo local manda
    const pendingReplace = (await outbox.pending('certificates.replaceCategory'))
      .filter(o => o.payload?.scoutId === scoutId && o.payload?.category === `cip_sel_${stageId}_${reqId}`).pop();
    if (pendingReplace) {
      try { return JSON.parse((await AsyncStorage.getItem(key)) || '[]'); } catch { return []; }
    }
    return this._getCategoryRows(scoutId, `cip_sel_${stageId}_${reqId}`, key, d => {
      let meta: any = {};
      if (d.file_url && d.file_url.startsWith('{')) {
        try { meta = JSON.parse(d.file_url); } catch {}
      }
      return {
        id: meta.eventId || d.id,
        title: d.title,
        scope: d.level || 'distrital',
        date: meta.date || (d.created_at ? d.created_at.split('T')[0] : ''),
        location: meta.location || '',
        description: meta.description || ''
      };
    });
  },

  async saveCipSelections(scoutId: string, stageId: string, reqId: string, events: any[]) {
    const key = `@scout_cip_selections_${scoutId}_${stageId}_${reqId}`;
    await AsyncStorage.setItem(key, JSON.stringify(events)).catch(() => {});

    const category = `cip_sel_${stageId}_${reqId}`;
    const rows = events.map(evt => ({
      // Cada selección es una fila propia (el id del evento original va en file_url)
      id: newId(),
      scout_id: scoutId,
      category,
      title: evt.title,
      level: evt.scope || 'distrital',
      file_url: JSON.stringify({
        eventId: evt.id || null,
        location: evt.location || '',
        description: evt.description || '',
        date: evt.date || ''
      })
    }));
    await outbox.run('certificates.replaceCategory', { scoutId, category, rows }, {
      dedupeKey: `catreplace:${scoutId}:${category}`,
      label: 'Selección de CIP',
    }).catch(e => console.warn('Aviso guardando CIP en Supabase:', e));

    return events;
  },

  // --- GESTIÓN DE VINCULACIÓN DE CERTIFICADOS / ESPECIALIDADES / CURSOS ---
  async saveLinkedCertificate(
    scoutId: string,
    stageId: string,
    reqId: string,
    certData: { certId?: string; certTitle: string; level?: string; date?: string } | null
  ) {
    const key = `@scout_req_linked_${scoutId}_${stageId}_${reqId}`;
    if (certData) {
      await AsyncStorage.setItem(key, JSON.stringify(certData)).catch(() => {});
    } else {
      await AsyncStorage.removeItem(key).catch(() => {});
    }

    const category = `linked_cert_${stageId}_${reqId}`;
    const rows = certData ? [{
      id: newId(),
      scout_id: scoutId,
      title: certData.certTitle,
      category,
      level: certData.level || null,
      file_url: JSON.stringify(certData)
    }] : [];
    await outbox.run('certificates.replaceCategory', { scoutId, category, rows }, {
      dedupeKey: `catreplace:${scoutId}:${category}`,
      label: 'Certificado vinculado a requisito',
    }).catch(e => console.warn('Aviso guardando vinculacion en Supabase:', e));
  },

  async getAllLinkedCertificates(scoutId: string): Promise<Record<string, { certId?: string; certTitle: string; level?: string; date?: string }>> {
    const result: Record<string, { certId?: string; certTitle: string; level?: string; date?: string }> = {};
    let remoteLoaded = false;

    // 1. Cargar desde Supabase
    try {
      const { data, error } = await supabase
        .from('certificates')
        .select('*')
        .eq('scout_id', scoutId)
        .like('category', 'linked_cert_%');

      if (!error) remoteLoaded = true;
      if (!error && data && data.length > 0) {
        for (const row of data) {
          const rawCat = row.category.replace('linked_cert_', '');
          let parsedDesc: any = null;
          if (row.file_url && row.file_url.startsWith('{')) {
            try { parsedDesc = JSON.parse(row.file_url); } catch {}
          }

          const certObj = {
            certId: parsedDesc?.certId || row.id,
            certTitle: parsedDesc?.certTitle || row.title,
            level: parsedDesc?.level || row.level,
            date: parsedDesc?.date || (row.created_at ? row.created_at.split('T')[0] : '')
          };

          result[rawCat] = certObj;

          // Separar stageId y reqId para indexado exacto
          for (const stg of stagesData) {
            if (rawCat.startsWith(stg.id + '_')) {
              const reqId = rawCat.replace(stg.id + '_', '');
              result[`${stg.id}_${reqId}`] = certObj;
              AsyncStorage.setItem(`@scout_req_linked_${scoutId}_${stg.id}_${reqId}`, JSON.stringify(certObj)).catch(() => {});
            }
          }
        }
      }
    } catch (e) {
      console.warn('Aviso cargando vinculaciones desde Supabase:', e);
    }

    // 2. Cargar fallbacks desde AsyncStorage (vínculos hechos en este teléfono)
    const pendingCats = new Set((await outbox.pending('certificates.replaceCategory'))
      .filter(o => o.payload?.scoutId === scoutId).map(o => o.payload.category));
    for (const stg of stagesData) {
      for (const r of stg.requirements) {
        if (r.type === 'cursos' || r.type === 'especialidad') {
          const key = `@scout_req_linked_${scoutId}_${stg.id}_${r.id}`;
          const category = `linked_cert_${stg.id}_${r.id}`;
          if (!result[`${stg.id}_${r.id}`] || pendingCats.has(category)) {
            try {
              const localStr = await AsyncStorage.getItem(key);
              if (localStr) {
                const parsed = JSON.parse(localStr);
                result[`${stg.id}_${r.id}`] = parsed;
                // Vínculo que nunca llegó al servidor (versiones anteriores fallaban): subirlo
                if (remoteLoaded && !pendingCats.has(category) && parsed?.certTitle) {
                  this.saveLinkedCertificate(scoutId, stg.id, r.id, parsed).catch(() => {});
                }
              }
            } catch {}
          }
        }
      }
    }

    return result;
  },

  async getLinkedCertificate(scoutId: string, stageId: string, reqId: string) {
    const key = `@scout_req_linked_${scoutId}_${stageId}_${reqId}`;
    try {
      const localStr = await AsyncStorage.getItem(key);
      if (localStr) return JSON.parse(localStr);
    } catch {}

    try {
      const { data } = await supabase
        .from('certificates')
        .select('*')
        .or(`scout_id.eq.${scoutId},user_id.eq.${scoutId}`)
        .eq('category', `linked_cert_${stageId}_${reqId}`)
        .limit(1);

      if (data && data.length > 0) {
        const row = data[0];
        let parsedDesc: any = null;
        try { if (row.description) parsedDesc = JSON.parse(row.description); } catch {}

        const certObj = {
          certId: parsedDesc?.certId || row.notes || row.id,
          certTitle: parsedDesc?.certTitle || row.title,
          level: parsedDesc?.level || row.level,
          date: parsedDesc?.date || row.date
        };

        await AsyncStorage.setItem(key, JSON.stringify(certObj)).catch(() => {});
        return certObj;
      }
    } catch {}

    return null;
  }
};

// ----------------------------------------------------
// MANEJADORES DE LA COLA OFFLINE (se ejecutan al haber red, en orden)
// Cada uno debe LANZAR el error si falla, para que la cola sepa si reintentar.
// ----------------------------------------------------
function assertTable(table: string) {
  if (!OUTBOX_TABLES.has(table)) throw new Error(`Tabla no permitida en la cola offline: ${table}`);
}

function applyMatch(query: any, match: Record<string, any>) {
  Object.entries(match || {}).forEach(([k, v]) => { query = query.eq(k, v); });
  return query;
}

async function sendNotify(notify: any) {
  if (!notify) return;
  await notificationService.sendNotification(notify).catch(() => {});
}

outbox.register('row.insert', async ({ table, row, rows, notify }) => {
  assertTable(table);
  const { error } = await supabase.from(table).insert(rows || row);
  // Si el insert sí llegó pero se perdió la respuesta, al reintentar da "duplicado": ya está guardado.
  if (error && !isDuplicateError(error)) throw error;
  // Aviso asociado (p. ej. nueva actividad en el calendario): sale cuando el dato ya está en el servidor
  if (!error) await sendNotify(notify);
});

outbox.register('row.update', async ({ table, values, match, notify }) => {
  assertTable(table);
  const data = must(await applyMatch(supabase.from(table).update(values), match).select());
  await sendNotify(notify);
  return Array.isArray(data) ? data[0] : data;
});

outbox.register('row.delete', async ({ table, match }) => {
  assertTable(table);
  must(await applyMatch(supabase.from(table).delete(), match));
});

outbox.register('profile.mergeJson', async ({ id, column, patch }) => {
  if (column !== 'medical_data' && column !== 'curriculum_data') throw new Error('Columna no permitida');
  // Imágenes (firma, foto) guardadas sin red: subirlas primero y guardar solo la URL
  patch = { ...patch };
  for (const [k, v] of Object.entries(patch)) {
    if (typeof v === 'string' && v.startsWith('data:image')) {
      const url = await storageService.uploadImage('scout-files', k.toLowerCase().includes('signature') ? 'signatures' : `avatars/${id}`, `${k}_${id}_${Date.now()}.png`, v, { throwOnNetworkError: true });
      if (url && url.startsWith('http')) patch[k] = url;
    }
  }
  const current: any = must(await supabase.from('profiles').select(column).eq('id', id).maybeSingle());
  let base = current?.[column] || {};
  if (typeof base === 'string') { try { base = JSON.parse(base); } catch { base = {}; } }
  must(await supabase.from('profiles').update({ [column]: { ...base, ...patch } }).eq('id', id));
});

outbox.register('profile.photo', async ({ profileId, field, image }) => {
  if (field !== 'avatar_url' && field !== 'custom_avatar_url') throw new Error('Campo de foto no permitido');
  let url = image;
  if (typeof image === 'string' && image.startsWith('data:')) {
    const prefix = field === 'avatar_url' ? 'scout' : 'custom';
    url = await storageService.uploadImage('scout-files', `avatars/${profileId}`, `${prefix}_avatar_${profileId}_${Date.now()}.jpg`, image, { throwOnNetworkError: true });
  }
  must(await supabase.from('profiles').update({ [field]: url }).eq('id', profileId));
  return url;
});

outbox.register('requirement.set', async ({ scoutId, stageId, reqId, completed }) => {
  const existing: any = must(await supabase
    .from('requirement_progress')
    .select('id')
    .eq('scout_id', scoutId)
    .eq('stage_id', stageId)
    .eq('requirement_id', reqId)
    .maybeSingle());
  if (existing) {
    must(await supabase
      .from('requirement_progress')
      .update({ completed, updated_at: new Date().toISOString() })
      .eq('id', existing.id));
  } else {
    const { error } = await supabase
      .from('requirement_progress')
      .insert({ scout_id: scoutId, stage_id: stageId, requirement_id: reqId, completed });
    if (error && !isDuplicateError(error)) throw error;
  }
});

outbox.register('stage.setStatus', async ({ scoutId, stageId, status, notify, reason, notifyPayload }) => {
  const existing: any = must(await supabase
    .from('stage_progress')
    .select('id')
    .eq('scout_id', scoutId)
    .eq('stage_id', stageId)
    .maybeSingle());
  if (existing) {
    must(await supabase
      .from('stage_progress')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', existing.id));
  } else {
    must(await supabase.from('stage_progress').insert({ scout_id: scoutId, stage_id: stageId, status }));
  }

  const stageTitle = stagesData.find(s => s.id === stageId)?.title || 'Etapa';
  if (notifyPayload) await sendNotify(notifyPayload); // aviso a dirigentes al enviar a revisión
  if (notify === 'approve') {
    await sendNotify({
      receiverId: scoutId,
      title: '🎉 ¡Etapa e Insignia Aprobadas!',
      message: `¡Felicidades! Tu dirigente ha aprobado oficialmente tu etapa "${stageTitle}". Ya pasaste a la siguiente etapa.`,
      type: 'badge'
    });
  } else if (notify === 'reject') {
    await sendNotify({
      receiverId: scoutId,
      title: '📋 Ficha de Etapa Devuelta',
      message: reason
        ? `Tu dirigente devolvió tu etapa "${stageTitle}": ${reason}`
        : `Tu dirigente ha revisado tu etapa "${stageTitle}" y requiere completar requisitos pendientes.`,
      type: 'alert'
    });
  }
});

outbox.register('certificates.replaceCategory', async ({ scoutId, category, rows }) => {
  must(await supabase.from('certificates').delete().eq('scout_id', scoutId).eq('category', category));
  if (rows && rows.length > 0) {
    const { error } = await supabase.from('certificates').insert(rows);
    if (error && !isDuplicateError(error)) throw error;
  }
});

outbox.register('certificate.upload', async ({ scoutId, title, category, level, fileUrl, date }) => {
  return dataService._uploadCertificateNow(scoutId, title, category, level, fileUrl, date);
});

outbox.register('certificate.update', async ({ certificateId, scoutId, updates }) => {
  return dataService._updateCertificateNow(certificateId, scoutId, updates);
});

outbox.register('certificate.delete', async ({ certificateId, scoutId, certTitle, reason, notifyScout }) => {
  must(await supabase.from('certificates').delete().eq('id', certificateId));
  // Solo se avisa cuando lo borra un dirigente (no cuando el scout borra el suyo)
  if (notifyScout === false) return;
  await sendNotify({
    receiverId: scoutId,
    title: `⚠️ Certificado / Especialidad Eliminado: ${certTitle || 'Acreditación'}`,
    message: reason && reason.trim()
      ? `Tu dirigente ha eliminado "${certTitle || 'tu acreditación'}": ${reason}`
      : `Tu dirigente ha eliminado el certificado/especialidad "${certTitle || 'Acreditación'}".`,
    type: 'alert'
  });
});

outbox.register('quarterly.save', async (plan) => {
  return dataService._saveQuarterlyPlanNow(plan);
});
