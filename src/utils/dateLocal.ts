/**
 * Fecha de HOY en la zona horaria del teléfono (AAAA-MM-DD).
 * Antes se usaba new Date().toISOString(), que es hora UTC: en Venezuela (UTC-4),
 * después de las 8:00 p. m. "hoy" salía como el día siguiente.
 */
export function todayLocal(base: Date = new Date()): string {
  const y = base.getFullYear();
  const m = String(base.getMonth() + 1).padStart(2, '0');
  const d = String(base.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Fecha sugerida para el vencimiento de una membresía nueva: un año desde hoy. */
export function defaultMembershipDate(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return todayLocal(d);
}

/**
 * Días que faltan desde hoy (hora local) hasta una fecha AAAA-MM-DD.
 * Negativo si ya pasó; null si la fecha no es válida.
 */
export function daysUntil(dateStr?: string | null, base: Date = new Date()): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr || '');
  if (!m) return null;
  const target = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const today = new Date(base.getFullYear(), base.getMonth(), base.getDate());
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

/** AAAA-MM-DD → DD/MM/AAAA para mostrar. */
export function formatDateEs(dateStr?: string | null): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr || '');
  return m ? `${m[3]}/${m[2]}/${m[1]}` : (dateStr || '');
}
