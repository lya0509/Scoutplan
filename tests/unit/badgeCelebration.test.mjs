// Pruebas de qué insignias se celebran (npm run test:unit).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planCelebrations, isMaxBadge, RECENT_DAYS } from '../../src/utils/badgeCelebration.ts';

const ORDER = ['precursor', 'expedicionario', 'descubridor', 'fundador', 'rover_ciudadano'];
const NOW = Date.parse('2026-11-13T12:00:00Z');
const daysAgo = (d) => new Date(NOW - d * 86400000).toISOString();

test('aprobada nueva que no se había celebrado → se celebra', () => {
  const p = planCelebrations({ precursor: 'Aprobada', expedicionario: 'Aprobada', descubridor: 'En Progreso' },
    ['precursor'], {}, ORDER, NOW);
  assert.deepEqual(p.toCelebrate, ['expedicionario']);
  assert.deepEqual(p.seen, ['precursor']);
});

test('ya celebrada → no se repite', () => {
  const p = planCelebrations({ precursor: 'Aprobada', expedicionario: 'En Progreso' }, ['precursor'], {}, ORDER, NOW);
  assert.deepEqual(p.toCelebrate, []);
});

test('primera vez: solo las aprobadas en los últimos días; las viejas quedan como vistas', () => {
  const p = planCelebrations(
    { precursor: 'Aprobada', expedicionario: 'Aprobada', descubridor: 'En Progreso' },
    null,
    { precursor: daysAgo(200), expedicionario: daysAgo(2) },
    ORDER, NOW);
  assert.deepEqual(p.toCelebrate, ['expedicionario']);
  assert.deepEqual(p.seen, ['precursor']);
  const viejo = planCelebrations({ precursor: 'Aprobada' }, null, { precursor: daysAgo(RECENT_DAYS + 1) }, ORDER, NOW);
  assert.deepEqual(viejo.toCelebrate, []);
});

test('etapa devuelta y vuelta a aprobar → se celebra otra vez', () => {
  const devuelta = planCelebrations({ precursor: 'Aprobada', expedicionario: 'En Progreso' },
    ['precursor', 'expedicionario'], {}, ORDER, NOW);
  assert.deepEqual(devuelta.seen, ['precursor']);
  const otraVez = planCelebrations({ precursor: 'Aprobada', expedicionario: 'Aprobada' }, devuelta.seen, {}, ORDER, NOW);
  assert.deepEqual(otraVez.toCelebrate, ['expedicionario']);
});

test('sin datos (sin internet ni copia) no decide nada ni borra lo visto', () => {
  assert.deepEqual(planCelebrations({}, null, {}, ORDER, NOW), { toCelebrate: [], seen: null });
  assert.deepEqual(planCelebrations({}, ['precursor'], {}, ORDER, NOW), { toCelebrate: [], seen: ['precursor'] });
});

test('varias a la vez salen en el orden de la rama', () => {
  const p = planCelebrations({ rover_ciudadano: 'Aprobada', precursor: 'Aprobada', fundador: 'Aprobada' }, [], {}, ORDER, NOW);
  assert.deepEqual(p.toCelebrate, ['precursor', 'fundador', 'rover_ciudadano']);
});

test('la máxima insignia es la última etapa de la rama', () => {
  assert.equal(isMaxBadge('rover_ciudadano', ORDER), true);
  assert.equal(isMaxBadge('fundador', ORDER), false);
  assert.equal(isMaxBadge('precursor', []), false);
});
