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
      'Pintura y Dibujo', 'Escultura y Cerámica', 'Teatro y Expresión Corporal',
      'Fotografía Digital', 'Música (Instrumento)', 'Canto y Coral',
      'Cine y Realización de Video', 'Coleccionismo / Filatelia',
      'Diseño Gráfico / Ilustración', 'Literatura y Escritura Creativa', 'Magia e Ilusionismo'
    ]
  },
  {
    id: 'identidad_nacional',
    name: 'Identidad Nacional',
    description: 'Historia de Venezuela, folklore, geografía, tradiciones.',
    items: [
      'Historia Patria y Simbolismo Scout', 'Geografía y Parques Nacionales',
      'Folklore y Tradiciones Venezolanas', 'Civismo y Derechos Ciudadanos',
      'Gastronomía Regional y Criolla', 'Música Folklórica y Danzas Tradicionales',
      'Patrimonio Histórico y Monumentos'
    ]
  },
  {
    id: 'deportes',
    name: 'Deportes',
    description: 'Habilidades atléticas, disciplinas deportivas, acondicionamiento físico.',
    items: [
      'Atletismo', 'Natación y Deportes Acuáticos', 'Ciclismo (Ruta / Montaña)',
      'Fútbol', 'Baloncesto', 'Voleibol', 'Artes Marciales / Defensa Personal',
      'Excursionismo Deportivo y Trekking', 'Gimnasia Físico-Deportiva', 'Tenis / Pádel'
    ]
  },
  {
    id: 'ciencia_tecnologia',
    name: 'Ciencia y Tecnología',
    description: 'Computación, innovación, electrónica, mecánica, astronomía.',
    items: [
      'Computación y Programación', 'Robótica y Automatización',
      'Astronomía y Observación Estelar', 'Electrónica y Circuitos',
      'Telecomunicaciones y Radioafición', 'Química Divertida y Experimentos',
      'Modelismo y Maquetación'
    ]
  },
  {
    id: 'servicio_seguridad',
    name: 'Servicio y Seguridad',
    description: 'Primeros auxilios, salvamento, bomberotecnia, protección civil.',
    items: [
      'Primeros Auxilios', 'Salvamento Acuático', 'Prevención y Extinción de Incendios',
      'Protección Civil y Gestión de Riesgos', 'Seguridad Vial y Tránsito',
      'Rescate y Cuidado Ciudadano', 'Liderazgo en Emergencias'
    ]
  },
  {
    id: 'trabajo',
    name: 'Preparación para el Trabajo',
    description: 'Oficios, emprendimiento, carpintería, electricidad, horticultura.',
    items: [
      'Carpintería y Ebanistería', 'Electricidad del Hogar', 'Mecánica Automotriz / Motos',
      'Emprendimiento y Plan de Negocio', 'Horticultura y Jardinería',
      'Cocina y Repostería Profesional', 'Albañilería y Construcción Ligera'
    ]
  },
  {
    id: 'vida_aire_libre',
    name: 'Vida al Aire Libre',
    description: 'Supervivencia, exploración, pionerismo, orientación, cabuyería.',
    items: [
      'Campismo Avanzado', 'Cabuyería y Construcciones Scout (Pionerismo)',
      'Orientación, Brújula y Cartografía', 'Supervivencia en la Naturaleza',
      'Rastreo y Observación de Huellas', 'Cocina de Campamento / Fogatas'
    ]
  },
  {
    id: 'ecologia',
    name: 'Ecología y Conservacionismo',
    description: 'Reciclaje, protección de flora/fauna, reforestación, energías limpias.',
    items: [
      'Botánica y Reconocimiento de Flora', 'Zoología y Cuidado Animal',
      'Reciclaje y Gestión de Desechos', 'Conservación de Suelos y Agua',
      'Energías Renovables y Solar', 'Ornitología (Estudio de Aves)'
    ]
  }
];

export const certificateCategories = [
  { id: 'especialidades', name: 'Especialidades' },
  { id: 'programas_mundiales', name: 'Programas Mundiales (WOSM)' },
  { id: 'iniciativas_programa', name: 'Iniciativas de Programa (Nacionales, ej: Enseñas)' },
  { id: 'proyecto', name: 'Proyecto de Servicio' },
  { id: 'reconocimientos', name: 'Reconocimientos / Méritos' },
  { id: 'cursos', name: 'Cursos y Talleres' }
];

export const wosmProgramsList = [
  'Scout Solar (Solar Scout)',
  'Campeones de la Naturaleza (Champions for Nature)',
  'Tribu de la Tierra (Earth Tribe)',
  'Scouts del Mundo (Scouts of the World Award)',
  'Mensajeros de la Paz (Messengers of Peace)',
  'Scouts por los Objetivos de Desarrollo Sostenible (SDGs / ODS)',
  'A Salvo del Peligro (Safe from Harm)',
  'Patriotas y Enseñas Nacionales (Iniciativa de Programa)',
  'Diálogo para la Paz (Dialogue for Peace)',
  'Mar Limpio / Desafío Plástico',
  'Horqueta (Curso de Liderazgo)',
  'Remo (Curso de Liderazgo)',
  'Canoa (Curso de Liderazgo)',
  'Punta de Flecha en Bronce',
  'Punta de Flecha en Plata',
  'Punta de Flecha en Oro'
];

export const specialtyLevels = [
  { id: 'bronce', name: 'Bronce (Iniciación)' },
  { id: 'plata', name: 'Plata (Especialización)' },
  { id: 'oro', name: 'Oro (Perfeccionamiento)' }
];
