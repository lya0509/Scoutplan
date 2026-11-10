// Regla de botones de la app (2026-11-10):
//   principal  → morado lleno: LA acción importante de la pantalla (guardar, crear, enviar)
//   secundario → fondo de tarjeta con borde: exportar, copiar, ver, filtros. El ícono puede
//                llevar su color propio (Excel/WhatsApp verde, PDF rojo) para reconocerlo.
//   peligro    → borde y letra rojos: borrar, limpiar, rechazar
// Antes cada pantalla pintaba sus botones de un color distinto (verde, rojo, ámbar, morado).

interface ThemeLike { cardBg: string; border: string; text: string }

export function buttonVariants(theme: ThemeLike, isDarkMode: boolean, primaryColor: string) {
  return {
    primary: { backgroundColor: primaryColor, borderWidth: 1, borderColor: primaryColor },
    primaryText: { color: '#ffffff' },
    secondary: { backgroundColor: theme.cardBg, borderWidth: 1, borderColor: theme.border },
    secondaryText: { color: theme.text },
    danger: { backgroundColor: isDarkMode ? 'rgba(248, 113, 113, 0.08)' : '#fff5f5', borderWidth: 1, borderColor: isDarkMode ? '#7f1d1d' : '#fecaca' },
    dangerText: { color: isDarkMode ? '#fca5a5' : '#b91c1c' },
  };
}

/** Colores de ícono para reconocer el tipo de archivo en botones secundarios. */
export const ICON_COLORS = {
  excel: '#15803d',
  whatsapp: '#15803d',
  pdf: '#b91c1c',
};
export function iconColor(kind: keyof typeof ICON_COLORS, isDarkMode: boolean) {
  if (!isDarkMode) return ICON_COLORS[kind];
  return { excel: '#4ade80', whatsapp: '#4ade80', pdf: '#f87171' }[kind];
}
