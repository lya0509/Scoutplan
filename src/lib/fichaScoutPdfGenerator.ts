// Ficha Médica Scout en PDF (además del Word). Usa los mismos datos ya formateados que
// rellenan la plantilla .docx ({{NAME}}, {{CI}}…) y los dibuja como ficha con pdf-lib.

import type { PDFFont, PDFPage, PDFImage } from 'pdf-lib';
import { downloadBytes } from '../utils/reportTable';

const loadPdfLib = () => import('pdf-lib/dist/pdf-lib.min.js');

const W = 595.28;
const H = 841.89;
const M = 40;
const LABEL_W = 170;
const SIZE = 9;
const LINE = 11.5;

/** "ASMA [X]   ALERGIA [ ]" → "Asma". Devuelve "Ninguno" si no hay marcados. */
function marked(text: string, none = 'Ninguno'): string {
  const out: string[] = [];
  const re = /([^\[\]\n]+?)\s*\[X\]/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text || ''))) {
    const label = m[1].trim().replace(/^[:|]\s*/, '');
    if (label) out.push(label.charAt(0).toUpperCase() + label.slice(1).toLowerCase());
  }
  return out.length ? out.join(', ') : none;
}

function makeClean(font: PDFFont) {
  const ok = new Map<string, boolean>();
  return (t: string) => {
    let s = '';
    for (const ch of String(t ?? '').replace(/[\r\t]/g, ' ')) {
      if (ch === '\n') { s += ch; continue; }
      let g = ok.get(ch);
      if (g === undefined) { try { font.widthOfTextAtSize(ch, 10); g = true; } catch { g = false; } ok.set(ch, g); }
      if (g) s += ch;
    }
    return s.trim();
  };
}

function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const lines: string[] = [];
  for (const para of (text || '').split('\n')) {
    let line = '';
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const cand = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(cand, size) <= width) { line = cand; continue; }
      if (line) lines.push(line);
      line = word;
      while (font.widthOfTextAtSize(line, size) > width && line.length > 1) {
        let cut = line.length - 1;
        while (cut > 1 && font.widthOfTextAtSize(line.slice(0, cut), size) > width) cut--;
        lines.push(line.slice(0, cut));
        line = line.slice(cut);
      }
    }
    lines.push(line);
  }
  return lines.length ? lines : [''];
}

async function loadImage(doc: any, url?: string | null): Promise<PDFImage | null> {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const bytes = new Uint8Array(await res.arrayBuffer());
    if (bytes[0] === 0x89 && bytes[1] === 0x50) return await doc.embedPng(bytes);
    if (bytes[0] === 0xff && bytes[1] === 0xd8) return await doc.embedJpg(bytes);
  } catch {}
  return null;
}

