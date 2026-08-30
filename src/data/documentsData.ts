export interface ScoutDocument {
  id: string;
  title: string;
  category: 'adelanto' | 'iniciativas' | 'manuales' | 'reglamentos' | 'formacion';
  categoryLabel: string;
  description: string;
  badgeIcon: string;
  size: string;
  pages?: number;
  pdfUrl: string;
  targetUnit: 'todos' | 'manada' | 'tropa' | 'caminantes' | 'clan';
}

export const SCOUT_DOCUMENTS: ScoutDocument[] = [
  {
    id: 'adelanto_progresivo_asv',
    title: 'Adelanto Progresivo ASV',
    category: 'adelanto',
    categoryLabel: 'Adelanto e Insignias',
    description: 'Marco curricular oficial y etapas de desarrollo del Plan Progresivo de la Asociación de Scouts de Venezuela.',
    badgeIcon: '⚜️',
    size: '971 KB',
    pdfUrl: '/documentos/Adelanto%20progresivo%20ASV.pdf',
    targetUnit: 'todos'
  },
  {
    id: 'mensajeros_de_la_paz',
    title: 'Mensajeros de la Paz',
    category: 'iniciativas',
    categoryLabel: 'Programas e Iniciativas',
    description: 'Guía oficial para la formulación, registro y ejecución de proyectos scouts que construyen una cultura de paz en la comunidad.',
    badgeIcon: '🕊️',
    size: '3.6 MB',
    pdfUrl: '/documentos/Mensajeros%20de%20la%20paz.pdf',
    targetUnit: 'todos'
  },
  {
    id: 'aliados_de_la_salud',
    title: 'Aliados de la Salud',
    category: 'iniciativas',
    categoryLabel: 'Programas e Iniciativas',
    description: 'Programa del marco Mundo Mejor para promover hábitos saludables, bienestar físico, salud mental y prevención en la juventud scout.',
    badgeIcon: '🩺',
    size: '11.9 MB',
    pdfUrl: '/documentos/Aliados%20de%20la%20salud.pdf',
    targetUnit: 'todos'
  },
  {
    id: 'campeones_por_la_naturaleza',
    title: 'Campeones por la Naturaleza',
    category: 'iniciativas',
    categoryLabel: 'Programas e Iniciativas',
    description: 'Desafío ecológico de la Tribu de la Tierra y WOSM para la protección de la biodiversidad, ecosistemas y consumo responsable.',
    badgeIcon: '🌿',
    size: '4.3 MB',
    pdfUrl: '/documentos/Campeones%20por%20la%20naturaleza.pdf',
    targetUnit: 'todos'
  },
  {
    id: 'embajadores_marea_plastico',
    title: 'Embajadores de la Marea de Plástico',
    category: 'iniciativas',
    categoryLabel: 'Programas e Iniciativas',
    description: 'Iniciativa mundial de ONU Medio Ambiente y WOSM para erradicar la contaminación por plásticos de un solo uso en costas y ciudades.',
    badgeIcon: '🌊',
    size: '3.7 MB',
    pdfUrl: '/documentos/Embajadores%20de%20la%20marea%20de%20plastico.pdf',
    targetUnit: 'todos'
  },
  {
    id: 'go_solar',
    title: 'Go Solar',
    category: 'iniciativas',
    categoryLabel: 'Programas e Iniciativas',
    description: 'Guía de aprendizaje práctico sobre energía solar, tecnologías limpias y acciones scouts contra el cambio climático.',
    badgeIcon: '☀️',
    size: '3.4 MB',
    pdfUrl: '/documentos/Go%20solar.pdf',
    targetUnit: 'todos'
  },
  {
    id: 'en_senas',
    title: 'En Señas',
    category: 'manuales',
    categoryLabel: 'Manuales Técnicos',
    description: 'Manual de lengua de señas, comunicación accesible e integración de personas con discapacidad auditiva en el Movimiento Scout.',
    badgeIcon: '🤟',
    size: '11.4 MB',
    pdfUrl: '/documentos/En_senas.pdf',
    targetUnit: 'todos'
  },
  {
    id: 'dialogo_interreligioso',
    title: 'Diálogo Interreligioso',
    category: 'iniciativas',
    categoryLabel: 'Programas e Iniciativas',
    description: 'Guía para fomentar el respeto, la fraternidad universal y el entendimiento entre jóvenes de diversas tradiciones espirituales.',
    badgeIcon: '🤝',
    size: '2.0 MB',
    pdfUrl: '/documentos/Dialogo%20interreligioso.pdf',
    targetUnit: 'todos'
  },
  {
    id: 'robots_letales',
    title: 'Robots Letales',
    category: 'iniciativas',
    categoryLabel: 'Programas e Iniciativas',
    description: 'Concienciación juvenil sobre la ética en la inteligencia artificial, derechos humanos y desarme humanitario.',
    badgeIcon: '🤖',
    size: '2.3 MB',
    pdfUrl: '/documentos/Robots%20Letales.pdf',
    targetUnit: 'todos'
  },
  {
    id: 'competencias_educativas_asv',
    title: 'Competencias Educativas ASV',
    category: 'formacion',
    categoryLabel: 'Formación de Adultos',
    description: 'Definición de las áreas de crecimiento, objetivos formativos y competencias por ramas de la Asociación de Scouts de Venezuela.',
    badgeIcon: '🎓',
    size: '1.2 MB',
    pdfUrl: '/documentos/Competencias%20educativas%20ASV.pdf',
    targetUnit: 'todos'
  },
  {
    id: 'indicadores_de_logros_asv',
    title: 'Indicadores de Logros ASV',
    category: 'reglamentos',
    categoryLabel: 'Reglamentos ASV',
    description: 'Instrumento de evaluación con indicadores de logro y conductas observables para el seguimiento del adelanto scout.',
    badgeIcon: '📊',
    size: '2.1 MB',
    pdfUrl: '/documentos/Indicadores%20de%20logros%20ASV.pdf',
    targetUnit: 'todos'
  }
];
