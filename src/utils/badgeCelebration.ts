// Qué insignias celebrar: las etapas que el Scouter aprobó y que el scout todavía no vio
// celebradas en este teléfono. Funciones puras (sin React ni Supabase) para poder probarlas.

/** La primera vez (sin registro en el teléfono) solo se celebran las aprobadas en estos días. */
export const RECENT_DAYS = 7;

export interface CelebrationPlan {
  /** Etapas a celebrar, en el orden de la rama. */
  toCelebrate: string[];
  /** Etapas ya celebradas que se guardan; null = no guardar nada (sin datos todavía). */
  seen: string[] | null;
}

/**
 * @param statuses { stageId: estado } de stage_progress ('Aprobada' = aprobada por el Scouter)
 * @param seen etapas ya celebradas en este teléfono (null = nunca se revisó)
 * @param dates { stageId: ISO } último cambio de la etapa (en una aprobada, la fecha de aprobación)
 * @param order ids de las etapas de la rama, en orden
 */
export function planCelebrations(
  statuses: Record<string, string>,
  seen: string[] | null,
  dates: Record<string, string>,
  order: string[],
  now: number = Date.now(),
): CelebrationPlan {
  // Sin datos (sin internet y sin copia guardada): no decidir nada, para no celebrar de más después
  if (Object.keys(statuses).length === 0) return { toCelebrate: [], seen };

  const approved = Object.keys(statuses).filter(id => statuses[id] === 'Aprobada');
  let toCelebrate: string[];
  let kept: string[];
  if (seen === null) {
    // Primera vez: las insignias viejas no saltan todas de golpe
    const cutoff = now - RECENT_DAYS * 86400000;
    toCelebrate = approved.filter(id => {
      const t = Date.parse(dates[id] || '');
      return !isNaN(t) && t >= cutoff;
    });
    kept = approved.filter(id => !toCelebrate.includes(id));
  } else {
    // Una etapa devuelta (ya no 'Aprobada') sale de la lista: si la vuelven a aprobar, se celebra otra vez
    kept = seen.filter(id => !(id in statuses) || statuses[id] === 'Aprobada');
    toCelebrate = approved.filter(id => !kept.includes(id));
  }
  const rank = (id: string) => {
    const i = order.indexOf(id);
    return i < 0 ? order.length : i;
  };
  toCelebrate.sort((a, b) => rank(a) - rank(b));
  return { toCelebrate, seen: kept };
}

/** La máxima insignia de la rama es su última etapa (en el Clan, Rover Ciudadano). */
export function isMaxBadge(stageId: string, order: string[]): boolean {
  return order.length > 0 && order[order.length - 1] === stageId;
}
