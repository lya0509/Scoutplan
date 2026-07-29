import { supabase } from './supabaseClient';
import { RequirementProgress, StageStatus } from '../types/progression';
import { stagesData } from '../data/progressionTemplate';

export const dataService = {
  async initializeScout(scoutId: string) {
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
  },

  async getStageStatus(scoutId: string, stageId: string): Promise<StageStatus> {
    const { data } = await supabase
      .from('stage_progress')
      .select('status')
      .eq('scout_id', scoutId)
      .eq('stage_id', stageId)
      .single();
      
    return (data?.status as StageStatus) || 'En Progreso';
  },

  async getRequirement(scoutId: string, stageId: string, reqId: string): Promise<boolean> {
    const { data } = await supabase
      .from('requirement_progress')
      .select('completed')
      .eq('scout_id', scoutId)
      .eq('stage_id', stageId)
      .eq('requirement_id', reqId)
      .single();
      
    return data?.completed || false;
  },

  async getCompletedCatalogActivityIds(scoutId: string): Promise<string[]> {
    const { data } = await supabase
      .from('requirement_progress')
      .select('requirement_id')
      .eq('scout_id', scoutId)
      .eq('completed', true);

    if (!data) return [];
    return data.map(item => item.requirement_id);
  },

  async getProgressForAllStages(scoutId: string) {
    const { data: completedReqs } = await supabase
      .from('requirement_progress')
      .select('stage_id')
      .eq('scout_id', scoutId)
      .eq('completed', true);

    const completedCountByStage: Record<string, number> = {};
    if (completedReqs) {
      completedReqs.forEach(req => {
        if (!completedCountByStage[req.stage_id]) {
          completedCountByStage[req.stage_id] = 0;
        }
        completedCountByStage[req.stage_id]++;
      });
    }

    return stagesData.map(stageTemplate => {
      const totalReqs = stageTemplate.requirements.length;
      const completed = completedCountByStage[stageTemplate.id] || 0;
      
      let progress = 0;
      if (totalReqs > 0) {
        progress = Math.round((completed / totalReqs) * 100);
      }

      return {
        id: stageTemplate.id,
        name: stageTemplate.title,
        progress: progress,
      };
    });
  },

  async toggleRequirement(scoutId: string, stageId: string, reqId: string, completed: boolean) {
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
  },

  async rejectStage(scoutId: string, stageId: string, reason?: string) {
    // Al rechazar / devolver, se cambia a 'En Progreso' para que se DESBLOQUEEN las actividades
    await supabase
      .from('stage_progress')
      .update({ status: 'En Progreso', updated_at: new Date().toISOString() })
      .eq('scout_id', scoutId)
      .eq('stage_id', stageId);

    if (reason) {
      await supabase.from('scout_notifications').insert({
        scout_id: scoutId,
        title: 'Etapa Deuelta a Revisión',
        reason: reason,
        is_read: false
      });
    }
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
    return data || [];
  },

  async uploadCertificate(scoutId: string, title: string, category: string, level: string | null, fileUrl: string) {
    let safeUrl = fileUrl;
    // Si la imagen es un Data URL de base64 muy pesado, recortar si sobrepasa los límites de payload
    if (safeUrl && safeUrl.startsWith('data:') && safeUrl.length > 500000) {
      safeUrl = safeUrl.substring(0, 500000);
    }

    const { data, error } = await supabase
      .from('certificates')
      .insert({
        scout_id: scoutId,
        title,
        category,
        level,
        file_url: safeUrl
      })
      .select();

    if (error) {
      console.error('Error insertando certificado en Supabase:', error);
      throw new Error(error.message || 'No se pudo guardar en la base de datos');
    }
    return data ? data[0] : null;
  },

  async deleteCertificate(certificateId: string, scoutId: string, certTitle: string, reason: string) {
    const { error } = await supabase
      .from('certificates')
      .delete()
      .eq('id', certificateId);

    if (error) throw error;

    await supabase.from('scout_notifications').insert({
      scout_id: scoutId,
      title: `Certificado Eliminado: ${certTitle}`,
      reason: reason || 'El Scouter ha eliminado este certificado.',
      is_read: false
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

  async getQuarterlyPlansHistory(scoutId: string) {
    const { data, error } = await supabase
      .from('quarterly_plans')
      .select('*')
      .eq('scout_id', scoutId)
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
  }) {
    const existing = await this.getQuarterlyPlan(plan.scout_id, plan.quarter, plan.year);

    const fullPayload = {
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
      status: 'Enviado'
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
            scout_id: plan.scout_id,
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
            status: 'Enviado'
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
            status: 'Enviado'
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
  async getUnitSharedQuarterlyPlan(unit: string, groupName: string, quarter: string, year: number) {
    try {
      const { data: scouts } = await supabase
        .from('profiles')
        .select('id')
        .eq('group_name', groupName || 'Grupo Scout Orión #84')
        .eq('unit', (unit || 'clan').toLowerCase());

      const scoutIds = scouts?.map(s => s.id) || [];

      let query = supabase
        .from('quarterly_plans')
        .select('*')
        .eq('quarter', quarter)
        .eq('year', year);

      if (scoutIds.length > 0) {
        query = query.in('scout_id', scoutIds);
      }

      const { data, error } = await query.order('updated_at', { ascending: false }).limit(1).maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.warn('Aviso buscando plan trimestral compartido:', error.message);
      }

      if (data) {
        if (typeof data.goals === 'string' && data.goals.startsWith('{')) {
          try {
            const parsed = JSON.parse(data.goals);
            return { ...data, ...parsed };
          } catch (e) {}
        }
        return data;
      }
    } catch (e) {
      console.error('Error en getUnitSharedQuarterlyPlan:', e);
    }
    return null;
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
  }
};
