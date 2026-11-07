// PDF directo (sin ventana de impresión) para reportes tabulares, con pdf-lib.
// Encabezado institucional, tabla con texto ajustado en varias líneas, encabezado de tabla
// repetido en cada página y pie con "Página X de Y".

import type { PDFFont, PDFPage } from 'pdf-lib';
import { ReportTable, ReportSection, Cell, cellText, cellStyle, autoWidths, downloadBytes, safeFileBase } from './reportTable';
import { todayLocal } from './dateLocal';

const loadPdfLib = () => import('pdf-lib/dist/pdf-lib.min.js');

const MARGIN = 32;
const FONT_SIZE = 8;
const HEAD_SIZE = 8;
const LINE = 10;
const PAD = 4;

function hexToRgb(hex: string): [number, number, number] {
  const h = (hex || '#612499').replace('#', '');
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h.padEnd(6, '0').slice(0, 6);
  return [parseInt(full.slice(0, 2), 16) / 255, parseInt(full.slice(2, 4), 16) / 255, parseInt(full.slice(4, 6), 16) / 255];
}

/** Las fuentes estándar solo traen Latin-1: se quitan emojis y símbolos que no existen. */
function makeSanitizer(font: PDFFont) {
  const ok = new Map<string, boolean>();
  return (text: string) => {
    let out = '';
    for (const ch of text.replace(/[\r\t]/g, ' ')) {
      if (ch === '\n') { out += ch; continue; }
      let good = ok.get(ch);
      if (good === undefined) {
        try { font.widthOfTextAtSize(ch, 10); good = true; } catch { good = false; }
        ok.set(ch, good);
      }
      if (good) out += ch;
    }
    return out.replace(/ {2,}/g, ' ').trim();
  };
}

/** Parte un texto en líneas que caben en `width`. Corta palabras demasiado largas. */
function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const lines: string[] = [];
  for (const para of text.split('\n')) {
    let line = '';
    for (const word of para.split(' ')) {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= width) {
        line = candidate;
        continue;
      }
      if (line) lines.push(line);
      // Palabra más ancha que la columna: cortarla por letras
      let rest = word;
      while (font.widthOfTextAtSize(rest, size) > width && rest.length > 1) {
        let cut = rest.length - 1;
        while (cut > 1 && font.widthOfTextAtSize(rest.slice(0, cut), size) > width) cut--;
        lines.push(rest.slice(0, cut));
        rest = rest.slice(cut);
      }
      line = rest;
    }
    lines.push(line);
  }
  return lines.length ? lines : [''];
}

