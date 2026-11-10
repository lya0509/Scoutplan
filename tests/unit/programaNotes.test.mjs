// Pruebas de las notas del Programa Scout (npm run test:unit).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { visibleNotes, notesWithMeta } from '../../src/lib/programaNotes.ts';

const sucias = [
  '* Llegar cinco minutos antes.',
  '* Llevar gorra',
  '', '', '', '', '', '', '', '', '',
  '[PROGRAMA_STATUS:draft]',
  '', '', '',
  '[PREVIEW_ROLES:scouter,jefatura]',
  '', '',
  '[AUTHOR_ID:abc-123]',
  '[AUTHOR_NAME:Juan Laya]',
].join('\n');

test('las notas visibles no muestran etiquetas ni el hueco de líneas vacías', () => {
  assert.equal(visibleNotes(sucias), '* Llegar cinco minutos antes.\n* Llevar gorra');
  assert.equal(visibleNotes(''), '');
  assert.equal(visibleNotes(undefined), '');
  assert.equal(visibleNotes('[AUTHOR_ID:x]'), '');
});

test('se respetan los párrafos que escribió la persona (máximo una línea en blanco)', () => {
  assert.equal(visibleNotes('Uno\n\nDos\n\n\n\nTres'), 'Uno\n\nDos\n\nTres');
});

test('al guardar, las etiquetas quedan juntas debajo del texto', () => {
  const out = notesWithMeta(sucias, { PROGRAMA_STATUS: 'published', AUTHOR_NAME: 'Juan Laya' });
  assert.equal(out, [
    '* Llegar cinco minutos antes.',
    '* Llevar gorra',
    '[PROGRAMA_STATUS:published]',
    '[PREVIEW_ROLES:scouter,jefatura]',
    '[AUTHOR_ID:abc-123]',
    '[AUTHOR_NAME:Juan Laya]',
  ].join('\n'));
});

test('guardar muchas veces no hace crecer las notas', () => {
  let notas = sucias;
  for (let i = 0; i < 20; i++) {
    notas = notesWithMeta(notas, { PROGRAMA_STATUS: 'draft', PREVIEW_ROLES: 'scouter', AUTHOR_ID: 'abc-123', AUTHOR_NAME: 'Juan' });
  }
  assert.equal(notas, notesWithMeta(sucias, { PROGRAMA_STATUS: 'draft', PREVIEW_ROLES: 'scouter', AUTHOR_ID: 'abc-123', AUTHOR_NAME: 'Juan' }));
  assert.equal(notas.split('\n').filter(l => l === '').length, 0);
});

test('se conserva el vínculo con el Plan Trimestral', () => {
  const out = notesWithMeta('Nota', { PLAN_ACT_ID: 'act_9' });
  assert.ok(out.includes('[PLAN_ACT_ID:act_9]'));
  assert.ok(notesWithMeta(out, {}).includes('[PLAN_ACT_ID:act_9]'));
});
