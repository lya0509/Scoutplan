// Versión de la app que está corriendo en este teléfono/computadora. La fecha la pone
// `npm run build:web` (EXPO_PUBLIC_BUILD_TIME) y el commit lo da Vercel al compilar.
// Sirve para saber si un teléfono ya tiene un arreglo o sigue con la copia anterior.
const BUILD_TIME = process.env.EXPO_PUBLIC_BUILD_TIME || '';
const COMMIT = (process.env.EXPO_PUBLIC_COMMIT || '').slice(0, 7);

export function appVersionLabel(): string {
  const d = BUILD_TIME ? new Date(BUILD_TIME) : null;
  const when = d && !isNaN(d.getTime())
    ? d.toLocaleString('es-VE', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
    : 'desarrollo';
  return COMMIT && COMMIT !== 'local' ? `${when} · ${COMMIT}` : when;
}
