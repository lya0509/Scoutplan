// Ficha Médica Orión 84: campos del formulario y su ubicación exacta en la plantilla
// public/FICHA_MEDICA_ORION84_Template.pdf (Canva, tamaño carta 612 x 792 pt, sin campos rellenables).
// Coordenadas en puntos medidas desde la esquina SUPERIOR izquierda de cada página.

export type Orion84FieldType = 'text' | 'yesno' | 'choice';

export interface Orion84Field {
  key: string;
  label: string;
  type: Orion84FieldType;
  options?: string[];
  placeholder?: string;
  multiline?: boolean;
  /** Página (0 = Datos personales, 1 = Ficha Médica del Joven) y celda donde se escribe. */
  page: 0 | 1;
  x0: number;
  x1: number;
  /** Una o más filas por las que fluye el texto (una línea por fila si son varias). */
  rows: [number, number][];
}

export interface Orion84Section {
  title: string;
  fields: Orion84Field[];
}

/** Títulos que la plantilla trae vacíos (barras grises sin texto) y que la app imprime. */
export interface Orion84HeaderLabel {
  page: 0 | 1;
  x0: number;
  y0: number;
  y1: number;
  text: string;
}

const P1_COLS4 = [28.4, 167.1, 305.9, 444.5, 583.4];
const P1_COLS3 = [28.4, 210.5, 384.0, 583.4];
const P2_COLS4 = [18.1, 157.0, 296.0, 435.0, 573.9];
const P2_HALF = [18.1, 296.0, 573.9];
const P2_FULL = [18.1, 573.9];

const YESNO = ['Sí', 'No'];
const BLOOD_TYPES = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];

const cell = (page: 0 | 1, cols: number[], col: number, y0: number, y1: number, span = 1) => ({
  page,
  x0: cols[col],
  x1: cols[col + span],
  rows: [[y0, y1]] as [number, number][],
});

