import AsyncStorage from '@react-native-async-storage/async-storage';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';
import { ProgramaScout } from '../types/programa';

const STORAGE_KEY = '@scout_programas_list';

function mapDbRowToPrograma(d: any): ProgramaScout {
  let extractedPlanActId = d.plan_activity_id || d.planActivityId;
    if (!extractedPlanActId && typeof (d.important_notes || d.importantNotes) === 'string') {
      const match = (d.important_notes || d.importantNotes).match(/\[PLAN_ACT_ID:([^\]]+)\]/);
      if (match) extractedPlanActId = match[1];
    }
    const isExtraordinary = d.is_extraordinary ?? d.isExtraordinary ?? ((d.activity_type || d.activityType || '').toLowerCase().includes('extraordinaria') || false);

    let extractedStatus: 'draft' | 'published' = d.status || 'published';
    let extractedPreviewRoles: string[] = d.preview_roles || d.previewRoles || ['scouter', 'jefatura'];
    let extractedCreatedBy = d.created_by || d.createdBy || '';
    let extractedCreatorName = d.creator_name || d.creatorName || '';

    if (typeof (d.important_notes || d.importantNotes) === 'string') {
      const notesStr = d.important_notes || d.importantNotes;
      const statusMatch = notesStr.match(/\[PROGRAMA_STATUS:([^\]]+)\]/);
      if (statusMatch) extractedStatus = statusMatch[1] as any;

      const rolesMatch = notesStr.match(/\[PREVIEW_ROLES:([^\]]+)\]/);
      if (rolesMatch) extractedPreviewRoles = rolesMatch[1].split(',');

      const authorMatch = notesStr.match(/\[AUTHOR_ID:([^\]]+)\]/);
      if (authorMatch && !extractedCreatedBy) extractedCreatedBy = authorMatch[1];

      const authorNameMatch = notesStr.match(/\[AUTHOR_NAME:([^\]]+)\]/);
      if (authorNameMatch && !extractedCreatorName) extractedCreatorName = authorNameMatch[1];
    }

    return {
      id: d.id,
      title: d.title || 'Sin título',
      date: d.date || '',
      location: d.location || '',
      activityType: d.activity_type || d.activityType || '',
      unit: (d.unit || 'clan').toLowerCase(),
      isSinodal: d.is_sinodal ?? d.isSinodal ?? false,
      selectedUnits: d.selected_units || d.selectedUnits || [d.unit || 'clan'],
      participantProjection: d.participant_projection || d.participantProjection || '',
      generalObjective: d.general_objective || d.generalObjective || '',
      specificObjectives: d.specific_objectives || d.specificObjectives || [],
      specificMetas: d.specific_metas || d.specificMetas || [],
      selectedSDGs: d.selected_sdgs || d.selectedSDGs || [],
      indicators: d.indicators || {
        corporalidad: [],
        creatividad: [],
        caracter: [],
        afectividad: [],
        sociabilidad: [],
        espiritualidad: []
      },
      schedule: d.schedule || [],
      importantNotes: d.important_notes || d.importantNotes || '',
      registrationBadgeId: d.registration_badge_id || d.registrationBadgeId || 'reg_2026',
      createdBy: extractedCreatedBy,
      creatorName: extractedCreatorName,
      groupName: d.group_name || d.groupName || 'Grupo Scout Orión #84',
      planActivityId: extractedPlanActId,
      isExtraordinary: isExtraordinary,
      status: extractedStatus,
      previewRoles: extractedPreviewRoles,
      createdAt: d.created_at || d.createdAt || new Date().toISOString(),
      updatedAt: d.updated_at || d.updatedAt || new Date().toISOString(),
    };
  }

class ProgramaService {
  private subscribers: Set<(programas: ProgramaScout[]) => void> = new Set();
  private realtimeChannel: RealtimeChannel | null = null;
  private memoryCache: ProgramaScout[] | null = null;

  constructor() {
    this.initRealtime();
  }

