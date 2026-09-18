import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabaseClient';
import { RequirementProgress, StageStatus } from '../types/progression';
import { stagesData } from '../data/progressionTemplate';
import { notificationService } from '../services/notificationService';
import { presenceService } from '../services/presenceService';
import { storageService } from './storageService';

const SYNC_QUEUE_KEY = '@scout_offline_sync_queue';

interface SyncQueueItem {
  id: string;
  scoutId: string;
  stageId: string;
  reqId: string;
  completed: boolean;
  timestamp: number;
}

export const dataService = {
  // --- MOTOR DE SINCRONIZACIÓN OFFLINE ---
  async getSyncQueue(): Promise<SyncQueueItem[]> {
    try {
      const raw = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  async addToSyncQueue(item: Omit<SyncQueueItem, 'id' | 'timestamp'>) {
    try {
      const queue = await this.getSyncQueue();
      // Eliminar elementos previos del mismo requisito para no duplicar
      const filtered = queue.filter(q => !(q.scoutId === item.scoutId && q.stageId === item.stageId && q.reqId === item.reqId));
      filtered.push({
        ...item,
        id: `${item.scoutId}_${item.stageId}_${item.reqId}_${Date.now()}`,
        timestamp: Date.now()
      });
      await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(filtered));
    } catch (e) {
      console.warn('Error guardando en cola offline:', e);
    }
  },

  async syncPendingRequirements(): Promise<{ synced: number; remaining: number }> {
    const queue = await this.getSyncQueue();
    if (queue.length === 0) return { synced: 0, remaining: 0 };

    const remainingItems: SyncQueueItem[] = [];
    let syncedCount = 0;

    for (const item of queue) {
      try {
        const { data: existing } = await supabase
          .from('requirement_progress')
          .select('id')
          .eq('scout_id', item.scoutId)
          .eq('stage_id', item.stageId)
          .eq('requirement_id', item.reqId)
          .single();

        if (existing) {
          await supabase
            .from('requirement_progress')
            .update({ completed: item.completed, updated_at: new Date().toISOString() })
            .eq('id', existing.id);
        } else {
          await supabase
            .from('requirement_progress')
            .insert({
              scout_id: item.scoutId,
              stage_id: item.stageId,
              requirement_id: item.reqId,
              completed: item.completed
            });
        }
        syncedCount++;
      } catch (err) {
        // Si aún no hay conexión, se mantiene en la cola
        remainingItems.push(item);
      }
    }

    try {
      await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(remainingItems));
    } catch {}

    return { synced: syncedCount, remaining: remainingItems.length };
  },

  async initializeScout(scoutId: string) {
    try {
      const { data: existing } = await supabase
        .from('stage_progress')
        .select('id')
        .eq('scout_id', scoutId)
        .eq('stage_id', 'precursor')
        .single();
        
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
    try {
      const { data } = await supabase
        .from('stage_progress')
        .select('status')
        .eq('scout_id', scoutId)
        .eq('stage_id', stageId)
        .maybeSingle();
        
      if (data?.status) {
        AsyncStorage.setItem(`@scout_stage_status_${scoutId}_${stageId}`, data.status).catch(() => {});
        return data.status as StageStatus;
      } else {
        AsyncStorage.removeItem(`@scout_stage_status_${scoutId}_${stageId}`).catch(() => {});
      }
    } catch (e) {
      // Fallback a almacenamiento local offline solo si hubo error de red
      const local = await AsyncStorage.getItem(`@scout_stage_status_${scoutId}_${stageId}`);
      if (local) return local as StageStatus;
    }
    return stageId === 'precursor' ? 'En Progreso' : 'Bloqueada';
  },

  async getRequirement(scoutId: string, stageId: string, reqId: string): Promise<boolean> {
    const localKey = `@scout_req_${scoutId}_${stageId}_${reqId}`;
    try {
      const { data } = await supabase
        .from('requirement_progress')
        .select('completed')
        .eq('scout_id', scoutId)
        .eq('stage_id', stageId)
        .eq('requirement_id', reqId)
        .maybeSingle();
        
      if (data && data.completed !== undefined && data.completed !== null) {
        AsyncStorage.setItem(localKey, String(data.completed)).catch(() => {});
        return data.completed;
      } else {
        AsyncStorage.removeItem(localKey).catch(() => {});
        return false;
      }
    } catch (e) {
      // Fallback a almacenamiento local offline solo si no hay red
      const local = await AsyncStorage.getItem(localKey);
      if (local !== null) {
        return local === 'true';
      }
    }
    return false;
  },

  async getCompletedCatalogActivityIds(scoutId: string): Promise<string[]> {
    try {
      const { data } = await supabase
        .from('requirement_progress')
        .select('requirement_id')
        .eq('scout_id', scoutId)
        .eq('completed', true);

      if (data) {
        const ids = data.map(item => item.requirement_id);
        AsyncStorage.setItem(`@scout_catalog_ids_${scoutId}`, JSON.stringify(ids)).catch(() => {});
        return ids;
      }
    } catch (e) {
      const local = await AsyncStorage.getItem(`@scout_catalog_ids_${scoutId}`);
      if (local) return JSON.parse(local);
    }
    return [];
  },

  async getProgressForAllStages(scoutId: string) {
    let completedReqSet = new Set<string>();
    try {
      const { data: completedReqs } = await supabase
        .from('requirement_progress')
        .select('stage_id, requirement_id')
        .eq('scout_id', scoutId)
        .eq('completed', true);

      if (completedReqs) {
        completedReqs.forEach(req => {
          completedReqSet.add(`${req.stage_id}:${req.requirement_id}`);
        });
        AsyncStorage.setItem(`@scout_all_completed_${scoutId}`, JSON.stringify(Array.from(completedReqSet))).catch(() => {});
      }
    } catch (e) {
      const local = await AsyncStorage.getItem(`@scout_all_completed_${scoutId}`);
      if (local) {
        const arr = JSON.parse(local);
        completedReqSet = new Set(arr);
      }
    }

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
    // 1. Guardar de inmediato en almacenamiento local para respuesta instantánea (Offline-first)
    await AsyncStorage.setItem(localKey, String(completed));

    // 2. Registrar en la cola de sincronización pendiente
    await this.addToSyncQueue({ scoutId, stageId, reqId, completed });

    // 3. Intentar enviar a Supabase de inmediato si hay conexión
    try {
      const { data: existing } = await supabase
        .from('requirement_progress')
        .select('id')
        .eq('scout_id', scoutId)
        .eq('stage_id', stageId)
        .eq('requirement_id', reqId)
        .single();

      if (existing) {
        await supabase
          .from('requirement_progress')
          .update({ completed, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('requirement_progress')
          .insert({
            scout_id: scoutId,
            stage_id: stageId,
            requirement_id: reqId,
            completed
          });
      }

      // Si se envió exitosamente, limpiar de la cola pendiente
      const queue = await this.getSyncQueue();
      const filtered = queue.filter(q => !(q.scoutId === scoutId && q.stageId === stageId && q.reqId === reqId));
      await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(filtered));
    } catch (err) {
      console.log('Guardado localmente en modo Offline. Se sincronizará al volver la conexión.');
    }
  },

  async submitStageForReview(scoutId: string, stageId: string) {
    const { data: existing } = await supabase
      .from('stage_progress')
      .select('id')
      .eq('scout_id', scoutId)
      .eq('stage_id', stageId)
      .single();

    if (existing) {
      await supabase
        .from('stage_progress')
        .update({ status: 'En Revision', updated_at: new Date().toISOString() })
        .eq('id', existing.id);
    } else {
      await supabase.from('stage_progress').insert({
        scout_id: scoutId,
        stage_id: stageId,
        status: 'En Revision'
      });
    }
  },

  async approveStage(scoutId: string, stageId: string) {
    await supabase
      .from('stage_progress')
      .update({ status: 'Aprobada', updated_at: new Date().toISOString() })
      .eq('scout_id', scoutId)
      .eq('stage_id', stageId);

    const stageTitle = stagesData.find(s => s.id === stageId)?.title || 'Etapa';

    // Despachar notificación Push y en vivo al Scout
    await notificationService.sendNotification({
      receiverId: scoutId,
      title: '🎉 ¡Etapa e Insignia Aprobadas!',
      message: `¡Felicidades! Tu dirigente ha aprobado oficialmente tu etapa "${stageTitle}". Ya pasaste a la siguiente etapa.`,
      type: 'badge'
    }).catch(() => {});
  },

  async rejectStage(scoutId: string, stageId: string, reason?: string) {
    // Al rechazar / devolver, se cambia a 'En Progreso' para que se DESBLOQUEEN las actividades
    await supabase
      .from('stage_progress')
      .update({ status: 'En Progreso', updated_at: new Date().toISOString() })
      .eq('scout_id', scoutId)
      .eq('stage_id', stageId);

    const stageTitle = stagesData.find(s => s.id === stageId)?.title || 'Etapa';

    await notificationService.sendNotification({
      receiverId: scoutId,
      title: '📋 Ficha de Etapa Devuelta',
      message: reason
        ? `Tu dirigente devolvió tu etapa "${stageTitle}": ${reason}`
        : `Tu dirigente ha revisado tu etapa "${stageTitle}" y requiere completar requisitos pendientes.`,
      type: 'alert'
    }).catch(() => {});
  },

  async getScoutsForScouter(unit: string, groupName: string) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'scout')
      .eq('unit', unit)
      .eq('group_name', groupName);

    return data || [];
  },

  // ----------------------------------------------------
  // MÓDULO DE CERTIFICADOS
  // ----------------------------------------------------
  async getCertificates(scoutId: string) {
    const { data, error } = await supabase
      .from('certificates')
      .select('*')
      .eq('scout_id', scoutId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).filter(
      d =>
        !d.category?.startsWith('vida_grupo_') &&
        !d.category?.startsWith('cip_sel_') &&
        !d.category?.startsWith('linked_cert_')
    );
  },

  async uploadCertificate(scoutId: string, title: string, category: string, level: string | null, fileUrl: string, date?: string) {
    let safeUrl = fileUrl;
    // Si la imagen es un Data URL de base64, subirla directamente a Supabase Storage bucket 'scout-files'
    if (safeUrl && safeUrl.startsWith('data:image')) {
      try {
        const uploadedUrl = await storageService.uploadImage(
          'scout-files',
          'certificates',
          `cert_${scoutId}_${Date.now()}.png`,
          safeUrl
        );
        if (uploadedUrl && uploadedUrl.startsWith('http')) {
          safeUrl = uploadedUrl;
        }
      } catch (uploadErr) {
        console.warn('Aviso subiendo imagen a storage:', uploadErr);
      }
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
      throw new Error(error.message || 'No se pudo guardar en la base de datos');
    }

    // Sincronizar automáticamente con el currículum scout
    await this.syncCertificateToCurriculum(scoutId, {
      title,
      category,
      level,
      date: date || new Date().toISOString().split('T')[0]
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
    let safeUrl = updates.file_url;
    if (safeUrl && safeUrl.startsWith('data:image')) {
      try {
        const uploadedUrl = await storageService.uploadImage(
          'scout-files',
          'certificates',
          `cert_${scoutId}_${Date.now()}.png`,
          safeUrl
        );
        if (uploadedUrl && uploadedUrl.startsWith('http')) {
          safeUrl = uploadedUrl;
        }
      } catch (uploadErr) {
        console.warn('Aviso subiendo imagen editada a storage:', uploadErr);
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
      throw new Error(error.message || 'No se pudo actualizar el certificado');
    }

    if (updates.title && updates.category) {
      await this.syncCertificateToCurriculum(scoutId, {
        title: updates.title,
        category: updates.category,
        level: updates.level,
        date: updates.date || new Date().toISOString().split('T')[0]
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
      const { data: prof } = await supabase
        .from('profiles')
        .select('curriculum_data')
        .eq('id', scoutId)
        .single();

      let curr = prof?.curriculum_data || {};
      if (typeof curr === 'string') {
        try { curr = JSON.parse(curr); } catch {}
      }

      const certDate = cert.date || new Date().toISOString().split('T')[0];
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

      await supabase
        .from('profiles')
        .update({ curriculum_data: curr })
        .eq('id', scoutId);

      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(`curriculum_data_${scoutId}`, JSON.stringify(curr));
      }
      return curr;
    } catch (err) {
      console.warn('Error sincronizando certificado con currículum:', err);
      return null;
    }
  },

  async syncAllCertificatesToCurriculum(scoutId: string) {
    try {
      const certs = await this.getCertificates(scoutId);
      const { data: prof } = await supabase
        .from('profiles')
        .select('curriculum_data')
        .eq('id', scoutId)
        .single();

      let curr = prof?.curriculum_data || {};
      if (typeof curr === 'string') {
        try { curr = JSON.parse(curr); } catch {}
      }

      if (!curr.worldProgramsList) curr.worldProgramsList = [];
      if (!curr.workshopsList) curr.workshopsList = [];
      if (!curr.distinctionsList) curr.distinctionsList = [];

      let importedCount = 0;

      for (const cert of certs) {
        const certDate = cert.date || (cert.created_at ? cert.created_at.split('T')[0] : new Date().toISOString().split('T')[0]);
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

      await supabase
        .from('profiles')
        .update({ curriculum_data: curr })
        .eq('id', scoutId);

      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(`curriculum_data_${scoutId}`, JSON.stringify(curr));
      }

      return { curriculum: curr, count: importedCount, total: certs.length };
    } catch (err) {
      console.warn('Error en syncAllCertificatesToCurriculum:', err);
      return { curriculum: null, count: 0, total: 0 };
    }
  },

  async deleteCertificate(certificateId: string, scoutId: string, certTitle?: string, reason?: string) {
    const { error } = await supabase
      .from('certificates')
      .delete()
      .eq('id', certificateId);

    if (error) throw error;

    // Despachar notificación Push y guardar en bandeja del Scout
    await notificationService.sendNotification({
      receiverId: scoutId,
      title: `⚠️ Certificado / Especialidad Eliminado: ${certTitle || 'Acreditación'}`,
      message: reason && reason.trim()
        ? `Tu dirigente ha eliminado "${certTitle || 'tu acreditación'}": ${reason}`
        : `Tu dirigente ha eliminado el certificado/especialidad "${certTitle || 'Acreditación'}".`,
      type: 'alert'
    }).catch(() => {});
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
    await supabase
      .from('scout_notifications')
      .update({ is_read: true })
      .eq('id', notificationId);
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
    const { data, error } = await supabase
      .from('calendar_events')
      .insert({
        title: `[CIP ${event.scope.toUpperCase()}] ${event.title}`,
        description: event.description || `Ciclo Institucional de Programa (CIP) de alcance ${event.scope}.`,
        date: event.date,
        unit: event.unit,
        created_by: event.created_by
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getCipEvents(unit?: string) {
    let query = supabase
      .from('calendar_events')
      .select('*')
      .or('title.ilike.%[CIP%,title.ilike.%[6P%')
      .order('date', { ascending: false });

    if (unit) {
      query = query.in('unit', [unit.toLowerCase(), 'grupo']);
    }

    const { data, error } = await query;
    if (error) return [];
    return data || [];
  },

  // ----------------------------------------------------
  // MÓDULO DE PLANES TRIMESTRALES (Q1 - Q4)
  // ----------------------------------------------------
  async getQuarterlyPlan(scoutId: string, quarter: string, year: number) {
    const { data, error } = await supabase
      .from('quarterly_plans')
      .select('*')
      .eq('scout_id', scoutId)
      .eq('quarter', quarter)
      .eq('year', year)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching quarterly plan:', error);
    }

    if (data) {
      // Intentar recuperar de fallback JSON si se guardó en la columna 'goals'
      if (typeof data.goals === 'string' && data.goals.startsWith('{')) {
        try {
          const parsed = JSON.parse(data.goals);
          return { ...data, ...parsed };
        } catch (e) {}
      }
    }
    return data || null;
  },

  async getQuarterlyPlansHistory(scoutId: string, groupName?: string, unit?: string) {
    let query = supabase.from('quarterly_plans').select('*');
    if (groupName && unit) {
      let cleanUnit = (unit || 'clan').toLowerCase().trim();
      if (cleanUnit === 'comunidad') cleanUnit = 'caminantes';
      query = query.eq('group_name', groupName).eq('unit', cleanUnit);
    } else {
      query = query.eq('scout_id', scoutId);
    }

    const { data, error } = await query
      .order('year', { ascending: false })
      .order('quarter', { ascending: false });

    if (error) return [];
    return (data || []).map(item => {
      if (typeof item.goals === 'string' && item.goals.startsWith('{')) {
        try {
          const parsed = JSON.parse(item.goals);
          return { ...item, ...parsed };
        } catch (e) {}
      }
      return item;
    });
  },

  async saveQuarterlyPlan(plan: {
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
  }) {
    let cleanUnit = (plan.unit || 'clan').toLowerCase().trim();
    if (cleanUnit === 'comunidad') cleanUnit = 'caminantes';

    const existing = await this.getUnitSharedQuarterlyPlan(plan.group_name || '', cleanUnit, plan.quarter, plan.year)
      || await this.getQuarterlyPlan(plan.scout_id, plan.quarter, plan.year);

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
    let query = supabase
      .from('profiles')
      .select('id, name, unit')
      .eq('role', 'scout')
      .eq('group_name', groupName);

    if (unit && unit !== 'all') {
      query = query.eq('unit', unit.toLowerCase());
    }

    const { data: scouts } = await query.order('unit', { ascending: true }).order('name', { ascending: true });
    if (!scouts || scouts.length === 0) return [];

    const scoutIds = scouts.map(s => s.id);
    const { data: plans } = await supabase
      .from('quarterly_plans')
      .select('*')
      .in('scout_id', scoutIds)
      .eq('quarter', quarter)
      .eq('year', year);

    const planMap: Record<string, any> = {};
    plans?.forEach(p => { planMap[p.scout_id] = p; });

    return scouts.map(s => ({
      scout: s,
      plan: planMap[s.id] || null
    }));
  },

  // OBTENER Y GUARDAR PLAN TRIMESTRAL ÚNICO Y COMPARTIDO POR UNIDAD
  async getUnitSharedQuarterlyPlan(groupName: string, unit: string, quarter: string, year: number) {
    try {
      let cleanUnit = (unit || 'clan').toLowerCase().trim();
      if (cleanUnit === 'comunidad') cleanUnit = 'caminantes';

      // 1. Buscar directamente por group_name y unit en quarterly_plans
      if (groupName) {
        const { data: directData } = await supabase
          .from('quarterly_plans')
          .select('*')
          .eq('group_name', groupName)
          .eq('unit', cleanUnit)
          .eq('quarter', quarter)
          .eq('year', year)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (directData) return directData;
      }

      // 2. Buscar a través de los perfiles de la unidad en este grupo
      let query = supabase.from('profiles').select('id');
      if (groupName) query = query.eq('group_name', groupName);
      query = query.in('unit', [cleanUnit, unit ? unit.toLowerCase() : cleanUnit]);

      const { data: scouts } = await query;

      if (scouts && scouts.length > 0) {
        const scoutIds = scouts.map(s => s.id);
        const { data } = await supabase
          .from('quarterly_plans')
          .select('*')
          .in('scout_id', scoutIds)
          .eq('quarter', quarter)
          .eq('year', year)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (data) return data;
      }

      return null;
    } catch (e) {
      return null;
    }
  },

  async updateLastSeen(scoutId: string) {
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

      // Usar select('*') para garantizar compatibilidad con cualquier columna existente
      let { data, error } = await supabase
        .from('profiles')
        .select('*');

      if (error || !data || data.length === 0) {
        const res = await supabase.from('profiles').select('id, name');
        data = res.data;
      }

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
    const { data, error } = await supabase
      .from('quarterly_plans')
      .update({
        scouter_feedback: feedback,
        status: status
      })
      .eq('id', planId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateCedula(scoutId: string, cedula: string) {
    try {
      await supabase.from('profiles').update({ cedula: cedula.trim() }).eq('id', scoutId);
    } catch (e) {
      console.warn('Aviso actualizando cédula:', e);
    }
  },

  async proposeMembershipDate(scoutId: string, expiresAt: string) {
    try {
      await supabase.from('profiles').update({
        membership_expires_at: expiresAt,
        membership_status: 'pending_approval',
        membership_rejected_reason: null
      }).eq('id', scoutId);
    } catch (e) {
      console.warn('Aviso proponiendo membresía:', e);
    }
  },

  async approveMembershipDate(scoutId: string) {
    try {
      await supabase.from('profiles').update({
        membership_status: 'approved',
        membership_rejected_reason: null
      }).eq('id', scoutId);
    } catch (e) {
      console.warn('Aviso aprobando membresía:', e);
    }
  },

  async rejectMembershipDate(scoutId: string, reason: string) {
    try {
      await supabase.from('profiles').update({
        membership_status: 'rejected',
        membership_rejected_reason: reason
      }).eq('id', scoutId);

      // Notificación Push en tiempo real al Scout
      await notificationService.sendNotification({
        receiverId: scoutId,
        title: '📑 Registro de Membresía Devuelto',
        message: reason && reason.trim()
          ? `Tu fecha de registro/membresía fue devuelta: ${reason}`
          : 'Tu dirigente ha revisado tu fecha de membresía y requiere corrección.',
        type: 'membership'
      }).catch(() => {});
    } catch (e) {
      console.warn('Aviso rechazando membresía:', e);
    }
  },

  async deleteProfilePhotoWithReason(scoutId: string, reason: string, photoType: 'scout' | 'custom' | 'both' = 'both') {
    try {
      const updatePayload: any = { photo_rejected_reason: reason || null };
      if (photoType === 'scout' || photoType === 'both') updatePayload.avatar_url = null;
      if (photoType === 'custom' || photoType === 'both') updatePayload.custom_avatar_url = null;

      await supabase.from('profiles').update(updatePayload).eq('id', scoutId);

      const typeLabel = photoType === 'custom' ? 'Foto Personal' : (photoType === 'scout' ? 'Foto Scout con Uniforme' : 'Foto de Perfil');

      // Notificación Push en tiempo real al Scout
      await notificationService.sendNotification({
        receiverId: scoutId,
        title: `📷 ${typeLabel} Removida por Dirigente`,
        message: reason && reason.trim()
          ? `Tu dirigente ha solicitado cambiar tu ${typeLabel.toLowerCase()}: ${reason}`
          : `Tu dirigente ha removido tu ${typeLabel.toLowerCase()}. Por favor sube una foto adecuada.`,
        type: 'alert'
      }).catch(() => {});
    } catch (e) {
      console.warn('Aviso eliminando foto de perfil:', e);
    }
  },

  // --- GESTIÓN DE REGISTRO DE NOCHES DE VIDA AL AIRE LIBRE ---
  async getNightsLog(scoutId: string, stageId: string, reqId: string) {
    const key = `@scout_noches_${scoutId}_${stageId}_${reqId}`;
    try {
      const raw = await AsyncStorage.getItem(key);
      if (raw) return JSON.parse(raw);
    } catch {}

    try {
      const { data } = await supabase
        .from('certificates')
        .select('*')
        .eq('scout_id', scoutId)
        .eq('category', `aire_libre_${stageId}_${reqId}`)
        .order('created_at', { ascending: false });

      if (data && data.length > 0) {
        const entries = data.map(d => {
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
            createdAt: d.created_at
          };
        });
        await AsyncStorage.setItem(key, JSON.stringify(entries)).catch(() => {});
        return entries;
      }
    } catch {}

    return [];
  },

  async addNightEntry(scoutId: string, stageId: string, reqId: string, entry: { date: string; location: string; nightsCount: number; notes?: string }) {
    const current = await this.getNightsLog(scoutId, stageId, reqId);
    const newEntry = {
      ...entry,
      id: `night_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString()
    };
    const updated = [newEntry, ...current];
    const key = `@scout_noches_${scoutId}_${stageId}_${reqId}`;
    await AsyncStorage.setItem(key, JSON.stringify(updated));

    // Guardar en Supabase usando estrictamente columnas existentes en certificates
    try {
      await supabase.from('certificates').insert({
        id: newEntry.id,
        scout_id: scoutId,
        category: `aire_libre_${stageId}_${reqId}`,
        title: entry.location || 'Campamento / Pernocta',
        level: String(entry.nightsCount || 1),
        file_url: JSON.stringify({ date: entry.date, notes: entry.notes || '' })
      });
    } catch (e) {
      console.warn('Aviso guardando noche en Supabase:', e);
    }

    return updated;
  },

  async deleteNightEntry(scoutId: string, stageId: string, reqId: string, entryId: string) {
    const current = await this.getNightsLog(scoutId, stageId, reqId);
    const updated = current.filter((e: any) => e.id !== entryId);
    const key = `@scout_noches_${scoutId}_${stageId}_${reqId}`;
    await AsyncStorage.setItem(key, JSON.stringify(updated));

    try {
      await supabase.from('certificates').delete().eq('id', entryId);
    } catch {}

    return updated;
  },

  // --- GESTIÓN DE REGISTRO DE VIDA DE GRUPO (PEREGRINAJES, CAMPAMENTOS, PROYECTOS) ---
  async getVidaGrupoLog(scoutId: string, stageId: string, reqId: string) {
    const key = `@scout_vidagrupo_${scoutId}_${stageId}_${reqId}`;
    try {
      const raw = await AsyncStorage.getItem(key);
      if (raw) return JSON.parse(raw);
    } catch {}

    try {
      const { data } = await supabase
        .from('certificates')
        .select('*')
        .eq('scout_id', scoutId)
        .eq('category', `vida_grupo_${stageId}_${reqId}`)
        .order('created_at', { ascending: false });

      if (data && data.length > 0) {
        const entries = data.map(d => {
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
            createdAt: d.created_at
          };
        });
        await AsyncStorage.setItem(key, JSON.stringify(entries)).catch(() => {});
        return entries;
      }
    } catch {}

    return [];
  },

  async addVidaGrupoEntry(
    scoutId: string,
    stageId: string,
    reqId: string,
    entry: { type: string; subtype?: string; location: string; title: string; date: string; description?: string }
  ) {
    const current = await this.getVidaGrupoLog(scoutId, stageId, reqId);
    const newEntry = {
      ...entry,
      id: `vg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString()
    };
    const updated = [newEntry, ...current];
    const key = `@scout_vidagrupo_${scoutId}_${stageId}_${reqId}`;
    await AsyncStorage.setItem(key, JSON.stringify(updated));

    try {
      await supabase.from('certificates').insert({
        id: newEntry.id,
        scout_id: scoutId,
        category: `vida_grupo_${stageId}_${reqId}`,
        title: entry.title || 'Evento de Vida de Grupo',
        level: entry.subtype || entry.type || null,
        file_url: JSON.stringify({
          type: entry.type,
          subtype: entry.subtype || null,
          location: entry.location || '',
          date: entry.date || new Date().toISOString().split('T')[0],
          description: entry.description || ''
        })
      });
    } catch (e) {
      console.warn('Aviso guardando Vida de Grupo en Supabase:', e);
    }

    return newEntry;
  },

  async deleteVidaGrupoEntry(scoutId: string, stageId: string, reqId: string, entryId: string) {
    const current = await this.getVidaGrupoLog(scoutId, stageId, reqId);
    const updated = current.filter((e: any) => e.id !== entryId);
    const key = `@scout_vidagrupo_${scoutId}_${stageId}_${reqId}`;
    await AsyncStorage.setItem(key, JSON.stringify(updated));

    try {
      await supabase.from('certificates').delete().eq('id', entryId);
    } catch {}

    return updated;
  },

  // --- GESTIÓN DE SELECCIONES MÚLTIPLES DE CIP / CICLOS INSTITUCIONALES ---
  async getCipSelections(scoutId: string, stageId: string, reqId: string) {
    const key = `@scout_cip_selections_${scoutId}_${stageId}_${reqId}`;
    try {
      const raw = await AsyncStorage.getItem(key);
      if (raw) return JSON.parse(raw);
    } catch {}

    try {
      const { data } = await supabase
        .from('certificates')
        .select('*')
        .eq('scout_id', scoutId)
        .eq('category', `cip_sel_${stageId}_${reqId}`)
        .order('created_at', { ascending: false });

      if (data && data.length > 0) {
        const events = data.map(d => {
          let meta: any = {};
          if (d.file_url && d.file_url.startsWith('{')) {
            try { meta = JSON.parse(d.file_url); } catch {}
          }
          return {
            id: d.id,
            title: d.title,
            scope: d.level || 'distrital',
            date: meta.date || (d.created_at ? d.created_at.split('T')[0] : ''),
            location: meta.location || '',
            description: meta.description || ''
          };
        });
        await AsyncStorage.setItem(key, JSON.stringify(events)).catch(() => {});
        return events;
      }
    } catch {}

    return [];
  },

  async saveCipSelections(scoutId: string, stageId: string, reqId: string, events: any[]) {
    const key = `@scout_cip_selections_${scoutId}_${stageId}_${reqId}`;
    await AsyncStorage.setItem(key, JSON.stringify(events));

    try {
      // Eliminar anteriores y re-insertar usando scout_id
      await supabase.from('certificates').delete().eq('scout_id', scoutId).eq('category', `cip_sel_${stageId}_${reqId}`);
      if (events.length > 0) {
        const rows = events.map(evt => ({
          id: evt.id || `cip_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          scout_id: scoutId,
          category: `cip_sel_${stageId}_${reqId}`,
          title: evt.title,
          level: evt.scope || 'distrital',
          file_url: JSON.stringify({
            location: evt.location || '',
            description: evt.description || '',
            date: evt.date || ''
          })
        }));
        await supabase.from('certificates').insert(rows);
      }
    } catch (e) {
      console.warn('Aviso guardando CIP en Supabase:', e);
    }

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
      await AsyncStorage.setItem(key, JSON.stringify(certData));
    } else {
      await AsyncStorage.removeItem(key);
    }

    try {
      // Eliminar registro previo en Supabase usando scout_id
      await supabase
        .from('certificates')
        .delete()
        .eq('scout_id', scoutId)
        .eq('category', `linked_cert_${stageId}_${reqId}`);

      if (certData) {
        await supabase.from('certificates').insert({
          id: `link_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          scout_id: scoutId,
          title: certData.certTitle,
          category: `linked_cert_${stageId}_${reqId}`,
          level: certData.level || null,
          file_url: JSON.stringify(certData)
        });
      }
    } catch (e) {
      console.warn('Aviso guardando vinculacion en Supabase:', e);
    }
  },

  async getAllLinkedCertificates(scoutId: string): Promise<Record<string, { certId?: string; certTitle: string; level?: string; date?: string }>> {
    const result: Record<string, { certId?: string; certTitle: string; level?: string; date?: string }> = {};

    // 1. Cargar desde Supabase
    try {
      const { data, error } = await supabase
        .from('certificates')
        .select('*')
        .eq('scout_id', scoutId)
        .like('category', 'linked_cert_%');

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

    // 2. Cargar fallbacks desde AsyncStorage
    for (const stg of stagesData) {
      for (const r of stg.requirements) {
        if (r.type === 'cursos' || r.type === 'especialidad') {
          const key = `@scout_req_linked_${scoutId}_${stg.id}_${r.id}`;
          if (!result[`${stg.id}_${r.id}`]) {
            try {
              const localStr = await AsyncStorage.getItem(key);
              if (localStr) {
                const parsed = JSON.parse(localStr);
                result[`${stg.id}_${r.id}`] = parsed;
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
