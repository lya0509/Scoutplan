// Ramas de la ASV: rango de edad y plantilla de etapas de cada una.
// Hoy solo existe la plantilla del Clan (progressionTemplate.ts). Cuando lleguen las de
// Manada, Tropa y Caminantes se cargan aquí (campo `stages`) y getStagesForUnit las usa;
// mientras tanto esas ramas ven la del Clan con un aviso.

import { stagesData } from './progressionTemplate';
import { ageFrom } from '../utils/dateLocal';

export type UnitKey = 'manada' | 'tropa' | 'caminantes' | 'clan';

export interface UnitInfo {
  key: UnitKey;
  label: string;
  minAge: number;
  maxAge: number;
  color: string;
  /** Plantilla de etapas propia; undefined = todavía no cargada. */
  stages?: typeof stagesData;
}

export const UNITS: Record<UnitKey, UnitInfo> = {
  manada: { key: 'manada', label: 'Manada', minAge: 7, maxAge: 10, color: '#ca8a04' },
  tropa: { key: 'tropa', label: 'Tropa', minAge: 10, maxAge: 15, color: '#16a34a' },
  caminantes: { key: 'caminantes', label: 'Caminantes', minAge: 16, maxAge: 18, color: '#2563eb' },
  clan: { key: 'clan', label: 'Clan', minAge: 18, maxAge: 21, color: '#dc2626', stages: stagesData },
};

const ORDER: UnitKey[] = ['manada', 'tropa', 'caminantes', 'clan'];

/** "Comunidad" y variantes de mayúsculas se tratan como la misma rama. */
export function unitKey(unit?: string | null): UnitKey | null {
  const u = String(unit || '').trim().toLowerCase();
  if (u === 'comunidad' || u === 'caminante') return 'caminantes';
  return (ORDER as string[]).includes(u) ? (u as UnitKey) : null;
}

export function getUnitInfo(unit?: string | null): UnitInfo | null {
  const k = unitKey(unit);
  return k ? UNITS[k] : null;
}

/** Ramas que corresponden a una edad (en los bordes, 10 y 18, valen dos). */
export function unitsForAge(age: number | null): UnitInfo[] {
  if (age === null) return [];
  return ORDER.map(k => UNITS[k]).filter(u => age >= u.minAge && age <= u.maxAge);
}

export type AgeFit =
  | { kind: 'unknown' }                                  // sin fecha de nacimiento o sin rama juvenil
  | { kind: 'ok'; age: number; unit: UnitInfo }
  | { kind: 'young'; age: number; unit: UnitInfo }       // aún no tiene la edad de su rama
  | { kind: 'old'; age: number; unit: UnitInfo; next: UnitInfo | null }; // ya pasó la edad: paso de rama

/** ¿La edad del joven coincide con su rama? */
export function ageFitForUnit(unit?: string | null, birthDate?: string | null): AgeFit {
  const info = getUnitInfo(unit);
  const age = ageFrom(birthDate || undefined);
  if (!info || age === null) return { kind: 'unknown' };
  if (age < info.minAge) return { kind: 'young', age, unit: info };
  if (age > info.maxAge) {
    const next = unitsForAge(age).find(u => ORDER.indexOf(u.key) > ORDER.indexOf(info.key)) || null;
    return { kind: 'old', age, unit: info, next };
  }
  return { kind: 'ok', age, unit: info };
}

/** Texto corto para listas: "12 años · edad de Tropa". */
export function ageFitLabel(fit: AgeFit): string {
  if (fit.kind === 'unknown') return '';
  if (fit.kind === 'ok') return `${fit.age} años`;
  if (fit.kind === 'young') return `${fit.age} años · menor que ${fit.unit.label} (${fit.unit.minAge}–${fit.unit.maxAge})`;
  return fit.next
    ? `${fit.age} años · edad de ${fit.next.label}`
    : `${fit.age} años · pasó la edad de ${fit.unit.label} (${fit.unit.minAge}–${fit.unit.maxAge})`;
}

/** Etapas de la rama. Si su plantilla aún no está cargada, se usa la del Clan. */
export function getStagesForUnit(unit?: string | null): { stages: typeof stagesData; isFallback: boolean; unit: UnitInfo | null } {
  const info = getUnitInfo(unit);
  if (info?.stages) return { stages: info.stages, isFallback: false, unit: info };
  return { stages: stagesData, isFallback: !!info && info.key !== 'clan', unit: info };
}
