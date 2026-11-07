// Exportaciones de Jefatura y Comisionados: Censo, Padrón Médico y Control de Membresías.
// Cada reporte se arma UNA vez como tabla (ReportTable) y se descarga como Excel real
// (.xlsx) o como PDF directo. Antes el "Excel" era HTML con extensión .xls (Excel avisaba
// que el formato no coincidía) y el PDF dependía de la ventana de impresión del navegador.

import { daysUntil, formatDateEs, ageFrom } from './dateLocal';

export { ageFrom };
import { ReportTable, Cell } from './reportTable';
import { downloadXlsx } from './xlsxWriter';
import { downloadPdf } from './pdfTableWriter';
import { showAlert } from './alert';

export interface MemberRecord {
  id: string;
  name: string;
  role: string;
  unit: string;
  group_name?: string;
  cedula?: string;
  birth_date?: string;
  join_date?: string;
  promise_date?: string;
  phone?: string;
  gender?: string;
  membership_expires_at?: string;
  membership_status?: string;
  proposed_membership_date?: string;
  medical_data?: any;
}

// Se conserva para quien arme HTML con datos de perfiles (evita inyección de código).
export function escapeHtml(v: any): string {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const isJefatura = (m: MemberRecord) => m.role === 'jefe_grupo' || m.unit === 'grupo' || m.unit === 'jefatura';
const unitLabel = (m: MemberRecord) => (isJefatura(m) ? 'JEFATURA' : (m.unit || 'General').toUpperCase());
const roleLabel = (m: MemberRecord) =>
  m.role === 'jefe_grupo' ? 'Jefe de Grupo' : m.role === 'scouter' ? 'Scouter / Dirigente' : 'Joven Scout';
const dateOrNA = (d?: string) => (d ? formatDateEs(d) : 'N/A');

/** Estado de membresía como texto + color (mismo criterio que el semáforo de Jefatura). */
export function membershipStatusCell(m: MemberRecord): { text: string; color: string } {
  if (m.membership_status === 'pending_approval' || m.membership_status === 'pending') {
    return { text: `Por aprobar${m.membership_expires_at ? ` (${formatDateEs(m.membership_expires_at)})` : ''}`, color: '#7e22ce' };
  }
  if (m.membership_status === 'rejected') return { text: 'Devuelta', color: '#b91c1c' };
  const days = m.membership_status === 'approved' ? daysUntil(m.membership_expires_at) : null;
  if (days === null) return { text: 'Sin registro', color: '#b91c1c' };
  if (days < 0) return { text: `Vencida hace ${Math.abs(days)} d`, color: '#b91c1c' };
  if (days <= 30) return { text: `Vence en ${days} d`, color: '#c2410c' };
  if (days <= 90) return { text: `Por vencer (${days} d)`, color: '#a16207' };
  return { text: `Vigente (${days} d)`, color: '#15803d' };
}

function allergiesText(med: any): string {
  const a = med?.allergies;
  if (!a) return 'Ninguna';
  const list: string[] = [];
  if (a.medicamento) list.push(`Medicamento: ${a.medicamento}`);
  if (a.alimento) list.push(`Alimento: ${a.alimento}`);
  if (a.picada) list.push(`Picada: ${a.picada}`);
  if (a.otro) list.push(a.otro);
  return list.length ? list.join(' | ') : 'Ninguna';
}

// ---------- 1. Censo y nómina ----------
export function buildCensoTable(members: MemberRecord[], groupName: string): ReportTable {
  return {
    title: 'Censo y Nómina Oficial de Miembros',
    subtitle: `${members.length} miembros`,
    groupName: groupName || 'Grupo Scout',
    accent: '#612499',
    fileBase: `Censo_${groupName}`,
    sections: [{
      name: 'Censo',
      headers: ['#', 'Nombres y apellidos', 'Cédula', 'Rol / cargo', 'Rama', 'Edad', 'Género', 'F. nacimiento', 'F. ingreso', 'F. promesa', 'Teléfono', 'Membresía'],
      widths: [3, 22, 11, 14, 10, 5, 8, 10, 10, 10, 12, 14],
      rows: members.map((m, i) => {
        const st = membershipStatusCell(m);
        return [
          i + 1,
          { v: m.name || 'Sin nombre', bold: true },
          m.cedula || 'N/A',
          roleLabel(m),
          unitLabel(m),
          ageFrom(m.birth_date) ?? 'N/A',
          m.gender || 'N/A',
          dateOrNA(m.birth_date),
          dateOrNA(m.join_date),
          dateOrNA(m.promise_date),
          m.phone || 'N/A',
          { v: st.text, color: st.color, bold: true },
        ] as Cell[];
      }),
    }],
  };
}

// ---------- 2. Padrón de emergencia médica ----------
export function buildPadronTable(members: MemberRecord[], groupName: string): ReportTable {
  return {
    title: 'Padrón de Emergencia Médica y Contactos',
    subtitle: 'Datos de salud para actividades y campamentos — uso confidencial',
    groupName: groupName || 'Grupo Scout',
    accent: '#991b1b',
    fileBase: `Padron_Medico_${groupName}`,
    sections: [{
      name: 'Padrón médico',
      headers: ['#', 'Scout / dirigente', 'Cédula', 'Rama', 'Tipo de sangre', 'Alergias', 'Contacto de emergencia', 'Teléfono', 'Tratamiento', 'Seguro'],
      widths: [3, 18, 10, 9, 7, 22, 15, 11, 16, 12],
      rows: members.map((m, i) => {
        const med = m.medical_data || {};
        const adult = m.role === 'scouter' || isJefatura(m);
        const allergies = allergiesText(med);
        return [
          i + 1,
          { v: m.name || 'Sin nombre', bold: true },
          m.cedula || med.ci || 'N/A',
          unitLabel(m),
          { v: med.bloodType || 'Sin registrar', color: '#b91c1c', bold: true },
          allergies === 'Ninguna' ? allergies : { v: allergies, color: '#b91c1c', bold: true },
          med.emergencyContactName || (adult ? 'Contacto directo' : 'Representante'),
          { v: med.emergencyPhonePersonal || med.emergencyPhoneHome || m.phone || 'Sin registrar', bold: true },
          med.hasPrescription ? `Sí: ${med.medicalPrescriptionExplain || 'bajo tratamiento'}` : 'No',
          med.hasInsurance ? `Sí: ${med.insuranceExplain || 'póliza activa'}` : 'No',
        ] as Cell[];
      }),
    }],
  };
}

// ---------- 3. Control de membresías ----------
export function buildMembresiasTable(members: MemberRecord[], groupName: string): ReportTable {
  return {
    title: 'Control de Membresías y Carnets ASV',
    groupName: groupName || 'Grupo Scout',
    accent: '#1e3a8a',
    fileBase: `Membresias_${groupName}`,
    sections: [{
      name: 'Membresías',
      headers: ['#', 'Miembro', 'Cédula', 'Rama', 'Cargo', 'Estado', 'Vence'],
      widths: [3, 24, 12, 11, 14, 18, 11],
      rows: members.map((m, i) => {
        const st = membershipStatusCell(m);
        return [
          i + 1,
          { v: m.name || 'Sin nombre', bold: true },
          m.cedula || 'N/A',
          unitLabel(m),
          roleLabel(m),
          { v: st.text, color: st.color, bold: true },
          m.membership_expires_at ? formatDateEs(m.membership_expires_at) : 'Sin fecha',
        ] as Cell[];
      }),
    }],
  };
}

/** En reportes territoriales (varios grupos) se agrega la columna "Grupo" después del nombre. */
function withGroupColumn(table: ReportTable, members: MemberRecord[]): ReportTable {
  const groups = new Set(members.map(m => (m.group_name || '').trim()).filter(Boolean));
  if (groups.size <= 1) return table;
  const sections = table.sections.map(sec => ({
    ...sec,
    headers: [...sec.headers.slice(0, 2), 'Grupo', ...sec.headers.slice(2)],
    widths: sec.widths ? [...sec.widths.slice(0, 2), 14, ...sec.widths.slice(2)] : undefined,
    rows: sec.rows.map((r, i) => [...r.slice(0, 2), members[i]?.group_name || 'Sin grupo', ...r.slice(2)]),
  }));
  return { ...table, sections };
}

async function run(job: () => Promise<void>) {
  try {
    await job();
  } catch (e: any) {
    console.warn('Error exportando:', e);
    showAlert('No se pudo exportar', e?.message || 'Inténtalo de nuevo. Si no tienes internet, abre la app una vez con conexión para que guarde los módulos de exportación.');
  }
}

const censo = (m: MemberRecord[], g: string) => withGroupColumn(buildCensoTable(m, g), m);
const padron = (m: MemberRecord[], g: string) => withGroupColumn(buildPadronTable(m, g), m);
const membresias = (m: MemberRecord[], g: string) => withGroupColumn(buildMembresiasTable(m, g), m);

export const exportCensoExcel = (m: MemberRecord[], g: string) => run(() => downloadXlsx(censo(m, g)));
export const exportCensoPdf = (m: MemberRecord[], g: string) => run(() => downloadPdf(censo(m, g)));
export const exportPadronMedicoExcel = (m: MemberRecord[], g: string) => run(() => downloadXlsx(padron(m, g)));
export const exportPadronMedicoPdf = (m: MemberRecord[], g: string) => run(() => downloadPdf(padron(m, g)));
export const exportMembresiasExcel = (m: MemberRecord[], g: string) => run(() => downloadXlsx(membresias(m, g)));
export const exportMembresiasPdf = (m: MemberRecord[], g: string) => run(() => downloadPdf(membresias(m, g)));

/** Descarga cualquier ReportTable (usado por Insignias y Plan Trimestral). */
export const exportReportExcel = (t: ReportTable) => run(() => downloadXlsx(t));
export const exportReportPdf = (t: ReportTable) => run(() => downloadPdf(t));