export async function buildPdf(table: ReportTable): Promise<Uint8Array> {
  const { PDFDocument, StandardFonts, rgb } = await loadPdfLib();
  const doc = await PDFDocument.create();
  doc.setTitle(table.title);
  doc.setCreator('Plan Progresivo Scout');
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const clean = makeSanitizer(font);
  const [ar, ag, ab] = hexToRgb(table.accent || '#612499');
  const accent = rgb(ar, ag, ab);
  const ink = rgb(0.07, 0.09, 0.15);
  const muted = rgb(0.38, 0.42, 0.48);
  const grid = rgb(0.82, 0.84, 0.86);
  const zebra = rgb(0.965, 0.957, 1);

  const landscape = (table.orientation || 'landscape') === 'landscape';
  const pageW = landscape ? 841.89 : 595.28;
  const pageH = landscape ? 595.28 : 841.89;
  const usableW = pageW - MARGIN * 2;
  const emitted = `Emitido el ${todayLocal().split('-').reverse().join('/')}`;

  let page: PDFPage = doc.addPage([pageW, pageH]);
  let y = pageH - MARGIN;

  const drawPageHeader = (first: boolean) => {
    page.drawRectangle({ x: 0, y: pageH - 6, width: pageW, height: 6, color: accent });
    y = pageH - MARGIN;
    page.drawText(clean('ASOCIACIÓN DE SCOUTS DE VENEZUELA'), { x: MARGIN, y: y - 8, size: 8, font: bold, color: muted });
    page.drawText(clean(emitted), { x: pageW - MARGIN - font.widthOfTextAtSize(clean(emitted), 8), y: y - 8, size: 8, font, color: muted });
    y -= 12;
    if (first) {
      for (const line of wrap(clean(table.title), bold, 15, usableW)) {
        y -= 17;
        page.drawText(line, { x: MARGIN, y, size: 15, font: bold, color: accent });
      }
      const sub = clean([table.groupName, table.subtitle].filter(Boolean).join(' • '));
      if (sub) {
        for (const line of wrap(sub, font, 9.5, usableW)) {
          y -= 13;
          page.drawText(line, { x: MARGIN, y, size: 9.5, font, color: ink });
        }
      }
      y -= 10;
    } else {
      y -= 12;
      page.drawText(clean(table.title), { x: MARGIN, y, size: 9, font: bold, color: accent });
      y -= 8;
    }
  };

  const newPage = () => {
    page = doc.addPage([pageW, pageH]);
    drawPageHeader(false);
  };

  drawPageHeader(true);
  const bottom = MARGIN + 18;

  for (const section of table.sections) {
    const weights = section.widths || autoWidths(section);
    const total = weights.reduce((a, b) => a + b, 0) || 1;
    const colW = weights.map(w => (w / total) * usableW);

    const drawHeaderRow = () => {
      const headLines = section.headers.map((h, i) => wrap(clean(h), bold, HEAD_SIZE, colW[i] - PAD * 2));
      const h = Math.max(...headLines.map(l => l.length)) * LINE + PAD * 2;
      if (y - h < bottom) newPage();
      let x = MARGIN;
      page.drawRectangle({ x: MARGIN, y: y - h, width: usableW, height: h, color: accent });
      headLines.forEach((lines, i) => {
        lines.forEach((ln, li) => page.drawText(ln, { x: x + PAD, y: y - PAD - (li + 1) * LINE + 2, size: HEAD_SIZE, font: bold, color: rgb(1, 1, 1) }));
        x += colW[i];
      });
      y -= h;
    };

    // Título de sección (cuando hay varias) y notas
    if (table.sections.length > 1) {
      if (y - 40 < bottom) newPage();
      y -= 14;
      page.drawText(clean(section.name), { x: MARGIN, y, size: 11, font: bold, color: ink });
      y -= 6;
    }
    for (const note of section.notes || []) {
      for (const line of wrap(clean(note), font, 9, usableW)) {
        if (y - 12 < bottom) newPage();
        y -= 12;
        page.drawText(line, { x: MARGIN, y, size: 9, font, color: ink });
      }
    }
    if (section.notes?.length) y -= 6;

    drawHeaderRow();

    if (!section.rows.length) {
      y -= 16;
      page.drawText('Sin registros.', { x: MARGIN + PAD, y, size: FONT_SIZE, font, color: muted });
      y -= 8;
      continue;
    }

    section.rows.forEach((row, ri) => {
      const cells = section.headers.map((_, ci) => {
        const c: Cell = row[ci];
        const st = cellStyle(c);
        const f = st.bold ? bold : font;
        return { lines: wrap(clean(cellText(c)), f, FONT_SIZE, colW[ci] - PAD * 2), font: f, color: st.color };
      });
      const h = Math.max(...cells.map(c => c.lines.length)) * LINE + PAD * 2;
      if (y - h < bottom) {
        newPage();
        drawHeaderRow();
      }
      if (ri % 2 === 1) page.drawRectangle({ x: MARGIN, y: y - h, width: usableW, height: h, color: zebra });
      let x = MARGIN;
      cells.forEach((c, ci) => {
        const color = c.color ? rgb(...hexToRgb(c.color)) : ink;
        c.lines.forEach((ln, li) => page.drawText(ln, { x: x + PAD, y: y - PAD - (li + 1) * LINE + 2, size: FONT_SIZE, font: c.font, color }));
        page.drawLine({ start: { x, y }, end: { x, y: y - h }, thickness: 0.4, color: grid });
        x += colW[ci];
      });
      page.drawLine({ start: { x: MARGIN + usableW, y }, end: { x: MARGIN + usableW, y: y - h }, thickness: 0.4, color: grid });
      page.drawLine({ start: { x: MARGIN, y: y - h }, end: { x: MARGIN + usableW, y: y - h }, thickness: 0.4, color: grid });
      y -= h;
    });
    y -= 10;
  }

  // Pie: "Página X de Y"
  const pages = doc.getPages();
  pages.forEach((p, i) => {
    const label = `Página ${i + 1} de ${pages.length}`;
    p.drawText(clean(label), { x: pageW - MARGIN - font.widthOfTextAtSize(clean(label), 7.5), y: MARGIN - 6, size: 7.5, font, color: muted });
    p.drawText('Plan Progresivo Scout', { x: MARGIN, y: MARGIN - 6, size: 7.5, font, color: muted });
  });

  return doc.save();
}

/** Genera y descarga el PDF. */
export async function downloadPdf(table: ReportTable): Promise<void> {
  const bytes = await buildPdf(table);
  downloadBytes(bytes, `${safeFileBase(table.fileBase)}_${todayLocal()}.pdf`, 'application/pdf');
}
