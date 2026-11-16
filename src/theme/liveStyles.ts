// Hojas de estilo que siguen el color de acento en vivo.
//
// Muchas pantallas escriben `colors.primary` dentro de StyleSheet.create: ese valor se leía una
// sola vez, al cargar la app, y por eso el morado se quedaba fijo aunque el tema cambiara (por la
// rama de quien inició sesión, «Personalizar» o el modo oscuro). `liveStyles` vuelve a armar la
// hoja cuando cambia `colors.primary` (ThemeContext lo actualiza antes de dibujar las pantallas).
import { colors } from './colors';

export function liveStyles<T extends object>(factory: () => T): T {
  let builtFor: string | null = null;
  let built: T | null = null;
  const current = (): T => {
    if (built === null || builtFor !== colors.primary) {
      builtFor = colors.primary;
      built = factory();
    }
    return built;
  };
  return new Proxy({} as T, {
    get: (_t, key) => (current() as any)[key as any],
    has: (_t, key) => key in (current() as any),
    ownKeys: () => Reflect.ownKeys(current() as any),
    getOwnPropertyDescriptor: (_t, key) => {
      const d = Object.getOwnPropertyDescriptor(current() as any, key);
      return d ? { ...d, configurable: true } : undefined;
    },
  });
}
