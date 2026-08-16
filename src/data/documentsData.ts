export interface ScoutDocument {
  id: string;
  title: string;
  category: 'adelanto' | 'manuales' | 'reglamentos' | 'formacion';
  categoryLabel: string;
  description: string;
  badgeIcon: string;
  size: string;
  pages: number;
  pdfUrl: string;
  targetUnit?: 'manada' | 'tropa' | 'caminantes' | 'clan' | 'todos';
}

export const SCOUT_DOCUMENTS: ScoutDocument[] = [
  // --- GUÍAS DE ADELANTO E INSIGNIAS ---
  {
    id: 'guia_adelanto_clan',
    title: 'Guía de Adelanto del Clan Rover (ASV)',
    category: 'adelanto',
    categoryLabel: 'Adelanto e Insignias',
    description: 'Manual oficial de progresión para Rovers. Requisitos de Precursor, Expedicionario, Descubridor, Fundador e Insignia B-P / Rover Ciudadano.',
    badgeIcon: '⚜️',
    size: '3.8 MB',
    pages: 48,
    pdfUrl: 'https://scout.org/sites/default/files/2023-01/Rover_Scout_Progression_Guide.pdf',
    targetUnit: 'clan'
  },
  {
    id: 'guia_adelanto_caminantes',
    title: 'Guía de Adelanto de la Comunidad de Caminantes',
    category: 'adelanto',
    categoryLabel: 'Adelanto e Insignias',
    description: 'Etapas de Búsqueda, Encuentro y Desafío. Proyecto de servicio a la comunidad y especialidades para jóvenes de 15 a 18 años.',
    badgeIcon: '🧭',
    size: '3.2 MB',
    pages: 42,
    pdfUrl: 'https://scout.org/sites/default/files/2023-01/Caminantes_Guia_Programa.pdf',
    targetUnit: 'caminantes'
  },
  {
    id: 'guia_adelanto_tropa',
    title: 'Guía de Progresión de la Tropa Scout',
    category: 'adelanto',
    categoryLabel: 'Adelanto e Insignias',
    description: 'Manual del Sistema de Patrullas, etapas de Pistas, Sendas, Rumbo y Travesía. Insignia de Caballero Scout.',
    badgeIcon: '🏕️',
    size: '4.5 MB',
    pages: 64,
    pdfUrl: 'https://scout.org/sites/default/files/2023-01/Tropa_Scout_Manual_Adelanto.pdf',
    targetUnit: 'tropa'
  },
  {
    id: 'guia_adelanto_manada',
    title: 'Guía de Progresión de la Manada de Lobatos',
    category: 'adelanto',
    categoryLabel: 'Adelanto e Insignias',
    description: 'Fondo motivador del Libro de las Tierras Vírgenes. Huellas, Cacerías y Lobo Saltador.',
    badgeIcon: '🐺',
    size: '2.9 MB',
    pages: 36,
    pdfUrl: 'https://scout.org/sites/default/files/2023-01/Manada_Lobatos_Adelanto.pdf',
    targetUnit: 'manada'
  },
  {
    id: 'catalogo_especialidades_asv',
    title: 'Catálogo Oficial de Especialidades Scout (ASV)',
    category: 'adelanto',
    categoryLabel: 'Adelanto e Insignias',
    description: 'Requisitos y proyectos para obtener especialidades en Arte, Ciencia, Deportes, Ecología, Servicios y Técnicas Scout en niveles Bronce, Plata y Oro.',
    badgeIcon: '🎖️',
    size: '5.1 MB',
    pages: 78,
    pdfUrl: 'https://scout.org/sites/default/files/2023-01/Catalogo_Especialidades_Scout.pdf',
    targetUnit: 'todos'
  },

  // --- MANUALES TÉCNICOS Y CAMPISMO ---
  {
    id: 'manual_campismo_tecnicas',
    title: 'Manual de Campismo y Técnicas al Aire Libre',
    category: 'manuales',
    categoryLabel: 'Manuales Técnicos',
    description: 'Instalación de campamentos, armado de carpas, cocinas de campo, refugios naturales, fuego seguro y sin dejar rastro.',
    badgeIcon: '⛺',
    size: '6.4 MB',
    pages: 92,
    pdfUrl: 'https://scout.org/sites/default/files/2023-01/Manual_Campismo_Scout.pdf',
    targetUnit: 'todos'
  },
  {
    id: 'manual_primeros_auxilios_scout',
    title: 'Manual de Primeros Auxilios y Emergencias Scout',
    category: 'manuales',
    categoryLabel: 'Manuales Técnicos',
    description: 'Protocolos de atención inicial, RCP, vendajes, inmovilizaciones, picaduras, deshidratación y rescate en zonas agrestes.',
    badgeIcon: '🩹',
    size: '4.1 MB',
    pages: 56,
    pdfUrl: 'https://scout.org/sites/default/files/2023-01/Primeros_Auxilios_Scout_Guia.pdf',
    targetUnit: 'todos'
  },
  {
    id: 'manual_orientacion_topografia',
    title: 'Manual de Orientación, Brújula y Topografía',
    category: 'manuales',
    categoryLabel: 'Manuales Técnicos',
    description: 'Uso de la brújula cartográfica y lensática, lectura de curvas de nivel, coordenadas UTM, triangulación y orientación por estrellas.',
    badgeIcon: '🧭',
    size: '3.6 MB',
    pages: 44,
    pdfUrl: 'https://scout.org/sites/default/files/2023-01/Orientacion_Brujula_Scout.pdf',
    targetUnit: 'todos'
  },
  {
    id: 'manual_pionerismo_amarres',
    title: 'Manual Completo de Pionerismo y Amarres',
    category: 'manuales',
    categoryLabel: 'Manuales Técnicos',
    description: 'Construcción de puentes, torres de observación, mesas de campamento, balsas y anclajes pesados.',
    badgeIcon: '🪢',
    size: '5.8 MB',
    pages: 70,
    pdfUrl: 'https://scout.org/sites/default/files/2023-01/Pionerismo_Amarres_Construcciones.pdf',
    targetUnit: 'todos'
  },

  // --- REGLAMENTOS Y DOCUMENTOS ASV ---
  {
    id: 'por_reglamento_asv',
    title: 'P.O.R. - Principios, Organización y Reglamentos ASV',
    category: 'reglamentos',
    categoryLabel: 'Reglamentos ASV',
    description: 'Documento normativo fundamental de la Asociación de Scouts de Venezuela. Estructura de grupos, deberes, uniformes y normas de seguridad.',
    badgeIcon: '⚖️',
    size: '7.2 MB',
    pages: 120,
    pdfUrl: 'https://scout.org/sites/default/files/2023-01/POR_Reglamento_Oficial_ASV.pdf',
    targetUnit: 'todos'
  },
  {
    id: 'politica_salvo_del_dano_asv',
    title: 'Política Nacional "A Salvo del Daño" (Safe from Harm)',
    category: 'reglamentos',
    categoryLabel: 'Reglamentos ASV',
    description: 'Código de conducta y directrices para garantizar entornos seguros, protección de niños, niñas y jóvenes en actividades scouts.',
    badgeIcon: '🛡️',
    size: '2.5 MB',
    pages: 32,
    pdfUrl: 'https://scout.org/sites/default/files/2023-01/Politica_ASV_A_Salvo_del_Dano.pdf',
    targetUnit: 'todos'
  },
  {
    id: 'manual_uniforme_insignias_asv',
    title: 'Reglamento Oficial de Uniformes e Insignias (ASV)',
    category: 'reglamentos',
    categoryLabel: 'Reglamentos ASV',
    description: 'Ubicación correcta de cintas de grupo, insignias de progresión, especialidades, condecoraciones y pañoletas en la camisa scout.',
    badgeIcon: '👔',
    size: '3.9 MB',
    pages: 40,
    pdfUrl: 'https://scout.org/sites/default/files/2023-01/Reglamento_Uniformes_Insignias_ASV.pdf',
    targetUnit: 'todos'
  },

  // --- FORMACIÓN Y DIRIGENTES ---
  {
    id: 'esquema_nacional_formacion_asv',
    title: 'Esquema Nacional de Formación de Dirigentes (ASV)',
    category: 'formacion',
    categoryLabel: 'Formación y Scouters',
    description: 'Trayectoria formativa de adultos: Cursos Básicos, Cursos de Rama (Horqueta, Remo, Canoa) y Proceso de Insignia de Madera.',
    badgeIcon: '🎓',
    size: '4.8 MB',
    pages: 60,
    pdfUrl: 'https://scout.org/sites/default/files/2023-01/Esquema_Formacion_Dirigentes_ASV.pdf',
    targetUnit: 'todos'
  },
  {
    id: 'guia_animador_rover_asv',
    title: 'Manual del Asesor y Animador del Clan Rover',
    category: 'formacion',
    categoryLabel: 'Formación y Scouters',
    description: 'Herramientas pedagógicas para el acompañamiento de jóvenes adultos en el Clan, formulación de proyectos de vida y servicio comunitario.',
    badgeIcon: '🤝',
    size: '3.4 MB',
    pages: 50,
    pdfUrl: 'https://scout.org/sites/default/files/2023-01/Guia_Asesor_Clan_Rover.pdf',
    targetUnit: 'clan'
  }
];
