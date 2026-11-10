// En computadora (pantalla ancha) el contenido no se estira de lado a lado: queda centrado
// con un ancho cómodo de leer. En el teléfono no cambia nada (es más angosto que el máximo).
export const CONTENT_MAX_WIDTH = 960;

export const contentMax = {
  width: '100%' as const,
  maxWidth: CONTENT_MAX_WIDTH,
  alignSelf: 'center' as const,
};
