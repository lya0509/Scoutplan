// Reporte de avance de insignias de una unidad / grupo: quién va en qué etapa, con qué
// porcentaje y cuándo aprobó cada etapa. Se exporta a Excel (.xlsx) o PDF.

import { supabase } from './supabaseClient';
import { must } from './offline/net';
import { stagesData } from '../data/progressionTemplate';
import { ReportTable, Cell } from '../utils/reportTable';
import { ageFrom } from '../utils/exportHelpers';
import { formatDateEs } from '../utils/dateLocal';

export interface InsigniaMember {
  id: string;
  name: string;
  unit?: string;
  birth_date?: string;
}

interface StageRow { scout_id: string; stage_id: string; status: string; updated_at?: string }
interface ReqRow { scout_id: string; stage_id: string; requirement_id: string; completed: boolean }

const CHUNK = 80; // .in() con muchos ids hace URLs muy largas

async function fetchIn<T>(table: string, columns: string, ids: string[]): Promise<T[]> {
  const out: T[] = [];
  for (let i = 0; i < ids.length; i += CHUNK) {
    const part = ids.slice(i, i + CHUNK);
    let q: any = supabase.from(table).select(columns).in('scout_id', part);
    if (table === 'requirement_progress') q = q.eq('completed', true);
    out.push(...((must(await q) as T[]) || []));
  }
  return out;
}

const toDate = (iso?: string) => (iso ? formatDateEs(iso.slice(0, 10)) : '');

const STATUS_COLOR: Record<string, string> = {
  Aprobada: '#15803d',
  'En Revision': '#7e22ce',
  'En Progreso': '#1d4ed8',
  Bloqueada: '#6b7280',
};

/** Lee el progreso de todos (requiere internet) y arma el reporte. */
export async function buildInsigniasReport(members: InsigniaMember[], groupName: string, scopeLabel: string): Promise<ReportTable> {
  const ids = members.map(m => m.id);
  const [stageRows, reqRows] = await Promise.all([
    fetchIn<StageRow>('stage_progress', 'scout_id, stage_id, status, updated_at', ids),
    fetchIn<ReqRow>('requirement_progress', 'scout_id, stage_id, requirement_id, completed', ids),
  ]);

  const stagesBy = new Map<string, Map<string, StageRow>>();
  stageRows.forEach(r => {
    if (!stagesBy.has(r.scout_id)) stagesBy.set(r.scout_id, new Map());
    stagesBy.get(r.scout_id)!.set(r.stage_id, r);
  });
  const doneBy = new Map<string, Set<string>>();
  reqRows.forEach(r => {
    if (!r.completed) return;
    const key = `${r.scout_id}|${r.stage_id}`;
    if (!doneBy.has(key)) doneBy.set(key, new Set());
    doneBy.get(key)!.add(r.requirement_id);
  });

  const summary: Cell[][] = [];
  const detail: Cell[][] = [];
  const sorted = [...members].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'es'));

  sorted.forEach((m, idx) => {
    const st = stagesBy.get(m.id) || new Map<string, StageRow>();
    let prevApproved = true;
    let current: { title: string; status: string; pct: number; done: number; total: number } | null = null;
    let approvedCount = 0;
    let lastApproval = '';

    stagesData.forEach(stage => {
      const row = st.get(stage.id);
      const status = !prevApproved ? 'Bloqueada' : (row?.status || 'En Progreso');
      prevApproved = row?.status === 'Aprobada';
      const done = doneBy.get(`${m.id}|${stage.id}`) || new Set<string>();
      const total = stage.requirements.length;
      const doneCount = status === 'Aprobada' ? total : stage.requirements.filter(r => done.has(r.id)).length;
      const pct = total ? Math.round((doneCount / total) * 100) : 0;
      if (status === 'Aprobada') {
        approvedCount++;
        if (row?.updated_at && row.updated_at > lastApproval) lastApproval = row.updated_at;
      }
      if (!current && status !== 'Aprobada' && status !== 'Bloqueada') {
        current = { title: stage.title, status, pct, done: doneCount, total };
      }
      if (status !== 'Bloqueada') {
        detail.push([
          { v: m.name, bold: true },
          stage.title,
          { v: status === 'En Revision' ? 'En revisión' : status, color: STATUS_COLOR[status], bold: true },
          `${doneCount} de ${total}`,
          `${pct}%`,
          status === 'Aprobada' ? toDate(row?.updated_at) : '',
        ]);
      }
    });

    const cur = current as { title: string; status: string; pct: number; done: number; total: number } | null;
    summary.push([
      idx + 1,
      { v: m.name, bold: true },
      (m.unit || '').toUpperCase(),
      ageFrom(m.birth_date) ?? '',
      cur ? cur.title : { v: 'Todas aprobadas', color: '#15803d', bold: true },
      cur ? { v: cur.status === 'En Revision' ? 'En revisión' : cur.status, color: STATUS_COLOR[cur.status], bold: true } : '',
      cur ? `${cur.pct}% (${cur.done}/${cur.total})` : '100%',
      `${approvedCount} de ${stagesData.length}`,
      toDate(lastApproval),
    ]);
  });

  return {
    title: 'Avance de Insignias',
    subtitle: `${scopeLabel} · ${members.length} ${members.length === 1 ? 'miembro' : 'miembros'}`,
    groupName: groupName || 'Grupo Scout',
    accent: '#612499',
    fileBase: `Avance_Insignias_${scopeLabel}`,
    sections: [
      {
        name: 'Resumen',
        headers: ['#', 'Nombre', 'Rama', 'Edad', 'Etapa actual', 'Estado', 'Avance de la etapa', 'Etapas aprobadas', 'Última aprobación'],
        widths: [3, 22, 8, 5, 14, 11, 14, 11, 12],
        rows: summary,
      },
      {
        name: 'Detalle por etapa',
        headers: ['Nombre', 'Etapa', 'Estado', 'Requisitos', 'Avance', 'Fecha de aprobación'],
        widths: [22, 14, 12, 10, 8, 14],
        rows: detail,
      },
    ],
  };
}