export async function buildFichaScoutPdf(r: Record<string, string>, opts: { signatureUrl?: string | null } = {}): Promise<Uint8Array> {
  const { PDFDocument, StandardFonts, rgb } = await loadPdfLib();
  const doc = await PDFDocument.create();
  doc.setTitle(`Ficha Médica Scout - ${r['{{NAME}}'] || ''}`);
  doc.setCreator('Plan Progresivo Scout');
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const clean = makeClean(font);
  const accent = rgb(0.6, 0.11, 0.11);
  const ink = rgb(0.07, 0.09, 0.15);
  const muted = rgb(0.38, 0.42, 0.48);
  const grid = rgb(0.85, 0.86, 0.88);
  const band = rgb(0.98, 0.95, 0.95);

  let page: PDFPage = doc.addPage([W, H]);
  let y = H - M;

  const header = () => {
    page.drawRectangle({ x: 0, y: H - 6, width: W, height: 6, color: accent });
    page.drawText('ASOCIACIÓN DE SCOUTS DE VENEZUELA', { x: M, y: H - M - 4, size: 8.5, font: bold, color: muted });
  };
  header();
  y -= 26;
  page.drawText('Ficha Médica Scout', { x: M, y, size: 18, font: bold, color: accent });
  y -= 16;
  const org = clean(`Región ${r['{{REGION}}'] || ''} · Distrito ${r['{{DISTRICT}}'] || ''} · Grupo ${r['{{GROUP_NAME}}'] || ''}`);
  page.drawText(org, { x: M, y, size: 9.5, font, color: ink });
  y -= 13;
  page.drawText(clean(`Unidad: ${marked(r['{{UNIT_CHECKBOXES}}'] || '', 'Sin indicar')}`), { x: M, y, size: 9.5, font: bold, color: ink });
  y -= 12;

  const ensure = (h: number) => {
    if (y - h < M + 20) {
      page = doc.addPage([W, H]);
      header();
      y = H - M - 20;
    }
  };

  const section = (title: string, rows: [string, string][]) => {
    ensure(40);
    y -= 12;
    page.drawRectangle({ x: M, y: y - 4, width: W - M * 2, height: 18, color: accent });
    page.drawText(clean(title.toUpperCase()), { x: M + 8, y: y + 1, size: 9.5, font: bold, color: rgb(1, 1, 1) });
    y -= 4;
    rows.forEach(([label, value], i) => {
      const valW = W - M * 2 - LABEL_W - 16;
      const lLines = wrap(clean(label), bold, SIZE, LABEL_W - 12);
      const vLines = wrap(clean(value || '—'), font, SIZE, valW);
      const h = Math.max(lLines.length, vLines.length) * LINE + 6;
      ensure(h);
      if (i % 2 === 1) page.drawRectangle({ x: M, y: y - h, width: W - M * 2, height: h, color: band });
      lLines.forEach((ln, li) => page.drawText(ln, { x: M + 8, y: y - 3 - (li + 1) * LINE + 3, size: SIZE, font: bold, color: ink }));
      vLines.forEach((ln, li) => page.drawText(ln, { x: M + LABEL_W, y: y - 3 - (li + 1) * LINE + 3, size: SIZE, font, color: ink }));
      page.drawLine({ start: { x: M, y: y - h }, end: { x: W - M, y: y - h }, thickness: 0.4, color: grid });
      y -= h;
    });
  };

  const rh = /Positivo \[X\]/i.test(r['{{RH_FACTOR_BOXES}}'] || '') ? 'Positivo' : /Negativo \[X\]/i.test(r['{{RH_FACTOR_BOXES}}'] || '') ? 'Negativo' : '';

  section('Datos personales', [
    ['Nombre y apellido', r['{{NAME}}']],
    ['Cédula de identidad', r['{{CI}}']],
    ['Edad', r['{{AGE}}'] ? `${r['{{AGE}}']} años` : ''],
    ['Sexo', r['{{GENDER}}']],
    ['Estatura / peso', [r['{{HEIGHT}}'], r['{{WEIGHT}}']].filter(Boolean).join(' · ')],
  ]);
  section('Contacto de emergencia', [
    ['Nombre', r['{{EMERGENCY_NAME}}']],
    ['Teléfono de habitación', r['{{EMERGENCY_HOME}}']],
    ['Celular', r['{{EMERGENCY_CELL}}']],
    ['Otro teléfono', r['{{EMERGENCY_OTHER}}']],
  ]);
  section('Salud general', [
    ['¿Goza de buena salud?', r['{{GOOD_HEALTH}}']],
    ['Grupo sanguíneo y factor Rh', [r['{{BLOOD_GROUP}}'], rh].filter(Boolean).join(' ')],
    ['Tensión arterial', r['{{BLOOD_PRESSURE}}']],
    ['Vacunas', marked(r['{{VACCINES}}'] || '', 'Sin registrar') + ((r['{{VACCINES}}'] || '').match(/\(Última dosis: [^)]+\)/)?.[0] ? ` ${(r['{{VACCINES}}'] || '').match(/\(Última dosis: [^)]+\)/)![0]}` : '')],
  ]);
  section('Antecedentes', [
    ['Antecedentes familiares', marked(r['{{FAMILY_HISTORY_CHECKBOXES}}'] || '')],
    ['Alergias', r['{{ALLERGIES_TEXT}}']],
    ['Enfermedades padecidas', marked(r['{{PAST_DISEASES_CHECKBOXES}}'] || '', 'Ninguna')],
    ['Antecedentes personales', (r['{{PERSONAL_HISTORY_TEXT}}'] || '').replace(/\s*\[X\]/g, '')],
  ]);
  section('Cuestionario médico', [
    ['Operación o lesión reciente', r['{{RECENT_OP_EXPLAIN}}']],
    ['Actividades restringidas', r['{{RESTRICTED_ACT_EXPLAIN}}']],
    ['Tratamiento médico actual', r['{{PRESCRIPTION_EXPLAIN}}']],
    ['Última visita al médico', r['{{DOCTOR_VISIT_EXPLAIN}}']],
    ['Alteraciones emocionales', r['{{EMOTIONAL_EXPLAIN}}']],
    ['Condiciones cardíacas', r['{{HEART_EXPLAIN}}']],
    ['Sistema nervioso', r['{{NERVOUS_EXPLAIN}}']],
    ['Seguro médico', r['{{INSURANCE_EXPLAIN}}']],
    ['Impedimento físico', r['{{PHYSICAL_IMPAIRMENT_EXPLAIN}}']],
    ['Observaciones', r['{{HEALTH_NOTES}}']],
  ]);

  // Firma
  const sig = await loadImage(doc, opts.signatureUrl);
  ensure(sig ? 95 : 70);
  y -= 22;
  const boxW = 220;
  if (sig) {
    const scale = Math.min(boxW / sig.width, 60 / sig.height);
    page.drawImage(sig, { x: M, y: y - sig.height * scale, width: sig.width * scale, height: sig.height * scale });
    y -= sig.height * scale + 4;
  } else {
    y -= 36;
  }
  page.drawLine({ start: { x: M, y }, end: { x: M + boxW, y }, thickness: 0.8, color: ink });
  page.drawText('Firma del representante / participante', { x: M, y: y - 12, size: 8.5, font, color: muted });
  page.drawText(clean(`Fecha: ${(r['{{SIGNATURE_DATE}}'] || '').replace(/^(\d{4})-(\d{2})-(\d{2})$/, '$3/$2/$1')}`), { x: M + boxW + 30, y: y - 12, size: 8.5, font, color: muted });

  const pages = doc.getPages();
  pages.forEach((p, i) => {
    const t = `Página ${i + 1} de ${pages.length} · Documento confidencial`;
    p.drawText(clean(t), { x: W - M - font.widthOfTextAtSize(clean(t), 7.5), y: M - 18, size: 7.5, font, color: muted });
  });

  return doc.save();
}

export async function downloadFichaScoutPdf(replacements: Record<string, string>, opts: { signatureUrl?: string | null; fileName: string }) {
  const bytes = await buildFichaScoutPdf(replacements, opts);
  downloadBytes(bytes, opts.fileName, 'application/pdf');
}
