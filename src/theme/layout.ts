// En computadora (pantalla ancha) el contenido no se estira de lado a lado: queda centrado
// con un ancho cómodo de leer. En el teléfono no cambia nada (es más angosto que el máximo).
export const CONTENT_MAX_WIDTH = 960;

export const contentMax = {
  width: '100%' as const,
  maxWidth: CONTENT_MAX_WIDTH,
  alignSelf: 'center' as const,
};

// Paneles de dirigentes en pantallas grandes (≥ 1200 px, p. ej. 1080p o 2K): usan casi todo el
// ancho y reparten las secciones en columnas, en vez de quedarse en la columna de 960 px.
export const WIDE_BREAKPOINT = 1200;
export const CONTENT_WIDE_MAX_WIDTH = 2400;

export const contentWide = {
  width: '100%' as const,
  maxWidth: CONTENT_WIDE_MAX_WIDTH,
  alignSelf: 'center' as const,
};
