// Datos del Calendario: eventos manuales, actividades del Plan Trimestral, CIP oficiales y
// Programas de Actividades, con copia en el teléfono para usarlos sin internet.
// Lo usan CalendarScreen y la precarga offline (src/lib/offline/warmup.ts).

import { supabase } from './supabaseClient';
import { outbox } from './offline/outbox';
import { readCached, writeCached } from './offline/readCache';
import { dataService } from './dataService';

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  unit: string;
  description: string;
}

const MONTH_MAP: Record<string, string> = {
  enero: '01',
  febrero: '02',
  marzo: '03',
  abril: '04',
  mayo: '05',
  junio: '06',
  julio: '07',
  agosto: '08',
  septiembre: '09',
  octubre: '10',
  noviembre: '11',
  diciembre: '12'
};

/** «Octubre», «octubre 2026», «Oct.», «Setiembre» → '10'. Antes solo el nombre exacto. */
export function monthNumber(raw: string): string | undefined {
  const w = (raw || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().split(/[\s.,/-]+/)[0];
  if (!w) return undefined;
  if (MONTH_MAP[w]) return MONTH_MAP[w];
  if (w === 'setiembre') return '09';
  const byPrefix = Object.keys(MONTH_MAP).find(k => w.length >= 3 && k.startsWith(w.slice(0, 3)));
  if (byPrefix) return MONTH_MAP[byPrefix];
  const n = parseInt(w, 10);
  return n >= 1 && n <= 12 ? String(n).padStart(2, '0') : undefined;
}

interface CalendarUser {
  role?: string | null;
  unit?: string | null;
}

/**
 * Todos los eventos que el usuario puede ver. Con internet guarda una copia; sin internet
 * devuelve la última copia. Al final agrega los eventos creados sin conexión aún sin enviar.
 */
export async function loadCalendarEvents(user: CalendarUser | null | undefined): Promise<CalendarEvent[]> {
  const isScout = user?.role === 'scout';
  const canSeeAllUnits = user?.role === 'jefe_grupo' || user?.role === 'scouter';
  const userUnit = (user?.unit || 'clan').toLowerCase();

  const combinedEvents: CalendarEvent[] = [];
  // Solo cuenta lo que llegó del servidor: los CIP pueden venir de la copia del teléfono,
  // y si contaran, sin internet se guardaría un calendario con solo los CIP.
  let anyLoaded = false;

  // 1. Eventos manuales y eventos CIP de calendar_events
  try {
    // Los álbumes del Drive de fotos también viven en calendar_events: no son actividades
    let query = supabase.from('calendar_events').select('*').neq('unit', 'drive_album').order('date', { ascending: true });
    if (isScout) {
      query = query.in('unit', [userUnit, 'grupo']);
    }
    const { data, error } = await query;
    if (!error && data) {
      anyLoaded = true;
      combinedEvents.push(...data);
    }
  } catch (e) {
    console.warn('Aviso cargando calendar_events:', e);
  }

  // 2. Actividades del Plan Trimestral (quarterly_plans)
  try {
    const { data: qpData, error: qpError } = await supabase.from('quarterly_plans').select('*');
    if (!qpError && qpData) {
      anyLoaded = true;
      qpData.forEach((qp: any) => {
        let acts: any[] = [];
        if (qp.monthly_activities && Array.isArray(qp.monthly_activities)) {
          acts = qp.monthly_activities;
        } else if (qp.goals) {
          try {
            const parsed = typeof qp.goals === 'string' ? JSON.parse(qp.goals) : qp.goals;
            if (parsed.monthly_activities) acts = parsed.monthly_activities;
          } catch {}
        }

        const year = qp.year || new Date().getFullYear();
        acts.forEach((act: any) => {
          if (!act.activity || !act.month) return;
          const mNum = monthNumber(act.month);
          if (!mNum) return;
          const dayNum = parseInt(act.day || '15', 10);
          const dStr = String(isNaN(dayNum) ? 15 : dayNum).padStart(2, '0');
          const dateStr = `${year}-${mNum}-${dStr}`;
          const unit = (qp.unit || userUnit).toLowerCase();

          // Jefatura y Scouter ven todas las unidades; Scout ve solo la suya
          if (canSeeAllUnits || unit === userUnit) {
            combinedEvents.push({
              id: `qp_${qp.id}_${act.id || Math.random()}`,
              title: `[Plan Trimestral ${qp.quarter}] ${act.activity}`,
              date: dateStr,
              unit: unit,
              description: `Lugar: ${act.place || 'Sede'} • Responsable: ${act.responsible || 'Scouter'}${act.planB ? ` • Plan B: ${act.planB}` : ''}`,
            });
          }
        });
      });
    }
  } catch (e) {
    console.warn('Aviso cargando quarterly_plans en calendario:', e);
  }

  // 3. CIP del catálogo oficial (cip_oficiales)
  try {
    const { rows } = await dataService.getCipCatalog();
    rows.filter((c: any) => c.active !== false && c.fecha).forEach((c: any) => {
      combinedEvents.push({
        id: `cip_${c.id}`,
        title: `[CIP ${String(c.nivel || '').toUpperCase()}] ${c.nombre}`,
        date: String(c.fecha).slice(0, 10),
        unit: 'grupo',
        description: `CIP ${c.nivel}${c.lugar ? ` • Lugar: ${c.lugar}` : ''}${c.created_by_name ? ` • Lo registró: ${c.created_by_name}` : ''}`,
      });
    });
  } catch (e) {
    console.warn('Aviso cargando CIP en calendario:', e);
  }

  // 4. Programas de actividades (scout_programas)
  try {
    const { data: progData, error: progError } = await supabase.from('scout_programas').select('*');
    if (!progError && progData) {
      anyLoaded = true;
      progData.forEach((p: any) => {
        if (!p.date || !p.title) return;
        const unit = (p.unit || 'clan').toLowerCase();
        const isSinodalMatch = p.is_sinodal && p.selected_units?.includes(userUnit);

        // Jefatura y Scouter ven todas las unidades; Scout ve solo la suya o sinodales
        if (canSeeAllUnits || unit === userUnit || isSinodalMatch) {
          combinedEvents.push({
            id: `prog_${p.id}`,
            title: `[Programa Scout] ${p.title}`,
            date: p.date,
            unit: unit,
            description: `Lugar: ${p.location || 'Por definir'} • Tipo: ${p.activity_type || p.activityType || 'Actividad'} • Responsable: ${p.creator_name || 'Scouter'}`,
          });
        }
      });
    }
  } catch (e) {
    console.warn('Aviso cargando scout_programas en calendario:', e);
  }

  // Copia offline del calendario: sin red se muestra la última versión cargada
  const cacheKey = `calendar_${user?.role}_${userUnit}`;
  let finalEvents = combinedEvents;
  if (anyLoaded) {
    writeCached(cacheKey, combinedEvents);
  } else {
    finalEvents = (await readCached<CalendarEvent[]>(cacheKey)) || combinedEvents;
  }
  // Eventos creados sin conexión, aún sin enviar
  const ids = new Set(finalEvents.map(e => e.id));
  const pendingEvents = (await outbox.pending('row.insert'))
    .filter(o => o.payload?.table === 'calendar_events' && o.payload.row && !ids.has(o.payload.row.id))
    .map(o => ({ ...o.payload.row, description: `${o.payload.row.description || ''} (pendiente de enviar)`.trim() }));

  return [...finalEvents, ...pendingEvents];
}
