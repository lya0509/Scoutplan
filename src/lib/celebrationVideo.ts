// Video de la celebración de una insignia: la versión real está en celebrationVideo.web.ts (la app
// se usa como web / app instalada). En Android/iOS nativos todavía no está disponible.
export interface CelebrationVideoOptions {
  title: string;
  color: string;
  badge: any;
  isMax: boolean;
  name: string;
  groupName?: string;
  unitLabel?: string;
  dateText?: string;
  nextTitle?: string;
}

export function canMakeCelebrationVideo(): boolean {
  return false;
}

export function openCelebrationVideo(_o: CelebrationVideoOptions): void {
  /* sin soporte nativo todavía */
}