export const ORION84_SECTIONS: Orion84Section[] = [
  {
    title: '1. Datos personales',
    fields: [
      { key: 'nombres', label: 'Nombres', type: 'text', ...cell(0, P1_COLS4, 0, 110.0, 137.5) },
      { key: 'apellidos', label: 'Apellidos', type: 'text', ...cell(0, P1_COLS4, 1, 110.0, 137.5) },
      { key: 'cedula', label: 'Cédula de identidad', type: 'text', placeholder: 'V-12.345.678', ...cell(0, P1_COLS4, 2, 110.0, 137.5) },
      { key: 'sexo', label: 'Sexo', type: 'choice', options: ['Masculino', 'Femenino'], ...cell(0, P1_COLS4, 3, 110.0, 137.5) },
      { key: 'fechaNacimiento', label: 'Fecha de nacimiento', type: 'text', placeholder: 'DD/MM/AAAA', ...cell(0, P1_COLS4, 0, 153.5, 180.8) },
      { key: 'grupo', label: 'Grupo Scout', type: 'text', ...cell(0, P1_COLS4, 1, 153.5, 180.8) },
      { key: 'distrito', label: 'Distrito', type: 'text', ...cell(0, P1_COLS4, 2, 153.5, 180.8) },
      { key: 'region', label: 'Región', type: 'text', ...cell(0, P1_COLS4, 3, 153.5, 180.8) },
      { key: 'telefono', label: 'Número de teléfono', type: 'text', placeholder: '0414-0000000', ...cell(0, P1_COLS3, 0, 197.0, 224.5) },
      { key: 'correo', label: 'Correo electrónico', type: 'text', ...cell(0, P1_COLS3, 1, 197.0, 224.5) },
      { key: 'rama', label: 'Rama', type: 'choice', options: ['Manada', 'Tropa', 'Caminante', 'Clan'], ...cell(0, P1_COLS3, 2, 197.0, 224.5) },
      {
        key: 'direccion', label: 'Dirección de habitación', type: 'text', multiline: true,
        page: 0, x0: 28.4, x1: 583.4, rows: [[240.8, 268.0], [269.0, 296.5]],
      },
      { key: 'representanteNombre', label: 'Representante legal (nombre y apellido)', type: 'text', ...cell(0, P1_COLS3, 0, 312.5, 339.8) },
      { key: 'representanteTelefono', label: 'Teléfono del representante', type: 'text', ...cell(0, P1_COLS3, 1, 312.5, 339.8) },
      { key: 'representanteParentesco', label: 'Parentesco', type: 'text', placeholder: 'Ej.: madre, padre, tío', ...cell(0, P1_COLS3, 2, 312.5, 339.8) },
    ],
  },
  {
    title: '2. Datos de salud',
    fields: [
      { key: 'grupoSanguineo', label: 'Grupo sanguíneo', type: 'choice', options: BLOOD_TYPES, ...cell(1, P2_COLS4, 0, 60.0, 74.8) },
      { key: 'peso', label: 'Peso', type: 'text', placeholder: 'Ej.: 60 kg', ...cell(1, P2_COLS4, 1, 60.0, 74.8) },
      { key: 'estatura', label: 'Estatura', type: 'text', placeholder: 'Ej.: 1,70 m', ...cell(1, P2_COLS4, 2, 60.0, 74.8) },
      { key: 'buenaSalud', label: '¿Goza de buena salud?', type: 'yesno', options: YESNO, ...cell(1, P2_COLS4, 3, 60.0, 74.8) },
      { key: 'alergias', label: 'Alergias (explique)', type: 'text', ...cell(1, P2_COLS4, 0, 91.0, 105.8) },
      { key: 'antecedentesFamiliares', label: 'Antecedentes familiares (cáncer, diabetes, etc.)', type: 'text', ...cell(1, P2_COLS4, 1, 122.0, 136.5, 3) },
      { key: 'otrasEnfermedades', label: 'Otras enfermedades (explique)', type: 'text', page: 1, x0: 157.0, x1: 365.6, rows: [[215.0, 229.8]] },
      { key: 'problemasSentidos', label: 'Problemas con los sentidos (vista, oído, etc.)', type: 'text', page: 1, x0: 365.6, x1: 573.9, rows: [[215.0, 229.8]] },
    ],
  },
  {
    title: '3. ¿Ha padecido alguna de estas enfermedades?',
    fields: [
      { key: 'asma', label: 'Asma', type: 'yesno', options: YESNO, ...cell(1, P2_COLS4, 1, 91.0, 105.8) },
      { key: 'convulsiones', label: 'Convulsiones', type: 'yesno', options: YESNO, ...cell(1, P2_COLS4, 2, 91.0, 105.8) },
      { key: 'amigdalitis', label: 'Amigdalitis', type: 'yesno', options: YESNO, ...cell(1, P2_COLS4, 3, 91.0, 105.8) },
      { key: 'gripes', label: 'Gripes', type: 'yesno', options: YESNO, ...cell(1, P2_COLS4, 0, 122.0, 136.5) },
      { key: 'apendicitis', label: 'Apendicitis', type: 'yesno', options: YESNO, ...cell(1, P2_COLS4, 0, 153.0, 167.5) },
      { key: 'hernias', label: 'Hernias', type: 'yesno', options: YESNO, ...cell(1, P2_COLS4, 1, 153.0, 167.5) },
      { key: 'sonambulismo', label: 'Sonambulismo', type: 'yesno', options: YESNO, ...cell(1, P2_COLS4, 2, 153.0, 167.5) },
      { key: 'insomnio', label: 'Insomnio', type: 'yesno', options: YESNO, ...cell(1, P2_COLS4, 3, 153.0, 167.5) },
      { key: 'paperas', label: 'Paperas', type: 'yesno', options: YESNO, ...cell(1, P2_COLS4, 0, 184.0, 198.8) },
      { key: 'ictericia', label: 'Ictericia', type: 'yesno', options: YESNO, ...cell(1, P2_COLS4, 1, 184.0, 198.8) },
      { key: 'sarampion', label: 'Sarampión', type: 'yesno', options: YESNO, ...cell(1, P2_COLS4, 2, 184.0, 198.8) },
      { key: 'rubeola', label: 'Rubéola', type: 'yesno', options: YESNO, ...cell(1, P2_COLS4, 3, 184.0, 198.8) },
      { key: 'escarlatina', label: 'Escarlatina', type: 'yesno', options: YESNO, ...cell(1, P2_COLS4, 0, 215.0, 229.8) },
    ],
  },
  {
    title: '4. Historial médico',
    fields: [
      { key: 'enfermedadAccidenteOperacion', label: '¿Ha sufrido alguna enfermedad, accidente u operación de cuidado? (explique)', type: 'text', multiline: true, ...cell(1, P2_FULL, 0, 246.0, 260.8) },
      { key: 'vacunasRecientes', label: 'Vacunas colocadas recientemente (nombre y fecha)', type: 'text', ...cell(1, P2_FULL, 0, 277.0, 291.8) },
      { key: 'antitetanica', label: '¿Se le ha aplicado antitetánica? (fecha y motivo)', type: 'text', ...cell(1, P2_HALF, 0, 308.0, 322.8) },
      { key: 'esNervioso', label: '¿Es nervioso?', type: 'yesno', options: YESNO, ...cell(1, P2_HALF, 1, 308.0, 322.8) },
      { key: 'actividadesRestringidas', label: '¿Tiene actividades restringidas por el médico?', type: 'text', placeholder: 'Si no aplica, escribe «No»', ...cell(1, P2_HALF, 0, 338.8, 353.8) },
      { key: 'medicamentoRegular', label: '¿Requiere de algún medicamento regular?', type: 'text', placeholder: 'Si no aplica, escribe «No»', ...cell(1, P2_HALF, 1, 338.8, 353.8) },
      { key: 'reaccionMedicamentos', label: '¿Tiene reacción a la penicilina u otro medicamento? (explique)', type: 'text', placeholder: 'Si no aplica, escribe «No»', ...cell(1, P2_HALF, 0, 369.8, 384.8) },
      { key: 'dietaEspecial', label: '¿Requiere de una dieta especial? (explique)', type: 'text', placeholder: 'Si no aplica, escribe «No»', ...cell(1, P2_HALF, 1, 369.8, 384.8) },
      { key: 'trastornosDigestivos', label: '¿Sufre de trastornos digestivos?', type: 'text', placeholder: 'Si no aplica, escribe «No»', ...cell(1, P2_HALF, 0, 401.0, 415.5) },
      { key: 'frecuenciaBano', label: '¿Con qué frecuencia va al baño?', type: 'text', placeholder: 'Ej.: diaria', ...cell(1, P2_HALF, 1, 401.0, 415.5) },
      { key: 'problemasCorazon', label: '¿Sufre de problemas del corazón?', type: 'text', placeholder: 'Si no aplica, escribe «No»', ...cell(1, P2_HALF, 0, 431.8, 446.5) },
      { key: 'problemasSanguineos', label: '¿Sufre de problemas sanguíneos? (hemofilia, etc.)', type: 'text', placeholder: 'Si no aplica, escribe «No»', ...cell(1, P2_HALF, 1, 431.8, 446.5) },
      { key: 'tensionAltaBaja', label: '¿Sufre de alta o baja tensión?', type: 'choice', options: ['No', 'Alta', 'Baja'], ...cell(1, P2_HALF, 0, 462.8, 477.5) },
      { key: 'valoresTension', label: 'Valores normales de tensión', type: 'text', placeholder: 'Ej.: 120/80', ...cell(1, P2_HALF, 1, 462.8, 477.5) },
      { key: 'tratamientoPsicologico', label: '¿Tiene tratamiento psicológico o psiquiátrico? (explique)', type: 'text', placeholder: 'Si no aplica, escribe «No»', ...cell(1, P2_FULL, 0, 494.0, 508.5) },
      { key: 'observaciones', label: 'Observaciones adicionales de salud', type: 'text', multiline: true, ...cell(1, P2_FULL, 0, 524.8, 539.5) },
      { key: 'enfermedadesHuesos', label: '¿Sufre de enfermedades de los huesos? (explique)', type: 'text', placeholder: 'Si no aplica, escribe «No»', ...cell(1, P2_FULL, 0, 555.8, 570.5) },
      { key: 'sistemaNervioso', label: '¿Sufre de enfermedades del sistema nervioso? (explique)', type: 'text', placeholder: 'Si no aplica, escribe «No»', ...cell(1, P2_FULL, 0, 586.8, 601.5) },
      { key: 'seguroMedico', label: '¿Tiene seguro médico?', type: 'yesno', options: YESNO, page: 1, x0: 18.1, x1: 157.0, rows: [[617.8, 632.5]] },
      { key: 'seguroDetalle', label: 'Seguro médico o clínica de preferencia', type: 'text', page: 1, x0: 157.0, x1: 573.9, rows: [[617.8, 632.5]] },
      { key: 'medicoTratante', label: 'Médico tratante', type: 'text', ...cell(1, P2_HALF, 0, 648.8, 663.5) },
      { key: 'medicoTelefono', label: 'Teléfono del médico', type: 'text', ...cell(1, P2_HALF, 1, 648.8, 663.5) },
    ],
  },
  {
    title: '5. En caso de emergencia avisar a',
    fields: [
      // Los tres se imprimen juntos en la última fila de la página 2 (ver ORION84_EMERGENCY_CELL).
      { key: 'emergenciaNombre', label: 'Nombre y apellido', type: 'text', placeholder: 'Padre / Madre / Representante', page: 1, x0: 0, x1: 0, rows: [] },
      { key: 'emergenciaTelefono', label: 'Teléfono', type: 'text', placeholder: '0414-0000000', page: 1, x0: 0, x1: 0, rows: [] },
      { key: 'emergenciaParentesco', label: 'Parentesco', type: 'text', page: 1, x0: 0, x1: 0, rows: [] },
    ],
  },
];

