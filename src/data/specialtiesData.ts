export interface SpecialtyArea {
  id: string;
  name: string;
  description: string;
  items: string[];
}

export const specialtyAreas: SpecialtyArea[] = [
  {
    id: 'artes_hobbies',
    name: 'Artes y Hobbies',
    description: 'Teatro, pintura, escultura, música, coleccionismo, fotografía, etc.',
    items: [
      'Anfitrión/a y Protocolo', 'Baile', 'Coleccionista', 'Escultor',
      'Filatelia', 'Fotografía', 'Historiador/a', 'Literatura y Poesía',
      'Música', 'Pintor/a', 'Teatro y Expresión Corporal', 'Magia e Ilusionismo'
    ]
  },
  {
    id: 'ciencias_tecnologias',
    name: 'Ciencias y Tecnologías',
    description: 'Astronomía, biología, electrónica, física, informática, matemática, química.',
    items: [
      'Astronomía', 'Biología', 'Electrónica', 'Física',
      'Informática', 'Matemática', 'Química', 'Robótica y Automatización'
    ]
  },
  {
    id: 'cultura_fisica',
    name: 'Cultura Física',
    description: 'Deportes, acondicionamiento físico, cabuyería y seguridad acuática.',
    items: [
      'Actividades Deportivas', 'Atleta / Fisicocultismo / Bodyfitness',
      'Defensa Personal', 'Maniobra con Cuerdas', 'Nadador/a', 'Salvavidas'
    ]
  },
  {
    id: 'habilidades_destrezas',
    name: 'Habilidades y Destrezas',
    description: 'Cocina, mecánica, reciclaje y habilidades manuales.',
    items: [
      'Cocinero/a', 'Mecánica Automotriz', 'Reciclaje',
      'Carpintería y Ebanistería', 'Electricidad del Hogar'
    ]
  },
  {
    id: 'identidad_nacional',
    name: 'Identidad Nacional',
    description: 'Historia patria, geografía soberana, símbolos y civismo venezolano.',
    items: [
      'Defensa Nacional', 'Historia Patria y Simbolismo Scout',
      'Folklore y Tradiciones Venezolanas', 'Civismo y Derechos Ciudadanos'
    ]
  },
  {
    id: 'preparacion_profesional',
    name: 'Preparación Profesional',
    description: 'Vocación, oficios profesionales y proyección de carrera.',
    items: [
      'Arquitectura', 'Comunicador/a Social', 'Odontólogo/a',
      'Recreación', 'Repostería', 'Salud y Producción Animal'
    ]
  },
  {
    id: 'servicio',
    name: 'Servicio',
    description: 'Servicio a la comunidad, conservación ecológica e interpretación.',
    items: [
      'Conservacionismo', 'Guía', 'Intérprete', 'Primeros Auxilios', 'Protección Civil'
    ]
  },
  {
    id: 'vida_aire_libre',
    name: 'Vida al Aire Libre',
    description: 'Campismo avanzado, exploración de la naturaleza, fauna y cabuyería.',
    items: [
      'Acampador', 'Entomología', 'Ofidología',
      'Pionerismo y Cabuyería', 'Orientación con Brújula y Mapa'
    ]
  }
];

export const DROPBOX_SPECIALTIES_CATALOG_URL = 'https://scouts.org.ve/especialidades/';

export const certificateCategories = [
  { id: 'especialidades', name: 'Especialidades' },
  { id: 'programas_mundiales', name: 'Programas Mundiales' },
  { id: 'iniciativas_programa', name: 'Iniciativas de Programa' },
  { id: 'proyecto', name: 'Proyecto de Servicio' },
  { id: 'reconocimientos', name: 'Reconocimientos / Méritos' },
  { id: 'cursos', name: 'Cursos y Talleres' }
];

export const wosmProgramsList = [
  'Mensajeros de la Paz',
  'Scouts del Mundo',
  'Tribu de la Tierra',
  'Aliados de la Salud',
  'Líderes de Vida'
];

export const initiativesList = [
  'Mundo Seguro',
  'En-Señas',
  'Guardianes Alimentarios',
  'Diálogo Interreligioso',
  'He for She',
  'Campaña Contra los Robots Letales'
];

