/**
 * Estructura territorial de la ASV (regiones, distritos, grupos) y nombres de roles.
 * Una sola fuente para Registro, Panel de Comisionados y Administración.
 * Los grupos creados desde la app viven en la tabla `scout_groups`; esta lista fija es
 * el respaldo (sin conexión o si la tabla aún no existe).
 */

export interface Option { id: string; label: string }

export const REGIONS: Option[] = [
  { id: 'miranda', label: 'Región Miranda' },
  { id: 'capital', label: 'Región Capital' },
  { id: 'amazonas', label: 'Región Amazonas' },
  { id: 'anzoategui', label: 'Región Anzoátegui' },
  { id: 'apure', label: 'Región Apure' },
  { id: 'aragua', label: 'Región Aragua' },
  { id: 'barinas', label: 'Región Barinas' },
  { id: 'bolivar', label: 'Región Bolívar' },
  { id: 'carabobo', label: 'Región Carabobo' },
  { id: 'cojedes', label: 'Región Cojedes' },
  { id: 'delta_amacuro', label: 'Región Delta Amacuro' },
  { id: 'falcon', label: 'Región Falcón' },
  { id: 'guarico', label: 'Región Guárico' },
  { id: 'lara', label: 'Región Lara' },
  { id: 'merida', label: 'Región Mérida' },
  { id: 'monagas', label: 'Región Monagas' },
  { id: 'nueva_esparta', label: 'Región Nueva Esparta' },
  { id: 'portuguesa', label: 'Región Portuguesa' },
  { id: 'sucre', label: 'Región Sucre' },
  { id: 'tachira', label: 'Región Táchira' },
  { id: 'trujillo', label: 'Región Trujillo' },
  { id: 'vargas', label: 'Región Vargas (La Guaira)' },
  { id: 'yaracuy', label: 'Región Yaracuy' },
  { id: 'zulia', label: 'Región Zulia' },
];

export const OTHER_DISTRICT: Option = { id: 'otro_distrito', label: 'Otro Distrito' };
export const OTHER_GROUP: Option = { id: 'Otro Grupo Scout', label: 'Otro Grupo Scout' };

export const STATIC_DISTRICTS: Record<string, Option[]> = {
  miranda: [
    { id: 'guarenas_guatire', label: 'Distrito Guarenas-Guatire' },
    { id: 'altos_mirandinos', label: 'Distrito Altos Mirandinos' },
  ],
};

export const STATIC_GROUPS: Record<string, Option[]> = {
  guarenas_guatire: [
    { id: 'Grupo Orión #84', label: 'Grupo Scout Orión #84' },
    { id: 'Grupo Alianza', label: 'Grupo Scout Alianza' },
    { id: 'Grupo Mafeking', label: 'Grupo Scout Mafeking' },
    { id: 'Grupo Gamma', label: 'Grupo Scout Gamma' },
    { id: 'Grupo Sirio', label: 'Grupo Scout Sirio' },
    { id: 'Grupo Aquatiri', label: 'Grupo Scout Aquatiri' },
  ],
};

/** Grupo tal como lo guarda la tabla scout_groups. */
export interface ScoutGroup {
  id?: string;
  name: string;
  region?: string | null;
  district?: string | null;
  active?: boolean;
  created_at?: string;
}

export function regionLabel(id?: string | null): string {
  if (!id) return 'Sin región';
  return REGIONS.find(r => r.id === id)?.label || id;
}

export function districtLabel(id?: string | null): string {
  if (!id) return 'Sin distrito';
  for (const list of Object.values(STATIC_DISTRICTS)) {
    const hit = list.find(d => d.id === id);
    if (hit) return hit.label;
  }
  if (id === OTHER_DISTRICT.id) return OTHER_DISTRICT.label;
  return id;
}

/** Distritos de una región: los fijos + los que aparecen en grupos creados desde la app. */
export function districtsFor(regionId: string, groups: ScoutGroup[] = []): Option[] {
  const out: Option[] = [...(STATIC_DISTRICTS[regionId] || [])];
  groups.forEach(g => {
    if (g.region === regionId && g.district && !out.some(d => d.id === g.district) && g.district !== OTHER_DISTRICT.id) {
      out.push({ id: g.district, label: districtLabel(g.district) });
    }
  });
  return [...out, OTHER_DISTRICT];
}

/** Grupos de un distrito: los fijos + los activos de la tabla. Siempre termina en "Otro". */
export function groupsFor(districtId: string, groups: ScoutGroup[] = []): Option[] {
  const out: Option[] = [...(STATIC_GROUPS[districtId] || [])];
  groups.forEach(g => {
    if (g.active !== false && g.district === districtId && !out.some(o => o.id === g.name)) {
      out.push({ id: g.name, label: g.name });
    }
  });
  if (!out.length) out.push({ id: 'Grupo Orión #84', label: 'Grupo Scout Orión #84' });
  return [...out, OTHER_GROUP];
}

/** Convierte un nombre escrito a mano en un id estable ("Distrito Lara Centro" → "lara_centro"). */
export function slugDistrict(label: string): string {
  return label
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/^distrito\s+/, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

export type AppRole =
  | 'scout' | 'scouter' | 'jefe_grupo'
  | 'comisionado' | 'comisionado_distrital' | 'comisionado_regional'
  | 'nacional' | 'admin';

export const ROLE_LABELS: Record<string, string> = {
  scout: 'Joven (Scout)',
  scouter: 'Scouter / Dirigente',
  jefe_grupo: 'Jefe de Grupo',
  comisionado: 'Comisionado Distrital',
  comisionado_distrital: 'Comisionado Distrital',
  comisionado_regional: 'Comisionado Regional',
  nacional: 'Nacional',
  admin: 'Administrador',
};

/** Qué roles puede asignar cada rol (igual que la regla proteger_perfil en la base de datos). */
export function assignableRoles(myRole?: string | null): AppRole[] {
  switch (myRole) {
    case 'admin':
    case 'nacional':
      return ['scout', 'scouter', 'jefe_grupo', 'comisionado_distrital', 'comisionado_regional', 'nacional', 'admin'];
    case 'comisionado_regional':
      return ['scout', 'scouter', 'jefe_grupo', 'comisionado_distrital'];
    case 'comisionado_distrital':
    case 'comisionado':
    case 'jefe_grupo':
      return ['scout', 'scouter', 'jefe_grupo'];
    default:
      return [];
  }
}

/** ¿Puede mover personas de grupo? (Comisionados dentro de su territorio, admin en todo). */
export function canMoveMembers(myRole?: string | null): boolean {
  return ['admin', 'nacional', 'comisionado_regional', 'comisionado_distrital', 'comisionado'].includes(myRole || '');
}

/** ¿Puede crear grupos? */
export function canCreateGroups(myRole?: string | null): boolean {
  return canMoveMembers(myRole);
}
