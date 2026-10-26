import type { PDFDocument, PDFFont, PDFPage } from 'pdf-lib';
import {
  ORION84_ALL_FIELDS,
  ORION84_EMERGENCY_CELL,
  ORION84_HEADER_LABELS,
  Orion84Values,
  formatEmergencyLine,
} from '../data/fichaMedicaOrion84Layout';

export const ORION84_TEMPLATE_URL = '/FICHA_MEDICA_ORION84_Template.pdf';

// Se usa el bundle precompilado (trae tslib dentro): la versión ESM de pdf-lib rompe Metro
// ("Cannot destructure property '__extends' of 'tslib.default'") y tumbaba la app al arrancar.
// Se carga bajo demanda para no sumar ~500 KB al arranque.
const loadPdfLib = () => import('pdf-lib/dist/pdf-lib.min.js');

const PAD_X = 4;
const MAX_SIZE = 9.5;
const MIN_SIZE = 6.5;
const LINE_GAP = 1.05;
const TEXT_COLOR = [0.07, 0.07, 0.12] as const;
const LABEL_COLOR = [0.2, 0.2, 0.22] as const;

// Canva exporta páginas cuyo MediaBox no empieza en y = 0: se mide desde su borde superior real.
function pageTop(page: PDFPage): number {
  const box = page.getMediaBox();
  return box.y + box.height;
}

/** Cuántas líneas de ese tamaño caben en una fila de alto h. */
function linesPerRow(h: number, size: number): number {
  return Math.max(1, Math.floor((h - 1) / (size * LINE_GAP)));
}

/** Helvetica solo codifica WinAnsi: se reemplaza cualquier carácter que no pueda dibujar. */
function sanitize(font: PDFFont, text: string): string {
  let out = '';
  for (const ch of text.replace(/\s+/g, ' ').trim()) {
    try {
      font.widthOfTextAtSize(ch, 10);
      out += ch;
    } catch {
      out += '?';
    }
  }
  return out;
}

function wrap(font: PDFFont, text: string, size: number, maxWidth: number): string[] {
  const lines: string[] = [];
  let current = '';
  for (const word of text.split(' ')) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/** Recorta la línea y añade "…" (siempre, porque se usa cuando sobra texto). */
function withEllipsis(font: PDFFont, text: string, size: number, maxWidth: number): string {
  let t = text;
  while (t.length > 1 && font.widthOfTextAtSize(`${t}…`, size) > maxWidth) t = t.slice(0, -1);
  return `${t}…`;
}

/** Elige tamaño y líneas para que el texto quepa en las filas de la celda. */
export function layoutCellText(
  font: PDFFont,
  text: string,
  width: number,
  rowHeights: number[],
): { size: number; lines: string[] } {
  const maxWidth = width - PAD_X * 2;
  // 1) Una sola línea, bajando el tamaño si hace falta.
  for (let size = MAX_SIZE; size >= MIN_SIZE; size -= 0.5) {
    if (font.widthOfTextAtSize(text, size) <= maxWidth) return { size, lines: [text] };
  }
  // 2) Varias líneas: cada fila admite tantas líneas como quepan en su alto.
  for (let size = MAX_SIZE; size >= MIN_SIZE; size -= 0.5) {
    const capacity = rowHeights.reduce((n, h) => n + linesPerRow(h, size), 0);
    const lines = wrap(font, text, size, maxWidth);
    if (lines.length <= capacity) return { size, lines };
  }
  // 3) No cabe: se recorta la última línea y se marca con "…".
  const capacity = rowHeights.reduce((n, h) => n + linesPerRow(h, MIN_SIZE), 0);
  const lines = wrap(font, text, MIN_SIZE, maxWidth).slice(0, capacity);
  lines[lines.length - 1] = withEllipsis(font, lines[lines.length - 1], MIN_SIZE, maxWidth);
  return { size: MIN_SIZE, lines };
}

type Rgb = typeof import('pdf-lib')['rgb'];

function drawInCell(
  doc: PDFDocument,
  font: PDFFont,
  rgb: Rgb,
  cellDef: { page: number; x0: number; x1: number; rows: [number, number][] },
  rawText: string,
) {
  const text = sanitize(font, rawText || '');
  if (!text || cellDef.rows.length === 0) return;
  const page = doc.getPage(cellDef.page);
  const top = pageTop(page);
  const rowHeights = cellDef.rows.map(([a, b]) => b - a);
  const { size, lines } = layoutCellText(font, text, cellDef.x1 - cellDef.x0, rowHeights);

  // Reparte las líneas por filas y centra verticalmente el bloque de cada fila.
  let lineIndex = 0;
  cellDef.rows.forEach(([y0, y1], rowIdx) => {
    const isLastRow = rowIdx === cellDef.rows.length - 1;
    const perRow = linesPerRow(y1 - y0, size);
    const remainingRows = cellDef.rows.length - rowIdx;
    const take = isLastRow ? lines.length - lineIndex : Math.min(perRow, Math.ceil((lines.length - lineIndex) / remainingRows));
    const rowLines = lines.slice(lineIndex, lineIndex + take);
    lineIndex += take;
    if (rowLines.length === 0) return;
    const blockHeight = rowLines.length * size * LINE_GAP;
    let baselineFromTop = y0 + (y1 - y0 - blockHeight) / 2 + size * 0.85;
    for (const line of rowLines) {
      page.drawText(line, {
        x: cellDef.x0 + PAD_X,
        y: top - baselineFromTop,
        size,
        font,
        color: rgb(...TEXT_COLOR),
      });
      baselineFromTop += size * LINE_GAP;
    }
  });
}

/** Rellena la plantilla Orión 84 y devuelve los bytes del PDF resultante. */
export async function fillFichaOrion84Pdf(templateBytes: ArrayBuffer | Uint8Array, values: Orion84Values): Promise<Uint8Array> {
  const { PDFDocument: Doc, StandardFonts, rgb } = await loadPdfLib();
  const doc = await Doc.load(templateBytes);
  const font = await doc.embedFont(StandardFonts.Helvetica);

  for (const label of ORION84_HEADER_LABELS) {
    const page = doc.getPage(label.page);
    const size = 8.5;
    page.drawText(sanitize(font, label.text), {
      x: label.x0 + PAD_X,
      y: pageTop(page) - (label.y0 + (label.y1 - label.y0 + size * 0.7) / 2),
      size,
      font,
      color: rgb(...LABEL_COLOR),
    });
  }

  for (const field of ORION84_ALL_FIELDS) {
    if (field.rows.length === 0) continue;
    drawInCell(doc, font, rgb, field, values[field.key]);
  }
  drawInCell(doc, font, rgb, ORION84_EMERGENCY_CELL, formatEmergencyLine(values));

  doc.setTitle('Información General y Ficha Médica — Grupo Scout Orión 84');
  doc.setProducer('Plan Progresivo Scout');
  return doc.save();
}

/** Descarga la ficha rellenada en el navegador. */
export async function downloadFichaOrion84Pdf(values: Orion84Values, fileName: string): Promise<void> {
  const response = await fetch(ORION84_TEMPLATE_URL);
  if (!response.ok) throw new Error('No se pudo cargar la plantilla PDF de la Ficha Médica Orión 84.');
  const bytes = await fillFichaOrion84Pdf(await response.arrayBuffer(), values);
  const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
