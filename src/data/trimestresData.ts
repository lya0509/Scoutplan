export interface QuarterInfo {
  id: string;
  name: string;
  shortName: string;
  months: string;
  description: string;
}

export const QUARTERS: QuarterInfo[] = [
  {
    id: 'Q1',
    name: 'Primer Trimestre',
    shortName: 'Trimestre 1',
    months: 'Enero — Febrero — Marzo',
    description: 'Arranque de año, formulación de metas y compromisos personales.'
  },
  {
    id: 'Q2',
    name: 'Segundo Trimestre',
    shortName: 'Trimestre 2',
    months: 'Abril — Mayo — Junio',
    description: 'Consolidación de proyectos, especialidades y campamentos de grupo.'
  },
  {
    id: 'Q3',
    name: 'Tercer Trimestre',
    shortName: 'Trimestre 3',
    months: 'Julio — Agosto — Septiembre',
    description: 'Grandes exploraciones, eventos distritales y evaluación de adelanto.'
  },
  {
    id: 'Q4',
    name: 'Cuarto Trimestre',
    shortName: 'Trimestre 4',
    months: 'Octubre — Noviembre — Diciembre',
    description: 'Cierre de proyectos de servicio, reconocimientos y celebración anual.'
  }
];