export const ORION84_EMERGENCY_CELL = { page: 1 as const, x0: 18.1, x1: 573.9, rows: [[679.8, 694.2]] as [number, number][] };

export const ORION84_HEADER_LABELS: Orion84HeaderLabel[] = [
  { page: 0, x0: 28.4, y0: 225.2, y1: 239.8, text: 'Dirección de habitación' },
  { page: 0, x0: 28.4, y0: 297.0, y1: 311.5, text: 'Representante legal' },
  { page: 0, x0: 210.5, y0: 297.0, y1: 311.5, text: 'Teléfono del representante' },
  { page: 0, x0: 384.0, y0: 297.0, y1: 311.5, text: 'Parentesco' },
  { page: 1, x0: 18.1, y0: 509.2, y1: 524.0, text: 'Observaciones adicionales de salud' },
  { page: 1, x0: 18.1, y0: 602.2, y1: 617.0, text: '¿Tiene seguro médico?' },
  { page: 1, x0: 157.0, y0: 602.2, y1: 617.0, text: 'Seguro médico o clínica de preferencia' },
  { page: 1, x0: 18.1, y0: 633.2, y1: 648.0, text: 'Médico tratante' },
  { page: 1, x0: 296.0, y0: 633.2, y1: 648.0, text: 'Teléfono del médico' },
];

export const ORION84_ALL_FIELDS: Orion84Field[] = ORION84_SECTIONS.flatMap((s) => s.fields);

export type Orion84Values = Record<string, string>;

export function emptyOrion84Values(): Orion84Values {
  return Object.fromEntries(ORION84_ALL_FIELDS.map((f) => [f.key, '']));
}

export function formatEmergencyLine(v: Orion84Values): string {
  return [
    v.emergenciaNombre,
    v.emergenciaTelefono ? `Tel: ${v.emergenciaTelefono}` : '',
    v.emergenciaParentesco ? `Parentesco: ${v.emergenciaParentesco}` : '',
  ].filter(Boolean).join('   •   ');
}
