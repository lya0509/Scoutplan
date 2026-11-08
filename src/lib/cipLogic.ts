import { stagesData } from '../data/progressionTemplate';

export type CipNivel = 'distrital' | 'regional' | 'nacional';

export const NIVEL_LABEL: Record<string, string> = {
  distrital: 'Distrital',
  regional: 'Regional',
  nacional: 'Nacional',
};

/** Texto de la Ley Scout que acompaña las solicitudes de CIP anteriores a la app. */
export const LEY_CONFIANZA = 'El Scout cifra su honor en ser digno de confianza.';

export interface CipTarget {
  stageId: string;
  stageName: string;
  reqId: string;
  reqText: string;
  required: number;
}

/** Etapa que el joven está cursando: la primera que no está aprobada. */
export function currentStageId(statuses: Record<string, string>): string | null {
  for (const st of stagesData) {
    if ((statuses[st.id] || '') !== 'Aprobada') return st.id;
  }
  return null;
}

/** Requisito de CIP de ese nivel en una etapa (p. ej. descubridor + nacional → des_cip_nacional). */
export function cipRequirement(stageId: string, nivel: string): CipTarget | null {
  const st = stagesData.find(s => s.id === stageId);
  if (!st) return null;
  const req = st.requirements.find(r => r.type === 'ciclos' && r.id.endsWith(`_cip_${nivel}`));
  if (!req) return null;
  return { stageId: st.id, stageName: st.title, reqId: req.id, reqText: req.text, required: req.requiredCount || 1 };
}

/** A qué requisito cuenta un CIP de ese nivel para un joven, según la etapa que cursa. */
export function cipTargetFor(statuses: Record<string, string>, nivel: string): CipTarget | null {
  const cur = currentStageId(statuses);
  return cur ? cipRequirement(cur, nivel) : null;
}

/** Etapas que tienen requisito de CIP de ese nivel (para elegir dónde acreditar uno antiguo). */
export function stagesWithCip(nivel: string): CipTarget[] {
  return stagesData.map(s => cipRequirement(s.id, nivel)).filter(Boolean) as CipTarget[];
}

/** Lee el JSON guardado en certificates.file_url de una fila de CIP. */
export function parseCipMeta(fileUrl?: string | null): any {
  if (fileUrl && fileUrl.startsWith('{')) {
    try { return JSON.parse(fileUrl); } catch {}
  }
  return {};
}
