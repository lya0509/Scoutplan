// Cálculos del recorte de fotos de perfil (sin dependencias de React: se prueban solos en
// tests/unit). La foto se muestra dentro de un marco cuadrado de lado `frame` px:
// - `zoom` 1 = la foto cubre justo el marco (lado corto = marco); hasta MAX_ZOOM.
// - `offset` = cuánto se movió el centro de la foto respecto al centro del marco (px de pantalla).
// - `rotation` = 0, 90, 180 o 270 grados.

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 4;

export type Rotation = 0 | 90 | 180 | 270;

export interface CropState {
  zoom: number;
  offset: { x: number; y: number };
  rotation: Rotation;
}

/** Tamaño de la foto ya girada (en px de la imagen original). */
export function rotatedSize(w: number, h: number, rotation: Rotation) {
  return rotation % 180 === 0 ? { w, h } : { w: h, h: w };
}

/** Escala (px de pantalla por px de imagen) para el zoom pedido. */
export function displayScale(w: number, h: number, rotation: Rotation, frame: number, zoom: number) {
  const r = rotatedSize(w, h, rotation);
  return (frame / Math.min(r.w, r.h)) * clampZoom(zoom);
}

export function clampZoom(zoom: number) {
  if (!Number.isFinite(zoom)) return MIN_ZOOM;
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
}

/** Limita el desplazamiento para que la foto siempre cubra todo el marco (sin bordes vacíos). */
export function clampOffset(
  offset: { x: number; y: number },
  w: number,
  h: number,
  rotation: Rotation,
  frame: number,
  zoom: number,
) {
  const s = displayScale(w, h, rotation, frame, zoom);
  const r = rotatedSize(w, h, rotation);
  const maxX = Math.max(0, (r.w * s - frame) / 2);
  const maxY = Math.max(0, (r.h * s - frame) / 2);
  const clamp = (v: number, m: number) => (Number.isFinite(v) ? Math.min(m, Math.max(-m, v)) : 0);
  // + 0 convierte -0 en 0 (mismo valor, pero confunde al comparar)
  return { x: clamp(offset.x, maxX) + 0, y: clamp(offset.y, maxY) + 0 };
}

export function nextRotation(rotation: Rotation): Rotation {
  return (((rotation + 90) % 360) as Rotation);
}

/**
 * Dónde y de qué tamaño dibujar la foto (sin girar) en un lienzo cuadrado de `out` px para
 * que salga igual a lo que se ve en el marco. El dibujo se hace con el origen trasladado a
 * (cx, cy) y girado `rotation` grados; la foto va centrada ahí con tamaño (dw, dh).
 */
export function cropDrawParams(w: number, h: number, frame: number, state: CropState, out: number) {
  const s = displayScale(w, h, state.rotation, frame, state.zoom);
  const off = clampOffset(state.offset, w, h, state.rotation, frame, state.zoom);
  const k = out / frame;
  return {
    cx: out / 2 + off.x * k,
    cy: out / 2 + off.y * k,
    angle: (state.rotation * Math.PI) / 180,
    dw: w * s * k,
    dh: h * s * k,
  };
}

/** Distancia entre dos dedos (para pellizcar y hacer zoom). */
export function touchDistance(a: { pageX: number; pageY: number }, b: { pageX: number; pageY: number }) {
  return Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY);
}
