// Sistema de diseño (2026-11-16). Una sola fuente para radios, espacios, tamaños de letra,
// tiempos de animación y el color de acento de cada rama. Las pantallas no deben escribir
// estos números a mano: se importan de aquí.

/** Bordes redondeados. */
export const RADIUS = {
  sm: 8,     // detalles
  md: 12,    // botones y campos
  lg: 16,    // tarjetas
  xl: 24,    // cabeceras y hojas inferiores
  pill: 999, // etiquetas
} as const;

/** Espacios (múltiplos de 4). */
export const SPACE = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

/** Tamaños de letra. Mínimo permitido: 12. */
export const TYPE = {
  h1: { fontSize: 28, lineHeight: 34, fontWeight: '700' as const },
  h2: { fontSize: 22, lineHeight: 28, fontWeight: '700' as const },
  h3: { fontSize: 18, lineHeight: 24, fontWeight: '600' as const },
  body: { fontSize: 16, lineHeight: 23 },
  small: { fontSize: 14, lineHeight: 20 },
  tiny: { fontSize: 12, lineHeight: 16 },
  over: { fontSize: 12, lineHeight: 16, fontWeight: '600' as const, letterSpacing: 0.7, textTransform: 'uppercase' as const },
};

/** Tiempos de animación (ms). Una sola curva: sale rápido y frena suave. */
export const MOTION = {
  press: 120,   // botón que se encoge al tocarlo
  state: 200,   // cambios de color, foco
  enter: 320,   // contenido que aparece
  fill: 600,    // barras de progreso
  pop: 480,     // rebote de logro
  stagger: 60,  // retraso entre elementos en cascada
  bezier: [0.2, 0.8, 0.2, 1] as [number, number, number, number],
} as const;

/** Zona mínima que se puede tocar. */
export const TOUCH_MIN = 44;

/** Color de acento de partida por rama. Son los colores oficiales, oscurecidos lo justo
 *  para que la letra blanca sobre el botón se lea. */
export const RAMA_ACCENTS: Record<string, string> = {
  manada: '#a85d00', // ámbar oscuro: el amarillo oficial (#ffb300) no deja leer la letra blanca
  tropa: '#2e7d32',
  comunidad: '#1565c0',
  clan: '#d32f2f',
  grupo: '#612499',
};

export const DEFAULT_ACCENT = RAMA_ACCENTS.grupo;

/** Jóvenes y scouters de unidad ven el color de su rama; Jefatura y comisionados, el morado. */
export function accentForUser(user?: { role?: string | null; unit?: string | null } | null): string {
  if (!user) return DEFAULT_ACCENT;
  if (user.role === 'scout' || user.role === 'scouter') {
    const unit = (user.unit || '').toLowerCase();
    return RAMA_ACCENTS[unit] || DEFAULT_ACCENT;
  }
  return DEFAULT_ACCENT;
}

// ── Utilidades de color ──────────────────────────────────────────────────────────────────
function parseHex(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHex(rgb: number[]): string {
  return '#' + rgb.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
}

export function luminance(hex: string): number {
  const rgb = parseHex(hex);
  if (!rgb) return 0;
  const [r, g, b] = rgb.map(v => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string): number {
  const la = luminance(a), lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Mezcla `hex` con `other` (t = 0 deja hex; t = 1 deja other). */
export function mix(hex: string, other: string, t: number): string {
  const a = parseHex(hex), b = parseHex(other);
  if (!a || !b) return hex;
  return toHex(a.map((v, i) => v + (b[i] - v) * t));
}

export const lighten = (hex: string, t: number) => mix(hex, '#ffffff', t);

/** Letra oscura para fondos claros de acento (p. ej. el amarillo de Manada). */
export const ON_ACCENT_DARK = '#2b1d00';

/** Color de letra que se lee sobre un fondo de acento: blanca salvo que el fondo sea claro. */
export function onColor(bg: string): string {
  return contrast(bg, '#ffffff') >= 3.9 ? '#ffffff' : ON_ACCENT_DARK;
}

/** Acento listo para dibujar sobre fondo oscuro: se aclara solo lo necesario para distinguirse. */
export function accentOnDark(hex: string, darkSurface = '#18181b'): string {
  let out = hex;
  for (let t = 0.05; contrast(out, darkSurface) < 3 && t <= 0.6; t += 0.05) out = lighten(hex, t);
  return out;
}

/** Acento legible como TEXTO sobre una superficie (4,5:1 como mínimo). */
export function accentAsText(hex: string, surface: string, dark: boolean): string {
  let out = hex;
  const target = dark ? '#ffffff' : '#000000';
  for (let t = 0.05; contrast(out, surface) < 4.5 && t <= 0.9; t += 0.05) out = mix(hex, target, t);
  return out;
}
