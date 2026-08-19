export interface RegistrationBadge {
  id: string;
  year: number;
  title: string;
  imageUri: string;
  isDefault?: boolean;
}

export const REGISTRATION_BADGES: RegistrationBadge[] = [
  {
    id: 'reg_2026',
    year: 2026,
    title: 'Bienestar en Acción 2026',
    imageUri: '/programa_assets/registro_2026.png',
    isDefault: true,
  },
  {
    id: 'reg_2025',
    year: 2025,
    title: 'Sembrando Valores 2025',
    imageUri: '/programa_assets/registro_2026.png', // Fallback
  },
];

export const UNIT_PROGRAMA_LOGOS: Record<string, string> = {
  manada: '/programa_assets/logo_manada.jpg',
  tropa: '/programa_assets/logo_tropa.png',
  caminantes: '/programa_assets/logo_scout.png', // Fallback limpio hasta que se suba el HD
  clan: '/programa_assets/logo_clan.jpg',
};

export const SCOUT_WOSM_LOGO = '/programa_assets/logo_scout.png';
export const GROUP_ORION_LOGO = '/programa_assets/orion.png';
