// Modelo común de los reportes tabulares (Censo, Padrón, Membresías, Insignias, Plan
// Trimestral…). El mismo objeto se exporta a Excel real (.xlsx) y a PDF directo, así las
// dos versiones siempre tienen las mismas columnas y datos.

export type CellValue = string | number | null | undefined;

/** Celda con formato opcional (color de texto en hex, negrita). */
export interface StyledCell {
  v: CellValue;
  color?: string;
  bold?: boolean;
}

export type Cell = CellValue | StyledCell;

export interface ReportSection {
  /** Título de la hoja de Excel (máx. 31 caracteres) y del bloque en el PDF. */
  name: string;
  headers: string[];
  rows: Cell[][];
  /** Peso relativo del ancho de cada columna. Si falta, se calcula por el contenido. */
  widths?: number[];
  /** Filas de texto libre antes de la tabla (p. ej. objetivos del plan). */
  notes?: string[];
}

export interface ReportTable {
  title: string;
  subtitle?: string;
  groupName?: string;
  /** Color de la marca del reporte (encabezados de tabla). */
  accent?: string;
  /** Nombre de archivo sin extensión. */
  fileBase: string;
  sections: ReportSection[];
  /** Orientación del PDF (por defecto horizontal: tablas anchas). */
  orientation?: 'landscape' | 'portrait';
}

export function cellText(c: Cell): string {
  const v = c !== null && typeof c === 'object' ? c.v : c;
  return v === null || v === undefined ? '' : String(v);
}

export function cellStyle(c: Cell): { color?: string; bold?: boolean } {
  return c !== null && typeof c === 'object' ? { color: c.color, bold: c.bold } : {};
}

/** Pesos de ancho por columna a partir del texto más largo (con límites razonables). */
export function autoWidths(section: ReportSection): number[] {
  return section.headers.map((h, i) => {
    let max = h.length;
    for (const r of section.rows) max = Math.max(max, cellText(r[i]).length);
    return Math.min(Math.max(max, 4), 48);
  });
}

/** Nombre de archivo seguro (letras con acento permitidas). */
export function safeFileBase(s: string): string {
  return (s || 'Reporte').replace(/[^\p{L}\p{N}]+/gu, '_').replace(/^_+|_+$/g, '') || 'Reporte';
}

/** Descarga un archivo en el navegador. */
export function downloadBytes(data: Blob | Uint8Array | string, fileName: string, mime: string) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const blob = data instanceof Blob ? data : new Blob([data as BlobPart], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