export const coursesAndWorkshopsList = [
  'Horqueta (Curso de Formación)',
  'Remo (Curso de Formación)',
  'Canoa (Curso de Formación)',
  'Taller de Primeros Auxilios',
  'Taller de Pionerismo y Cabuyería',
  'Taller de Campismo Avanzado',
  'Taller de Liderazgo Juvenil'
];

export const specialtyLevels = [
  { id: 'bronce', name: 'Bronce (Iniciación)' },
  { id: 'plata', name: 'Plata (Especialización)' },
  { id: 'oro', name: 'Oro (Perfeccionamiento)' }
];

/* =========================================================================
   CATÁLOGO OFICIAL DE ESPECIALIDADES ASV (39 Especialidades con Guías PDF)
   Fuente: https://scouts.org.ve/especialidades/
   ========================================================================= */

export type SpecialtyCategoryId = 
  | 'todos'
  | 'artes_hobbies'
  | 'ciencias_tecnologias'
  | 'cultura_fisica'
  | 'habilidades_destrezas'
  | 'identidad_nacional'
  | 'preparacion_profesional'
  | 'servicio'
  | 'vida_aire_libre';

export interface SpecialtyCategoryMeta {
  id: SpecialtyCategoryId;
  label: string;
  icon: string;
  color: string;
  description: string;
}

export interface ScoutSpecialty {
  id: string;
  title: string;
  category: SpecialtyCategoryId;
  categoryLabel: string;
  categoryIcon: string;
  icon: string;
  pdfUrl: string;
  description: string;
  color: string;
}

export const SPECIALTY_CATEGORIES: SpecialtyCategoryMeta[] = [
  {
    id: 'todos',
    label: 'Todas las Especialidades',
    icon: '🏅',
    color: '#9333ea',
    description: 'Catálogo oficial de especialidades de la Asociación de Scouts de Venezuela (ASV)'
  },
  {
    id: 'artes_hobbies',
    label: 'Artes y Hobbies',
    icon: '🎨',
    color: '#ec4899',
    description: 'Expresión artística, creatividad, música, historia y manualidades'
  },
  {
    id: 'ciencias_tecnologias',
    label: 'Ciencias y Tecnologías',
    icon: '🔬',
    color: '#3b82f6',
    description: 'Investigación científica, astronomía, informática y ciencias exactas'
  },
  {
    id: 'cultura_fisica',
    label: 'Cultura Física',
    icon: '🏃',
    color: '#ef4444',
    description: 'Deportes, acondicionamiento físico, cabuyería y seguridad acuática'
  },
  {
    id: 'habilidades_destrezas',
    label: 'Habilidades y Destrezas',
    icon: '🛠️',
    color: '#f59e0b',
    description: 'Cocina, mecánica, reciclaje y habilidades operativas para la vida'
  },
  {
    id: 'identidad_nacional',
    label: 'Identidad Nacional',
    icon: '🇻🇪',
    color: '#eab308',
    description: 'Valores patrios, geografía soberana y civismo venezolano'
  },
  {
    id: 'preparacion_profesional',
    label: 'Preparación Profesional',
    icon: '💼',
    color: '#8b5cf6',
    description: 'Vocación, oficios profesionales y proyección de carrera laboral'
  },
  {
    id: 'servicio',
    label: 'Servicio',
    icon: '🤝',
    color: '#10b981',
    description: 'Servicio a la comunidad, conservación ecológica e interpretación'
  },
  {
    id: 'vida_aire_libre',
    label: 'Vida al Aire Libre',
    icon: '🏕️',
    color: '#059669',
    description: 'Campismo avanzado, exploración de la naturaleza y fauna'
  }
];

