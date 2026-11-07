// Generador de Excel real (.xlsx, Office Open XML) con JSZip.
// Antes se exportaba HTML con extensión .xls y Excel mostraba la advertencia "el formato y
// la extensión del archivo no coinciden". Esto produce un libro nativo: título combinado,
// encabezado con color, filas alternas, bordes, columnas ajustadas, fila de encabezado fija
// y filtro automático.

import JSZip from 'jszip';
import { ReportTable, ReportSection, Cell, cellText, cellStyle, autoWidths, downloadBytes, safeFileBase } from './reportTable';
import { todayLocal } from './dateLocal';

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

function xmlEscape(s: string): string {
  return s
    // Caracteres de control que invalidan el XML
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function colName(i: number): string {
  let s = '';
  let n = i + 1;
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function argb(hex?: string): string {
  const h = (hex || '#000000').replace('#', '').trim();
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h.padEnd(6, '0').slice(0, 6);
  return `FF${full.toUpperCase()}`;
}

/** Registro de estilos: cada combinación (fuente, relleno, borde, alineación) se guarda una vez. */
class StyleBook {
  fonts: string[] = ['<font><sz val="10"/><name val="Calibri"/></font>'];
  fills: string[] = ['<fill><patternFill patternType="none"/></fill>', '<fill><patternFill patternType="gray125"/></fill>'];
  borders: string[] = [
    '<border><left/><right/><top/><bottom/><diagonal/></border>',
    '<border><left style="thin"><color rgb="FFD1D5DB"/></left><right style="thin"><color rgb="FFD1D5DB"/></right><top style="thin"><color rgb="FFD1D5DB"/></top><bottom style="thin"><color rgb="FFD1D5DB"/></bottom><diagonal/></border>',
  ];
  xfs: string[] = ['<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'];
  private cache = new Map<string, number>();

  private idx(list: string[], xml: string): number {
    const i = list.indexOf(xml);
    if (i >= 0) return i;
    list.push(xml);
    return list.length - 1;
  }

  style(o: { bold?: boolean; size?: number; color?: string; fill?: string; border?: boolean; wrap?: boolean; center?: boolean; vtop?: boolean }): number {
    const key = JSON.stringify(o);
    const hit = this.cache.get(key);
    if (hit !== undefined) return hit;
    const font = `<font>${o.bold ? '<b/>' : ''}<sz val="${o.size || 10}"/><color rgb="${argb(o.color || '#111827')}"/><name val="Calibri"/></font>`;
    const fontId = this.idx(this.fonts, font);
    const fillId = o.fill ? this.idx(this.fills, `<fill><patternFill patternType="solid"><fgColor rgb="${argb(o.fill)}"/><bgColor indexed="64"/></patternFill></fill>`) : 0;
    const borderId = o.border ? 1 : 0;
    const align = `<alignment${o.wrap ? ' wrapText="1"' : ''}${o.center ? ' horizontal="center"' : ''} vertical="${o.vtop ? 'top' : 'center'}"/>`;
    const xf = `<xf numFmtId="0" fontId="${fontId}" fillId="${fillId}" borderId="${borderId}" xfId="0" applyFont="1"${fillId ? ' applyFill="1"' : ''}${borderId ? ' applyBorder="1"' : ''} applyAlignment="1">${align}</xf>`;
    const id = this.idx(this.xfs, xf);
    this.cache.set(key, id);
    return id;
  }

  xml(): string {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="${this.fonts.length}">${this.fonts.join('')}</fonts>
<fills count="${this.fills.length}">${this.fills.join('')}</fills>
<borders count="${this.borders.length}">${this.borders.join('')}</borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="${this.xfs.length}">${this.xfs.join('')}</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;
  }
}

function cellXml(ref: string, value: Cell, styleId: number): string {
  const text = cellText(value);
  const raw = value !== null && typeof value === 'object' ? value.v : value;
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return `<c r="${ref}" s="${styleId}"><v>${raw}</v></c>`;
  }
  if (!text) return `<c r="${ref}" s="${styleId}"/>`;
  return `<c r="${ref}" s="${styleId}" t="inlineStr"><is><t xml:space="preserve">${xmlEscape(text)}</t></is></c>`;
}

function sheetXml(table: ReportTable, section: ReportSection, styles: StyleBook): { xml: string; filterRef: string | null } {
  const accent = table.accent || '#612499';
  const nCols = Math.max(section.headers.length, 1);
  const lastCol = colName(nCols - 1);
  const widths = section.widths || autoWidths(section);
  const sTitle = styles.style({ bold: true, size: 14, color: accent });
  const sSub = styles.style({ size: 10, color: '#4B5563' });
  const sNote = styles.style({ size: 10, color: '#111827', wrap: true, vtop: true });
  const sHead = styles.style({ bold: true, color: '#FFFFFF', fill: accent, border: true, wrap: true, center: true });

  const rows: string[] = [];
  const merges: string[] = [];
  let r = 1;
  const fullRow = (text: string, style: number, height?: number) => {
    rows.push(`<row r="${r}"${height ? ` ht="${height}" customHeight="1"` : ''}>${cellXml(`A${r}`, text, style)}</row>`);
    if (nCols > 1) merges.push(`A${r}:${lastCol}${r}`);
    r++;
  };

  fullRow('ASOCIACIÓN DE SCOUTS DE VENEZUELA', sSub);
  fullRow(table.title, sTitle, 22);
  const sub = [table.groupName, table.subtitle].filter(Boolean).join(' • ');
  if (sub) fullRow(sub, sSub);
  fullRow(`Fecha de emisión: ${todayLocal().split('-').reverse().join('/')} • Registros: ${section.rows.length}`, sSub);
  for (const note of section.notes || []) fullRow(note, sNote);
  r++; // fila en blanco

  const headerRow = r;
  rows.push(`<row r="${r}" ht="28" customHeight="1">${section.headers.map((h, i) => cellXml(`${colName(i)}${r}`, h, sHead)).join('')}</row>`);
  r++;

  section.rows.forEach((row, ri) => {
    const zebra = ri % 2 === 1 ? '#F5F3FF' : undefined;
    const cells = section.headers.map((_, ci) => {
      const c = row[ci];
      const st = cellStyle(c);
      const id = styles.style({ border: true, wrap: true, vtop: true, fill: zebra, color: st.color, bold: st.bold });
      return cellXml(`${colName(ci)}${r}`, c ?? '', id);
    }).join('');
    rows.push(`<row r="${r}">${cells}</row>`);
    r++;
  });

  const cols = widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${Math.min(Math.max(w + 2, 6), 60)}" customWidth="1"/>`).join('');
  const lastRow = Math.max(headerRow, r - 1);

  const filterRef = section.rows.length ? `A${headerRow}:${lastCol}${lastRow}` : null;
  const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheetViews><sheetView workbookViewId="0"><pane ySplit="${headerRow}" topLeftCell="A${headerRow + 1}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
<sheetFormatPr defaultRowHeight="15"/>
<cols>${cols}</cols>
<sheetData>${rows.join('')}</sheetData>
${filterRef ? `<autoFilter ref="${filterRef}"/>` : ''}
${merges.length ? `<mergeCells count="${merges.length}">${merges.map(m => `<mergeCell ref="${m}"/>`).join('')}</mergeCells>` : ''}
<pageMargins left="0.4" right="0.4" top="0.5" bottom="0.5" header="0.3" footer="0.3"/>
<pageSetup orientation="landscape" fitToWidth="1" fitToHeight="0"/>
</worksheet>`;
  return { xml, filterRef };
}

function sheetName(name: string, used: Set<string>): string {
  let base = (name || 'Hoja').replace(/[\\/?*[\]:]/g, ' ').trim().slice(0, 31) || 'Hoja';
  let n = base;
  let i = 2;
  while (used.has(n.toLowerCase())) {
    const suffix = ` (${i++})`;
    n = base.slice(0, 31 - suffix.length) + suffix;
  }
  used.add(n.toLowerCase());
  return n;
}

/** Arma el .xlsx en memoria. */
export async function buildXlsx(table: ReportTable): Promise<Blob> {
  const zip = new JSZip();
  const styles = new StyleBook();
  const used = new Set<string>();
  const sections = table.sections.length ? table.sections : [{ name: 'Datos', headers: [''], rows: [] }];
  const names = sections.map(s => sheetName(s.name, used));
  const sheets = sections.map(s => sheetXml(table, s, styles));

  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('\n')}
<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`);
  zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`);
  const now = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
  zip.file('docProps/core.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
<dc:title>${xmlEscape(table.title)}</dc:title><dc:creator>Plan Progresivo Scout</dc:creator>
<dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified>
</cp:coreProperties>`);
  zip.file('docProps/app.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>Plan Progresivo Scout</Application></Properties>`);
  // Excel exige un nombre oculto _FilterDatabase por cada hoja con autofiltro
  const abs = (ref: string) => ref.split(':').map(c => c.replace(/^([A-Z]+)(\d+)$/, '$$$1$$$2')).join(':');
  const definedNames = sheets
    .map((sh, i) => sh.filterRef
      ? `<definedName name="_xlnm._FilterDatabase" localSheetId="${i}" hidden="1">'${xmlEscape(names[i].replace(/'/g, "''"))}'!${abs(sh.filterRef)}</definedName>`
      : '')
    .join('');
  zip.file('xl/workbook.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets>${names.map((n, i) => `<sheet name="${xmlEscape(n)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets>
${definedNames ? `<definedNames>${definedNames}</definedNames>` : ''}
</workbook>`);
  zip.file('xl/_rels/workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('\n')}
<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`);
  sheets.forEach((sh, i) => zip.file(`xl/worksheets/sheet${i + 1}.xml`, sh.xml));
  zip.file('xl/styles.xml', styles.xml());

  return zip.generateAsync({ type: 'blob', mimeType: XLSX_MIME, compression: 'DEFLATE' });
}

/** Genera y descarga el .xlsx. */
export async function downloadXlsx(table: ReportTable): Promise<void> {
  const blob = await buildXlsx(table);
  downloadBytes(blob, `${safeFileBase(table.fileBase)}_${todayLocal()}.xlsx`, XLSX_MIME);
}