  /**
   * Inicializa la conexión en tiempo real con Supabase Realtime (WebSockets)
   */
  private initRealtime() {
    try {
      if (this.realtimeChannel) {
        supabase.removeChannel(this.realtimeChannel);
      }

      this.realtimeChannel = supabase
        .channel('scout_programas_realtime_sync')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'scout_programas' },
          async (payload) => {
            console.log('[Realtime] Evento recibido en scout_programas:', payload.eventType);
            try {
              const freshList = await this.fetchFromSupabase();
              const currentLocal = this.memoryCache || [];
              const merged = this.mergePrograms(freshList, currentLocal);
              this.memoryCache = merged;
              await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
              this.notifySubscribers(merged);
            } catch (e) {
              console.warn('[Realtime] Error procesando evento en tiempo real:', e);
            }
          }
        )
        .subscribe((status) => {
          console.log('[Realtime] Estado del canal scout_programas:', status);
        });
    } catch (e) {
      console.warn('[Realtime] Error inicializando canal:', e);
    }
  }

  /**
   * Fusión inteligente entre datos remotos de Supabase y locales de AsyncStorage
   */
  private mergePrograms(remotePrograms: ProgramaScout[], localPrograms: ProgramaScout[]): ProgramaScout[] {
    const mergedMap = new Map<string, ProgramaScout>();
    remotePrograms.forEach(p => mergedMap.set(p.id, p));
    localPrograms.forEach(p => {
      if (!mergedMap.has(p.id)) {
        mergedMap.set(p.id, p);
      } else {
        const remote = mergedMap.get(p.id)!;
        const localTime = new Date(p.updatedAt || p.createdAt || 0).getTime();
        const remoteTime = new Date(remote.updatedAt || remote.createdAt || 0).getTime();
        if (localTime > remoteTime) {
          mergedMap.set(p.id, p);
        }
      }
    });

    return Array.from(mergedMap.values()).sort((a, b) => 
      new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime()
    );
  }

  /**
   * Sincronización en segundo plano de programas locales no guardados aún en la nube
   */
  private async syncPendingToSupabase(pendingList: ProgramaScout[]): Promise<void> {
    for (const prog of pendingList) {
      try {
        const isValidUUID = prog.createdBy && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(prog.createdBy);
        const safePayload: any = {
          id: prog.id,
          title: prog.title,
          date: prog.date,
          location: prog.location,
          activity_type: prog.activityType,
          unit: prog.unit,
          is_sinodal: prog.isSinodal || false,
          selected_units: prog.selectedUnits || [prog.unit],
          participant_projection: prog.participantProjection,
          general_objective: prog.generalObjective,
          specific_objectives: prog.specificObjectives,
          specific_metas: prog.specificMetas,
          selected_sdgs: prog.selectedSDGs,
          indicators: prog.indicators,
          schedule: prog.schedule,
          important_notes: prog.importantNotes,
          registration_badge_id: prog.registrationBadgeId,
          created_by: isValidUUID ? prog.createdBy : null,
          creator_name: prog.creatorName,
          group_name: prog.groupName,
          updated_at: prog.updatedAt,
        };
        await supabase.from('scout_programas').upsert(safePayload);
      } catch (e) {
        console.warn('Aviso sincronizando programa pendiente:', e);
      }
    }
  }

  private notifySubscribers(list: ProgramaScout[]) {
    this.subscribers.forEach(callback => {
      try {
        callback(list);
      } catch (err) {
        console.error('[Realtime] Error en callback de suscriptor:', err);
      }
    });
  }

  /**
   * Suscribe un componente a cambios en tiempo real (estilo WhatsApp)
   */
  subscribeToProgramas(callback: (programas: ProgramaScout[]) => void): () => void {
    this.subscribers.add(callback);
    
    // Si ya tenemos caché en memoria, enviar de inmediato
    if (this.memoryCache) {
      callback(this.memoryCache);
    }

    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Consulta directa y autoritativa a Supabase
   */
  private async fetchFromSupabase(): Promise<ProgramaScout[]> {
    try {
      const { data, error } = await supabase
        .from('scout_programas')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Error consultando Supabase scout_programas:', error.message);
        return [];
      }

      if (data) {
        return data.map(mapDbRowToPrograma).sort((a, b) => 
          new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime()
        );
      }
      return [];
    } catch (e) {
      console.warn('Excepción consultando Supabase scout_programas:', e);
      return [];
    }
  }

  /**
   * Obtiene todos los programas guardados (Sincronización Inteligente)
   */
  async getProgramas(unitFilter?: string | null): Promise<ProgramaScout[]> {
    try {
      // 1. Cargar caché local de AsyncStorage
      let localProgramas: ProgramaScout[] = [];
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        try {
          localProgramas = JSON.parse(raw);
        } catch {}
      }

      // 2. Intentar obtener datos frescos de Supabase
      try {
        const remoteProgramas = await this.fetchFromSupabase();
        
        // FUSIÓN INTELIGENTE: Nunca descartar programas locales no sincronizados
        if (remoteProgramas && Array.isArray(remoteProgramas)) {
          const mergedList = this.mergePrograms(remoteProgramas, localProgramas);

          this.memoryCache = mergedList;
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(mergedList));

          // Sincronizar en segundo plano programas locales que no estén en la nube
          const pendingToSync = localProgramas.filter(lp => {
            const remote = remoteProgramas.find(rp => rp.id === lp.id);
            if (!remote) return true;
            return new Date(lp.updatedAt || 0).getTime() > new Date(remote.updatedAt || 0).getTime();
          });
          if (pendingToSync.length > 0) {
            this.syncPendingToSupabase(pendingToSync).catch(() => {});
          }
          
          if (unitFilter && unitFilter !== 'todas') {
            return mergedList.filter(p => p.unit === unitFilter || (p.isSinodal && p.selectedUnits?.includes(unitFilter as any)));
          }
          return mergedList;
        }
      } catch (cloudErr) {
        console.warn('Modo offline en getProgramas, usando caché local:', cloudErr);
      }

      this.memoryCache = localProgramas;
      if (unitFilter && unitFilter !== 'todas') {
        return localProgramas.filter(p => p.unit === unitFilter || (p.isSinodal && p.selectedUnits?.includes(unitFilter as any)));
      }
      return localProgramas;
    } catch (err) {
      console.error('Error en getProgramas:', err);
      return [];
    }
  }

  /**
   * Obtiene un programa específico por ID
   */
  async getProgramaById(id: string): Promise<ProgramaScout | null> {
    const list = await this.getProgramas();
    return list.find(p => p.id === id) || null;
  }

  /**
   * Guarda o actualiza un programa (Local + Supabase + Realtime Broadcast)
   */
  async savePrograma(programa: ProgramaScout): Promise<ProgramaScout> {
    try {
      const now = new Date().toISOString();
      let finalNotes = programa.importantNotes || '';
      if (programa.planActivityId && !finalNotes.includes(`[PLAN_ACT_ID:${programa.planActivityId}]`)) {
        finalNotes = finalNotes ? `${finalNotes}\n[PLAN_ACT_ID:${programa.planActivityId}]` : `[PLAN_ACT_ID:${programa.planActivityId}]`;
      }
      if (programa.status) {
        finalNotes = finalNotes.replace(/\[PROGRAMA_STATUS:[^\]]+\]/g, '').trim();
        finalNotes = `${finalNotes}\n[PROGRAMA_STATUS:${programa.status}]`.trim();
      }
      if (programa.previewRoles && programa.previewRoles.length > 0) {
        finalNotes = finalNotes.replace(/\[PREVIEW_ROLES:[^\]]+\]/g, '').trim();
        finalNotes = `${finalNotes}\n[PREVIEW_ROLES:${programa.previewRoles.join(',')}]`.trim();
      }
      if (programa.createdBy) {
        finalNotes = finalNotes.replace(/\[AUTHOR_ID:[^\]]+\]/g, '').trim();
        finalNotes = `${finalNotes}\n[AUTHOR_ID:${programa.createdBy}]`.trim();
      }
      if (programa.creatorName) {
        finalNotes = finalNotes.replace(/\[AUTHOR_NAME:[^\]]+\]/g, '').trim();
        finalNotes = `${finalNotes}\n[AUTHOR_NAME:${programa.creatorName}]`.trim();
      }

      const updatedPrograma: ProgramaScout = {
        ...programa,
        importantNotes: finalNotes,
        status: programa.status || 'published',
        previewRoles: programa.previewRoles || ['scouter', 'jefatura'],
        updatedAt: now,
        createdAt: programa.createdAt || now,
      };

      // 1. Actualizar memoria y local storage de inmediato (Optimistic UI)
      let currentList = await this.getProgramas();
      const existingIdx = currentList.findIndex(p => p.id === programa.id);
      
      if (existingIdx >= 0) {
        currentList[existingIdx] = updatedPrograma;
      } else {
        currentList = [updatedPrograma, ...currentList.filter(p => p.id !== updatedPrograma.id)];
      }

      this.memoryCache = currentList;
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(currentList));
      this.notifySubscribers(currentList);

      // 2. Guardar en Supabase (Solo columnas verificadas en el esquema PostgreSQL)
      try {
        const isValidUUID = updatedPrograma.createdBy && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(updatedPrograma.createdBy);
        
        const safePayload: any = {
          id: updatedPrograma.id,
          title: updatedPrograma.title,
          date: updatedPrograma.date,
          location: updatedPrograma.location,
          activity_type: updatedPrograma.activityType,
          unit: updatedPrograma.unit,
          is_sinodal: updatedPrograma.isSinodal || false,
          selected_units: updatedPrograma.selectedUnits || [updatedPrograma.unit],
          participant_projection: updatedPrograma.participantProjection,
          general_objective: updatedPrograma.generalObjective,
          specific_objectives: updatedPrograma.specificObjectives,
          specific_metas: updatedPrograma.specificMetas,
          selected_sdgs: updatedPrograma.selectedSDGs,
          indicators: updatedPrograma.indicators,
          schedule: updatedPrograma.schedule,
          important_notes: updatedPrograma.importantNotes,
          registration_badge_id: updatedPrograma.registrationBadgeId,
          created_by: isValidUUID ? updatedPrograma.createdBy : null,
          creator_name: updatedPrograma.creatorName,
          group_name: updatedPrograma.groupName,
          updated_at: updatedPrograma.updatedAt,
        };

        const { error: saveError } = await supabase.from('scout_programas').upsert(safePayload);
        if (saveError) {
          console.warn('Aviso guardando en Supabase scout_programas:', saveError.message);
        }
      } catch (cloudErr) {
        console.warn('No se pudo sincronizar en la nube (se guardó offline):', cloudErr);
      }

      return updatedPrograma;
    } catch (err) {
      console.error('Error en savePrograma:', err);
      throw err;
    }
  }

  /**
   * Elimina un programa (Local + Supabase + Realtime Broadcast)
   */
  async deletePrograma(id: string): Promise<void> {
    try {
      // 1. Eliminar de memoria y local storage de inmediato (Optimistic UI)
      let currentList = await this.getProgramas();
      const filtered = currentList.filter(p => p.id !== id);
      
      this.memoryCache = filtered;
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
      this.notifySubscribers(filtered);

      // 2. Eliminar de Supabase
      try {
        const { error } = await supabase.from('scout_programas').delete().eq('id', id);
        if (error) {
          console.warn('Aviso eliminando en Supabase scout_programas:', error.message);
        }
      } catch (cloudErr) {
        console.warn('Error eliminando en la nube:', cloudErr);
      }
    } catch (err) {
      console.error('Error en deletePrograma:', err);
      throw err;
    }
  }

  /**
   * Clona un programa existente para reutilizarlo como base
   */
  async duplicatePrograma(id: string, newTitle?: string): Promise<ProgramaScout> {
    const original = await this.getProgramaById(id);
    if (!original) throw new Error('Programa no encontrado');

    const cloned: ProgramaScout = {
      ...original,
      id: `prog_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      title: newTitle || `${original.title} (Copia)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return await this.savePrograma(cloned);
  }
}

export const programaService = new ProgramaService();