export const SCOUT_SPECIALTIES: ScoutSpecialty[] = [
  // 1. Artes y Hobbies (10)
  {
    id: 'anfitrion_protocolo',
    title: 'Anfitrión/a y Protocolo',
    category: 'artes_hobbies',
    categoryLabel: 'Artes y Hobbies',
    categoryIcon: '🎨',
    icon: '🤝',
    pdfUrl: 'https://scouts.org.ve/wp-content/uploads/2026/09/ANFITRION-Y-PROTOCOLO.pdf',
    description: 'Normas de etiqueta, recepción de invitados, diplomacia cívica, oratoria y protocolo en ceremonias scouts y actos públicos.',
    color: '#ec4899'
  },
  {
    id: 'baile',
    title: 'Baile',
    category: 'artes_hobbies',
    categoryLabel: 'Artes y Hobbies',
    categoryIcon: '🎨',
    icon: '💃',
    pdfUrl: 'https://scouts.org.ve/wp-content/uploads/2026/09/BAILE.pdf',
    description: 'Expresión corporal, ritmos tradicionales venezolanos (joropo, tambor, calipso), danza contemporánea y diseño coreográfico.',
    color: '#ec4899'
  },
  {
    id: 'coleccionista',
    title: 'Coleccionista',
    category: 'artes_hobbies',
    categoryLabel: 'Artes y Hobbies',
    categoryIcon: '🎨',
    icon: '📦',
    pdfUrl: 'https://scouts.org.ve/wp-content/uploads/2026/09/COLECCIONISTA.pdf',
    description: 'Catalogación, preservación, clasificación metódica e historia de objetos de valor testimonial, cultural o patrimonial.',
    color: '#ec4899'
  },
  {
    id: 'escultor',
    title: 'Escultor',
    category: 'artes_hobbies',
    categoryLabel: 'Artes y Hobbies',
    categoryIcon: '🎨',
    icon: '🗿',
    pdfUrl: 'https://scouts.org.ve/wp-content/uploads/2026/09/ESCULTOR.pdf',
    description: 'Técnicas de modelado y tallado en arcilla, madera, yeso o metales para crear expresiones artísticas tridimensionales.',
    color: '#ec4899'
  },
  {
    id: 'filatelia',
    title: 'Filatelia',
    category: 'artes_hobbies',
    categoryLabel: 'Artes y Hobbies',
    categoryIcon: '🎨',
    icon: '✉️',
    pdfUrl: 'https://scouts.org.ve/wp-content/uploads/2026/09/FILATELIA.pdf',
    description: 'Estudio y colección de sellos postales, historia postal venezolana y universal, marcas y conservación de estampillas.',
    color: '#ec4899'
  },
  {
    id: 'fotografia',
    title: 'Fotografía',
    category: 'artes_hobbies',
    categoryLabel: 'Artes y Hobbies',
    categoryIcon: '🎨',
    icon: '📷',
    pdfUrl: 'https://scouts.org.ve/wp-content/uploads/2026/09/Fotografia.pdf',
    description: 'Composición, encuadre fotográfico, iluminación, manejo de cámaras digitales, fotografía de naturaleza y edición visual.',
    color: '#ec4899'
  },
  {
    id: 'historiador',
    title: 'Historiador/a',
    category: 'artes_hobbies',
    categoryLabel: 'Artes y Hobbies',
    categoryIcon: '🎨',
    icon: '📜',
    pdfUrl: 'https://scouts.org.ve/wp-content/uploads/2026/09/HISTORIADOR-A.pdf',
    description: 'Investigación documental, fuentes primarias, preservación de la memoria histórica local, nacional y del movimiento scout.',
    color: '#ec4899'
  },
  {
    id: 'literatura_poesia',
    title: 'Literatura y Poesía',
    category: 'artes_hobbies',
    categoryLabel: 'Artes y Hobbies',
    categoryIcon: '🎨',
    icon: '✍️',
    pdfUrl: 'https://scouts.org.ve/wp-content/uploads/2026/09/LITERATURA-Y-POESIA.pdf',
    description: 'Creación literaria en prosa y verso, declamación, géneros narrativos, métrica poética y fomento de la lectura.',
    color: '#ec4899'
  },
  {
    id: 'musica',
    title: 'Música',
    category: 'artes_hobbies',
    categoryLabel: 'Artes y Hobbies',
    categoryIcon: '🎨',
    icon: '🎵',
    pdfUrl: 'https://scouts.org.ve/wp-content/uploads/2026/09/MUSICA.pdf',
    description: 'Interpretación de instrumentos musicales (cuatro, guitarra, viento, percusión), teoría y solfeo, y animación musical en fogatas.',
    color: '#ec4899'
  },
  {
    id: 'pintor',
    title: 'Pintor/a',
    category: 'artes_hobbies',
    categoryLabel: 'Artes y Hobbies',
    categoryIcon: '🎨',
    icon: '🖌️',
    pdfUrl: 'https://scouts.org.ve/wp-content/uploads/2026/09/PINTOR-A.pdf',
    description: 'Técnicas de pintura artística (óleo, acuarela, acrílico, gouache), teoría del color, perspectiva y creación de murales.',
    color: '#ec4899'
  },

  // 2. Ciencias y Tecnologías (7)
  {
    id: 'astronomia',
    title: 'Astronomía',
    category: 'ciencias_tecnologias',
    categoryLabel: 'Ciencias y Tecnologías',
    categoryIcon: '🔬',
    icon: '🔭',
    pdfUrl: 'https://scouts.org.ve/wp-content/uploads/2026/09/ASTRONOMIA.pdf',
    description: 'Observación celestial nocturna, constelaciones visibles en Venezuela, planetas del sistema solar y orientación astronómica.',
    color: '#3b82f6'
  },
  {
    id: 'biologia',
    title: 'Biología',
    category: 'ciencias_tecnologias',
    categoryLabel: 'Ciencias y Tecnologías',
    categoryIcon: '🔬',
    icon: '🧬',
    pdfUrl: 'https://scouts.org.ve/wp-content/uploads/2026/09/BIOLOGIA.pdf',
    description: 'Estudio de la vida, reinos biológicos, flora y fauna nativa venezolana, microecosistemas y procesos celulares.',
    color: '#3b82f6'
  },
  {
    id: 'electronica',
    title: 'Electrónica',
    category: 'ciencias_tecnologias',
    categoryLabel: 'Ciencias y Tecnologías',
    categoryIcon: '🔬',
    icon: '⚡',
    pdfUrl: 'https://scouts.org.ve/wp-content/uploads/2026/09/ELECTRONICA.pdf',
    description: 'Principios de circuitos, soldadura con estaño, componentes pasivos y activos, sensores y proyectos con Arduino/placas programables.',
    color: '#3b82f6'
  },
  {
    id: 'fisica',
    title: 'Física',
    category: 'ciencias_tecnologias',
    categoryLabel: 'Ciencias y Tecnologías',
    categoryIcon: '🔬',
    icon: '⚛️',
    pdfUrl: 'https://scouts.org.ve/wp-content/uploads/2026/09/FISICA.pdf',
    description: 'Leyes del movimiento de Newton, energía mecánica, óptica, termodinámica y experimentos prácticos de física aplicada al campismo.',
    color: '#3b82f6'
  },
  {
    id: 'informatica',
    title: 'Informática',
    category: 'ciencias_tecnologias',
    categoryLabel: 'Ciencias y Tecnologías',
    categoryIcon: '🔬',
    icon: '💻',
    pdfUrl: 'https://scouts.org.ve/wp-content/uploads/2026/09/INFORMATICA.pdf',
    description: 'Arquitectura de computadoras, redes, fundamentos de programación, ciberseguridad y herramientas web aplicadas al servicio scout.',
    color: '#3b82f6'
  },
  {
    id: 'matematica',
    title: 'Matemática',
    category: 'ciencias_tecnologias',
    categoryLabel: 'Ciencias y Tecnologías',
    categoryIcon: '🔬',
    icon: '📐',
    pdfUrl: 'https://scouts.org.ve/wp-content/uploads/2026/09/MATEMATICA.pdf',
    description: 'Trigonometría y geometría práctica para cálculo de alturas de árboles, anchura de ríos, escalas cartográficas y estadística.',
    color: '#3b82f6'
  },
  {
    id: 'quimica',
    title: 'Química',
    category: 'ciencias_tecnologias',
    categoryLabel: 'Ciencias y Tecnologías',
    categoryIcon: '🔬',
    icon: '🧪',
    pdfUrl: 'https://scouts.org.ve/wp-content/uploads/2026/09/QUIMICA.pdf',
    description: 'Elementos químicos, reacciones de combustión, purificación del agua, formulación de sustancias útiles y normas de seguridad.',
    color: '#3b82f6'
  },

  // 3. Cultura Física (6)
  {
    id: 'actividades_deportivas',
    title: 'Actividades Deportivas',
    category: 'cultura_fisica',
    categoryLabel: 'Cultura Física',
    categoryIcon: '🏃',
    icon: '⚽',
    pdfUrl: 'https://scouts.org.ve/wp-content/uploads/2026/09/ACTIVIDADES-DEPORTIVAS.pdf',
    description: 'Reglamentos, tácticas, arbitraje y espíritu deportivo en disciplinas colectivas e individuales como fútbol, básquetbol o voleibol.',
    color: '#ef4444'
  },
  {
    id: 'atleta_fisicoculturismo',
    title: 'Atleta / Fisicocultismo / Bodyfitness',
    category: 'cultura_fisica',
    categoryLabel: 'Cultura Física',
    categoryIcon: '🏃',
    icon: '🏋️',
    pdfUrl: 'https://scouts.org.ve/wp-content/uploads/2026/09/ATLETA-FISICOCULTURISMO-BODYFITNESS.pdf',
    description: 'Entrenamiento físico planificado, biomecánica del ejercicio, acondicionamiento cardiovascular y nutrición equilibrada.',
    color: '#ef4444'
  },
  {
    id: 'defensa_personal',
    title: 'Defensa Personal',
    category: 'cultura_fisica',
    categoryLabel: 'Cultura Física',
    categoryIcon: '🏃',
    icon: '🥋',
    pdfUrl: 'https://scouts.org.ve/wp-content/uploads/2026/09/DEFENSA-PERSONAL.pdf',
    description: 'Técnicas de prevención, evasión de situaciones de riesgo, artes marciales defensivas, control corporal y responsabilidad ética.',
    color: '#ef4444'
  },
  {
    id: 'maniobra_con_cuerdas',
    title: 'Maniobra con Cuerdas',
    category: 'cultura_fisica',
    categoryLabel: 'Cultura Física',
    categoryIcon: '🏃',
    icon: '🪢',
    pdfUrl: 'https://scouts.org.ve/wp-content/uploads/2026/09/MANIOBRA-CON-CUERDAS.pdf',
    description: 'Cabuyería de alta precisión, rápel, tirolesas, confección de arneses de emergencia, anclajes seguros y amarres para puentes de mono.',
    color: '#ef4444'
  },
  {
    id: 'nadador',
    title: 'Nadador/a',
    category: 'cultura_fisica',
    categoryLabel: 'Cultura Física',
    categoryIcon: '🏃',
    icon: '🏊',
    pdfUrl: 'https://scouts.org.ve/wp-content/uploads/2026/09/NADADOR-A.pdf',
    description: 'Dominio de los cuatro estilos de natación, apnea controlada, flotabilidad y técnicas de desplazamiento en aguas abiertas y piscinas.',
    color: '#ef4444'
  },
  {
    id: 'salvavidas',
    title: 'Salvavidas',
    category: 'cultura_fisica',
    categoryLabel: 'Cultura Física',
    categoryIcon: '🏃',
    icon: '🛟',
    pdfUrl: 'https://scouts.org.ve/wp-content/uploads/2026/09/SALVAVIDAS.pdf',
    description: 'Rescate de víctimas en medios acuáticos, técnicas de zafaduras, Reanimación Cardiopulmonar (RCP) y protocolos de socorrismo.',
    color: '#ef4444'
  },

  // 4. Habilidades y Destrezas (3)
  {
    id: 'cocinero',
    title: 'Cocinero/a',
    category: 'habilidades_destrezas',
    categoryLabel: 'Habilidades y Destrezas',
    categoryIcon: '🛠️',
    icon: '🍳',
    pdfUrl: 'https://scouts.org.ve/wp-content/uploads/2026/09/COCINERO.pdf',
    description: 'Cocina de patrulla, cocción de alimentos sin utensilios (a la brasa/horno de tierra), menús nutritivos e higiene estricta en campamento.',
    color: '#f59e0b'
  },
  {
    id: 'mecanica_automotriz',
    title: 'Mecánica Automotriz',
    category: 'habilidades_destrezas',
    categoryLabel: 'Habilidades y Destrezas',
    categoryIcon: '🛠️',
    icon: '🔧',
    pdfUrl: 'https://scouts.org.ve/wp-content/uploads/2026/09/MECANICA-AUTOMOTRIZ.pdf',
    description: 'Mantenimiento del motor, sistema eléctrico del vehículo, cambio de llantas, diagnóstico de fallas comunes y seguridad vial.',
    color: '#f59e0b'
  },
  {
    id: 'reciclaje',
    title: 'Reciclaje',
    category: 'habilidades_destrezas',
    categoryLabel: 'Habilidades y Destrezas',
    categoryIcon: '🛠️',
    icon: '♻️',
    pdfUrl: 'https://scouts.org.ve/wp-content/uploads/2026/09/RECICLAJE.pdf',
    description: 'Clasificación de desechos sólidos, valorización de plásticos, compostaje orgánico y diseño de proyectos ecológicos de impacto comunitario.',
    color: '#f59e0b'
  },

  // 5. Identidad Nacional (1)
  {
    id: 'defensa_nacional',
    title: 'Defensa Nacional',
    category: 'identidad_nacional',
    categoryLabel: 'Identidad Nacional',
    categoryIcon: '🇻🇪',
    icon: '🛡️',
    pdfUrl: 'https://scouts.org.ve/wp-content/uploads/2026/09/DEFENSA-NACIONAL.pdf',
    description: 'Valores republicanos venezolanos, símbolos patrios, geografía territorial soberana, gestión de riesgos y protección civil ciudadana.',
    color: '#eab308'
  },

  // 6. Preparación Profesional (6)
  {
    id: 'arquitectura',
    title: 'Arquitectura',
    category: 'preparacion_profesional',
    categoryLabel: 'Preparación Profesional',
    categoryIcon: '💼',
    icon: '🏛️',
    pdfUrl: 'https://scouts.org.ve/wp-content/uploads/2026/09/ARQUITECTURA.pdf',
    description: 'Bocetos y planos a escala, historia de la arquitectura venezolana y universal, maquetismo y diseño de espacios sustentables.',
    color: '#8b5cf6'
  },
  {
    id: 'comunicador_social',
    title: 'Comunicador/a Social',
    category: 'preparacion_profesional',
    categoryLabel: 'Preparación Profesional',
    categoryIcon: '💼',
    icon: '🎙️',
    pdfUrl: 'https://scouts.org.ve/wp-content/uploads/2026/09/COMUNICADOR-A-SOCIAL.pdf',
    description: 'Redacción periodística, locución radial, coberturas de campamentos y eventos scouts, y manejo ético de medios de información.',
    color: '#8b5cf6'
  },
  {
    id: 'odontologo',
    title: 'Odontólogo/a',
    category: 'preparacion_profesional',
    categoryLabel: 'Preparación Profesional',
    categoryIcon: '💼',
    icon: '🦷',
    pdfUrl: 'https://scouts.org.ve/wp-content/uploads/2026/09/ODONTOLOGO-A.pdf',
    description: 'Anatomía dental, técnicas de higiene bucal, prevención de enfermedades periodontales y promoción de la salud bucodental comunitaria.',
    color: '#8b5cf6'
  },
  {
    id: 'recreacion',
    title: 'Recreación',
    category: 'preparacion_profesional',
    categoryLabel: 'Preparación Profesional',
    categoryIcon: '💼',
    icon: '🎯',
    pdfUrl: 'https://scouts.org.ve/wp-content/uploads/2026/09/RECREACION.pdf',
    description: 'Técnicas de recreación comunitaria, dinámicas de integración, diseño de actividades lúdicas grupales y liderazgo en campamentos.',
    color: '#8b5cf6'
  },
  {
    id: 'reposteria',
    title: 'Repostería',
    category: 'preparacion_profesional',
    categoryLabel: 'Preparación Profesional',
    categoryIcon: '💼',
    icon: '🧁',
    pdfUrl: 'https://scouts.org.ve/wp-content/uploads/2026/09/REPOSTERIA.pdf',
    description: 'Técnicas de pastelería, preparación de postres tradicionales venezolanos, repostería creativa, horneado y medidas culinarias.',
    color: '#8b5cf6'
  },
  {
    id: 'salud_produccion_animal',
    title: 'Salud y Producción Animal',
    category: 'preparacion_profesional',
    categoryLabel: 'Preparación Profesional',
    categoryIcon: '💼',
    icon: '🐾',
    pdfUrl: 'https://scouts.org.ve/wp-content/uploads/2026/09/SALUD-Y-PRODUCCION-ANIMAL.pdf',
    description: 'Bienestar y etología animal, cuidados veterinarios básicos de animales domésticos y de granja, prevención de zoonosis y zootecnia.',
    color: '#8b5cf6'
  },

  // 7. Servicio (3)
  {
    id: 'conservacionismo',
    title: 'Conservacionismo',
    category: 'servicio',
    categoryLabel: 'Servicio',
    categoryIcon: '🤝',
    icon: '🌱',
    pdfUrl: 'https://scouts.org.ve/wp-content/uploads/2026/09/CONSERVACIONISMO.pdf',
    description: 'Preservación de cuencas hidrográficas, parques nacionales de Venezuela, reforestación con especies autóctonas y educación ambiental.',
    color: '#10b981'
  },
  {
    id: 'guia',
    title: 'Guía',
    category: 'servicio',
    categoryLabel: 'Servicio',
    categoryIcon: '🤝',
    icon: '🧭',
    pdfUrl: 'https://scouts.org.ve/wp-content/uploads/2026/09/GUIA.pdf',
    description: 'Conducción segura de grupos en excursiones, interpretación del patrimonio histórico y natural local, y orientación con brújula y mapa.',
    color: '#10b981'
  },
  {
    id: 'interprete',
    title: 'Intérprete',
    category: 'servicio',
    categoryLabel: 'Servicio',
    categoryIcon: '🤝',
    icon: '🗣️',
    pdfUrl: 'https://scouts.org.ve/wp-content/uploads/2026/09/INTERPRETE.pdf',
    description: 'Traducción y fluidez conversacional en un idioma extranjero o Lengua de Señas Venezolana (LSV) para la hermandad scout mundial.',
    color: '#10b981'
  },

  // 8. Vida al Aire Libre (3)
  {
    id: 'acampador',
    title: 'Acampador',
    category: 'vida_aire_libre',
    categoryLabel: 'Vida al Aire Libre',
    categoryIcon: '🏕️',
    icon: '⛺',
    pdfUrl: 'https://scouts.org.ve/wp-content/uploads/2026/09/ACAMPADOR.pdf',
    description: 'Técnicas avanzadas de campismo scout, instalación de vivacs y tiendas bajo lluvia extrema, principios Sin Dejar Rastro y seguridad en montaña.',
    color: '#059669'
  },
  {
    id: 'entomologia',
    title: 'Entomología',
    category: 'vida_aire_libre',
    categoryLabel: 'Vida al Aire Libre',
    categoryIcon: '🏕️',
    icon: '🦗',
    pdfUrl: 'https://scouts.org.ve/wp-content/uploads/2026/09/ENTOMOLOGIA.pdf',
    description: 'Estudio y clasificación de insectos de Venezuela, su rol ecológico como polinizadores y control de plagas naturales.',
    color: '#059669'
  },
  {
    id: 'ofidologia',
    title: 'Ofidología',
    category: 'vida_aire_libre',
    categoryLabel: 'Vida al Aire Libre',
    categoryIcon: '🏕️',
    icon: '🐍',
    pdfUrl: 'https://scouts.org.ve/wp-content/uploads/2026/09/OFIDOLOGIA.pdf',
    description: 'Diferenciación de serpientes venenosas (mapanares, cascabeles, corales) y no venenosas, hábitats, prevención y primeros auxilios ante mordeduras.',
    color: '#059669'
  }
];
