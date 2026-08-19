import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabaseClient';
import { ProgramaScout } from '../types/programa';

const STORAGE_KEY = '@scout_programas_list';

export const programaService = {
  /**
   * Obtiene todos los programas guardados (Local + Supabase)
   */
  async getProgramas(unitFilter?: string | null): Promise<ProgramaScout[]> {
    try {
      // 1. Cargar caché local de AsyncStorage
      let localProgramas: ProgramaScout[] = [];
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        localProgramas = JSON.parse(raw);
      }

      // 2. Intentar sincronizar con Supabase si hay red
      try {
        let query = supabase.from('scout_programas').select('*').order('created_at', { ascending: false });
        if (unitFilter) {
          query = query.eq('unit', unitFilter);
        }
        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          const remoteProgramas: ProgramaScout[] = data.map((d: any) => ({
            id: d.id,
            title: d.title,
            date: d.date,
            location: d.location,
            activityType: d.activity_type || d.activityType,
            unit: d.unit,
            isSinodal: d.is_sinodal || d.isSinodal || false,
            selectedUnits: d.selected_units || d.selectedUnits || [d.unit],
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
            createdBy: d.created_by || d.createdBy,
            creatorName: d.creator_name || d.creatorName || '',
            groupName: d.group_name || d.groupName || 'Grupo Scout Orión #84',
            createdAt: d.created_at || d.createdAt,
            updatedAt: d.updated_at || d.updatedAt,
          }));

          // Mezclar local y remoto
          const combinedMap = new Map<string, ProgramaScout>();
          localProgramas.forEach(p => combinedMap.set(p.id, p));
          remoteProgramas.forEach(p => combinedMap.set(p.id, p));
          const merged = Array.from(combinedMap.values()).sort((a, b) => 
            new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime()
          );

          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
          
          if (unitFilter) {
            return merged.filter(p => p.unit === unitFilter);
          }
          return merged;
        }
      } catch (cloudErr) {
        console.warn('Modo offline en getProgramas, usando caché local:', cloudErr);
      }

      if (unitFilter) {
        return localProgramas.filter(p => p.unit === unitFilter);
      }
      return localProgramas;
    } catch (err) {
      console.error('Error en getProgramas:', err);
      return [];
    }
  },

  /**
   * Obtiene un programa específico por ID
   */
  async getProgramaById(id: string): Promise<ProgramaScout | null> {
    const list = await this.getProgramas();
    return list.find(p => p.id === id) || null;
  },

  /**
   * Guarda o actualiza un programa (Local + Supabase)
   */
  async savePrograma(programa: ProgramaScout): Promise<ProgramaScout> {
    try {
      const list = await this.getProgramas();
      const existingIdx = list.findIndex(p => p.id === programa.id);
      
      const now = new Date().toISOString();
      const updatedPrograma: ProgramaScout = {
        ...programa,
        updatedAt: now,
        createdAt: programa.createdAt || now,
      };

      if (existingIdx >= 0) {
        list[existingIdx] = updatedPrograma;
      } else {
        list.unshift(updatedPrograma);
      }

      // Guardar en AsyncStorage para acceso offline inmediato
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));

      // Guardar en Supabase en segundo plano
      try {
        await supabase.from('scout_programas').upsert({
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
          created_by: updatedPrograma.createdBy,
          creator_name: updatedPrograma.creatorName,
          group_name: updatedPrograma.groupName,
          updated_at: updatedPrograma.updatedAt,
        });
      } catch (cloudErr) {
        console.warn('No se pudo sincronizar en la nube (se guardó offline):', cloudErr);
      }

      return updatedPrograma;
    } catch (err) {
      console.error('Error en savePrograma:', err);
      throw err;
    }
  },

  /**
   * Elimina un programa
   */
  async deletePrograma(id: string): Promise<void> {
    try {
      const list = await this.getProgramas();
      const filtered = list.filter(p => p.id !== id);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));

      try {
        await supabase.from('scout_programas').delete().eq('id', id);
      } catch {}
    } catch (err) {
      console.error('Error en deletePrograma:', err);
      throw err;
    }
  },

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
};
