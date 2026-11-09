// Pruebas de los cálculos del recorte de fotos (npm run test:unit).
// Node ejecuta el .ts directamente (quita los tipos al cargarlo).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  MIN_ZOOM, MAX_ZOOM, rotatedSize, displayScale, clampZoom, clampOffset, nextRotation, cropDrawParams, touchDistance,
} from '../../src/utils/photoCrop.ts';

const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);

test('girar 90° intercambia ancho y alto', () => {
  assert.deepEqual(rotatedSize(1200, 800, 0), { w: 1200, h: 800 });
  assert.deepEqual(rotatedSize(1200, 800, 90), { w: 800, h: 1200 });
  assert.deepEqual(rotatedSize(1200, 800, 180), { w: 1200, h: 800 });
  assert.equal(nextRotation(270), 0);
  assert.equal(nextRotation(0), 90);
});

test('con zoom 1 el lado corto de la foto llena el marco', () => {
  close(displayScale(1200, 800, 0, 400, 1), 0.5);   // 800 px → 400 px
  close(displayScale(1200, 800, 90, 400, 1), 0.5);
  close(displayScale(1200, 800, 0, 400, 2), 1);
});

test('el zoom se queda entre 1× y 4×', () => {
  assert.equal(clampZoom(0.2), MIN_ZOOM);
  assert.equal(clampZoom(9), MAX_ZOOM);
  assert.equal(clampZoom(NaN), MIN_ZOOM);
  assert.equal(clampZoom(2.5), 2.5);
});

test('no se puede mover la foto hasta dejar bordes vacíos', () => {
  // 1200×800 en marco 400 → se ve 600×400: sobra 100 px a cada lado en horizontal, nada en vertical
  assert.deepEqual(clampOffset({ x: 500, y: 500 }, 1200, 800, 0, 400, 1), { x: 100, y: 0 });
  assert.deepEqual(clampOffset({ x: -500, y: 0 }, 1200, 800, 0, 400, 1), { x: -100, y: 0 });
  // Girada 90°: ahora sobra en vertical
  assert.deepEqual(clampOffset({ x: 500, y: 500 }, 1200, 800, 90, 400, 1), { x: 0, y: 100 });
  // Con zoom 2 hay más margen
  assert.deepEqual(clampOffset({ x: 999, y: 999 }, 1200, 800, 0, 400, 2), { x: 400, y: 200 });
});

test('el recorte final reproduce lo que se ve en el marco', () => {
  // Marco 400, salida 800 (k = 2). Foto 1200×800 movida 100 px a la derecha
  const p = cropDrawParams(1200, 800, 400, { zoom: 1, offset: { x: 100, y: 0 }, rotation: 0 }, 800);
  close(p.cx, 400 + 200);
  close(p.cy, 400);
  close(p.dw, 1200);   // 1200 × 0,5 × 2
  close(p.dh, 800);
  close(p.angle, 0);
  // El borde izquierdo de la foto cae justo en el borde izquierdo del lienzo
  close(p.cx - p.dw / 2, 0);
});

test('un desplazamiento fuera de rango se corrige también al recortar', () => {
  const p = cropDrawParams(1200, 800, 400, { zoom: 1, offset: { x: 1e6, y: -1e6 }, rotation: 0 }, 800);
  close(p.cx - p.dw / 2, 0);
  close(p.cy, 400);
});

test('distancia entre dos dedos', () => {
  close(touchDistance({ pageX: 0, pageY: 0 }, { pageX: 3, pageY: 4 }), 5);
});
