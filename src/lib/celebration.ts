// Celebración de insignias: la versión real está en celebration.web.ts (la app se usa como web /
// app instalada). En Android/iOS nativos todavía no hay animación.
export interface CelebrationOptions {
  title: string;
  color: string;
  badge: any;
  isMax: boolean;
  unitLabel?: string;
  nextTitle?: string;
}

export function showBadgeCelebration(_o: CelebrationOptions): Promise<void> {
  return Promise.resolve();
}
