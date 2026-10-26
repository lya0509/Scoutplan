import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Image,
  Linking,
  Platform
} from 'react-native';
import {
  Compass,
  Search,
  ChevronRight,
  BookOpen,
  Shield,
  Sparkles,
  CheckCircle2,
  Circle,
  ArrowLeft,
  Award,
  Flame,
  HandMetal,
  MapPin,
  HeartPulse,
  X,
  AlertTriangle,
  Info,
  Play,
  Video,
  Image as ImageIcon,
  Eye,
  FileText,
  ExternalLink,
  WifiOff,
  Wifi,
  ChevronLeft,
  Maximize2
} from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useModalBackHandler } from '../hooks/useBackHandler';
import { colors } from '../theme/colors';
import { navigateBackOrHome } from '../utils/navigationHelper';
import { ManualVisualDiagram } from '../components/ManualVisualDiagram';

export type ManualSectionKey = 'nudos' | 'fogatas' | 'senas' | 'pistas' | 'primeros_auxilios';
export type ModalTabKey = 'escrito' | 'visual' | 'multimedia';

export interface VisualStep {
  stepNumber: number;
  title: string;
  instruction: string;
  callout?: string;
}

export interface MultimediaImage {
  url: string;
  caption: string;
  description?: string;
}

export interface MultimediaData {
  videoEmbedId?: string;
  videoTitle?: string;
  videoChannel?: string;
  videoDuration?: string;
  images?: MultimediaImage[];
}

export interface ManualItem {
  id: string;
  section: ManualSectionKey;
  name: string;
  categoryTag: string;
  difficulty?: 'Básico' | 'Intermedio' | 'Avanzado' | 'Esencial';
  icon: string;
  summary: string;
  description: string;
  steps: string[];
  visualSteps?: VisualStep[];
  multimedia?: MultimediaData;
  tips?: string[];
  safety?: string;
}

const MANUALS_DATA: ManualItem[] = [
  // ==========================================
  // 1. NUDOS Y AMARRES
  // ==========================================
  {
    id: 'nudo_llano',
    section: 'nudos',
    name: 'Nudo Rizo o Llano',
    categoryTag: 'Unión',
    difficulty: 'Básico',
    icon: '🪢',
    summary: 'Unir dos cuerdas del mismo grosor. Ideal para vendajes de primeros auxilios y pañuelo scout.',
    description: 'Es uno de los nudos más universales y antiguos del escultismo. Se caracteriza por ser plano, no lastimar la piel en vendajes y desatarse fácilmente al empujar los extremos.',
    steps: [
      '1. Toma un extremo en cada mano (extremo Izquierdo y extremo Derecho).',
      '2. Cruza el extremo Izquierdo sobre el Derecho y pásalo por debajo.',
      '3. Ahora cruza el extremo Derecho sobre el Izquierdo y pásalo por debajo.',
      '4. Ajusta firmemente halando los dos chicotes y los dos firmes al mismo tiempo.'
    ],
    visualSteps: [
      {
        stepNumber: 1,
        title: 'Preparación de cabos',
        instruction: 'Coloca los dos extremos paralelos frente a frente. Identifica el chicote Izquierdo (Rojo) y Derecho (Azul).',
        callout: 'Ambas cuerdas deben tener el mismo calibre.'
      },
      {
        stepNumber: 2,
        title: 'Primer Cruce',
        instruction: 'Pasa el chicote Izquierdo sobre el Derecho y envuélvelo por debajo, haciendo un medio nudo simple.',
        callout: 'Izquierda sobre Derecha.'
      },
      {
        stepNumber: 3,
        title: 'Segundo Cruce Inverso',
        instruction: 'Toma el chicote que ahora está a la derecha, crúzalo sobre el izquierdo y pásalo por el bucle central.',
        callout: 'Derecha sobre Izquierda.'
      },
      {
        stepNumber: 4,
        title: 'Azocado y Verificación',
        instruction: 'Tensa los dos extremos al mismo tiempo. Debe quedar perfectamente plano y simétrico.',
        callout: 'Los chicotes salen juntos por el mismo lado de cada seno.'
      }
    ],
    multimedia: {
      videoEmbedId: 'tVj461r71Gg',
      videoTitle: 'Cómo hacer el Nudo Rizo o Llano paso a paso (Square Knot)',
      videoChannel: 'Manual de Pionerismo Scout',
      videoDuration: '1:45 min',
      images: [
        {
          url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c0/Reef_knot.svg/640px-Reef_knot.svg.png',
          caption: 'Estructura simétrica del Nudo Rizo azocado'
        }
      ]
    },
    tips: [
      'Regla mnemotécnica: "Izquierda sobre derecha, y luego derecha sobre izquierda".',
      'Nunca lo uses con cuerdas de distinto grosor porque se corre y zafa.'
    ],
    safety: 'No apto para escalar ni suspender personas al vacío.'
  },
  {
    id: 'ballestrinque',
    section: 'nudos',
    name: 'Nudo Ballestrinque',
    categoryTag: 'Anclaje',
    difficulty: 'Básico',
    icon: '🪵',
    summary: 'Sujetar una cuerda a un poste o árbol. Base obligatoria para iniciar y terminar amarres.',
    description: 'El nudo de anclaje por excelencia para pionerismo y construcciones de campamento. Sujeta con firmeza mientras la cuerda mantenga tensión constante.',
    steps: [
      '1. Dale una vuelta a la cuerda alrededor del tronco o madero.',
      '2. Cruza la cuerda sobre el primer tramo formando una "X" visible.',
      '3. Da una segunda vuelta en el mismo sentido e introduce el extremo por debajo del cruce.',
      '4. Tensa fuertemente ambos extremos.'
    ],
    visualSteps: [
      {
        stepNumber: 1,
        title: 'Vuelta al madero',
        instruction: 'Rodea el poste con la cuerda manteniendo el firme con tensión.',
        callout: 'Primera vuelta de apoyo.'
      },
      {
        stepNumber: 2,
        title: 'Cruce diagonal en X',
        instruction: 'Pasa la cuerda por encima del tramo anterior formando una "X" sobre la corteza del leño.',
        callout: 'El cruce es la clave para la mordida.'
      },
      {
        stepNumber: 3,
        title: 'Paso bajo el cruce',
        instruction: 'Da la segunda vuelta e introduce el chicote por debajo de la intersección de la X.',
        callout: 'Pasa por debajo, no por encima.'
      },
      {
        stepNumber: 4,
        title: 'Tensión simétrica',
        instruction: 'Tensa ambos extremos en direcciones opuestas. Quedará bloqueado con gran fricción.',
        callout: 'Rematar con un cote si recibirá gran peso.'
      }
    ],
    multimedia: {
      videoEmbedId: 'aewgmUeH2jg',
      videoTitle: 'Cómo hacer el Nudo Ballestrinque (Clove Hitch) en poste',
      videoChannel: 'Técnicas Scouts Oficiales',
      videoDuration: '2:10 min',
      images: [
        {
          url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Clove_hitch.svg/640px-Clove_hitch.svg.png',
          caption: 'Ballestrinque apretado en poste de madera'
        }
      ]
    },
    tips: [
      'Para mayor seguridad en construcciones que recibirán peso, remátalo con un cote o medio nudo en el firme.',
      'Se puede hacer "al aire" e introducirlo directamente por el extremo del poste.'
    ],
    safety: 'Si el poste es muy resbaloso o la cuerda se afloja, puede soltarse sin un nudo de seguridad adicional.'
  },
  {
    id: 'as_de_guia',
    section: 'nudos',
    name: 'As de Guía (Bowline)',
    categoryTag: 'Salvamento',
    difficulty: 'Intermedio',
    icon: '🛟',
    summary: 'Gaza fija de salvamento que no se corre ni aprieta, sin importar la fuerza o tensión.',
    description: 'Conocido como el "Rey de los nudos". Se utiliza para rescatar personas en barrancos o pozos, amarrar animales o izar cargas pesadas porque nunca se traba.',
    steps: [
      '1. Haz un seno pequeño en la cuerda formando un bucle (el "lago").',
      '2. Pasa el chicote (la "serpiente") saliendo del lago desde abajo hacia arriba.',
      '3. Rodea el firme de la cuerda (el "árbol") por detrás.',
      '4. Introduce la serpiente de vuelta dentro del lago.',
      '5. Sujeta el chicote con el lazo y tira del firme para azocar.'
    ],
    visualSteps: [
      {
        stepNumber: 1,
        title: 'El Lago y el Árbol',
        instruction: 'Forma un bucle cerrado en el firme dejando espacio para la gaza.',
        callout: 'El bucle debe estar en el plano correcto.'
      },
      {
        stepNumber: 2,
        title: 'La Serpiente sale',
        instruction: 'Introduce el chicote saliendo desde abajo a través del bucle.',
        callout: 'De abajo hacia arriba.'
      },
      {
        stepNumber: 3,
        title: 'Rodea el Árbol',
        instruction: 'Pasa el chicote por detrás del firme vertical.',
        callout: 'Abraza el tronco principal.'
      },
      {
        stepNumber: 4,
        title: 'Regreso al Lago',
        instruction: 'Vuelve a introducir el chicote en el bucle original y tira del firme con fuerza.',
        callout: 'La gaza queda inamovible.'
      }
    ],
    multimedia: {
      videoEmbedId: 'hIdsZT_gI_Y',
      videoTitle: 'As de Guía (Bowline) - El rey de los nudos de salvamento',
      videoChannel: 'Pionerismo y Campamento Scout',
      videoDuration: '2:40 min',
      images: [
        {
          url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Bowline.svg/640px-Bowline.svg.png',
          caption: 'As de Guía con gaza de seguridad'
        }
      ]
    },
    tips: [
      'Cuento scout: "La serpiente sale del lago, da la vuelta al árbol y vuelve a entrar en su cueva".'
    ],
    safety: 'En rescate vertical con personas, remata siempre el chicote con un nudo tope (ocho).'
  },
  {
    id: 'amarre_cuadrado',
    section: 'nudos',
    name: 'Amarre Cuadrado',
    categoryTag: 'Construcción',
    difficulty: 'Intermedio',
    icon: '🪵',
    summary: 'Unir dos leños que se cruzan en ángulo recto (90°). Imprescindible para mesas y torres.',
    description: 'El amarre fundamental de construcciones scout. Se aplica cuando los maderos soportan peso vertical directo en ángulo perpendicular.',
    steps: [
      '1. Inicia con un ballestrinque en el madero vertical, justo debajo del cruce.',
      '2. Pasa la cuerda por delante del madero horizontal, por detrás del vertical, y repite 3 o 4 vueltas completas bien ajustadas.',
      '3. Realiza el "ahorcado": da 2 o 3 vueltas apretadas entre los dos maderos para estrangular la cuerda y aumentar la tensión.',
      '4. Remata con un ballestrinque en el madero horizontal.'
    ],
    visualSteps: [
      {
        stepNumber: 1,
        title: 'Inicio con Ballestrinque',
        instruction: 'Ata un ballestrinque firme en el madero vertical justo bajo el madero horizontal.',
        callout: 'Nunca inicies en el horizontal si cargará peso.'
      },
      {
        stepNumber: 2,
        title: 'Vueltas de Abrazo',
        instruction: 'Da 3 a 4 vueltas bien ordenadas alternando arriba y abajo de la intersección.',
        callout: 'Las vueltas deben quedar paralelas, sin montarse.'
      },
      {
        stepNumber: 3,
        title: 'Ahorcado de Tensión',
        instruction: 'Da 2 a 3 vueltas entre ambos maderos (estrangulando las vueltas anteriores con gran fuerza).',
        callout: 'El ahorcado es lo que le da rigidez al amarre.'
      },
      {
        stepNumber: 4,
        title: 'Remate con Ballestrinque',
        instruction: 'Finaliza asegurando con un ballestrinque en el madero horizontal.',
        callout: 'Corta el sobrante o recógelo prolijamente.'
      }
    ],
    multimedia: {
      videoEmbedId: 'C474D9cWwQ8',
      videoTitle: 'Amarre Cuadrado para construcciones de campamento',
      videoChannel: 'Construcciones y Pionerismo Scout',
      videoDuration: '3:50 min',
      images: [
        {
          url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Square_lashing.svg/640px-Square_lashing.svg.png',
          caption: 'Amarre cuadrado con ahorcado de tensión'
        }
      ]
    },
    tips: [
      'Golpea suavemente las vueltas con un mazo de madera para asentar la soga antes del ahorcado.',
      'Las vueltas no deben montarse una sobre otra; deben colocarse ordenadamente en paralelo.'
    ]
  },
  {
    id: 'amarre_diagonal',
    section: 'nudos',
    name: 'Amarre Diagonal',
    categoryTag: 'Construcción',
    difficulty: 'Intermedio',
    icon: '📐',
    summary: 'Unir dos maderos que se cruzan diagonalmente o tienden a separarse por tracción.',
    description: 'Se usa comúnmente en las diagonales de refuerzo (cruces de San Andrés) para evitar que las estructuras oscilen o colapsen por el viento.',
    steps: [
      '1. Inicia con una Vuelta de Braza abrazando ambos maderos por la intersección.',
      '2. Da 3 o 4 vueltas alrededor de un eje diagonal.',
      '3. Cruza la cuerda y da otras 3 o 4 vueltas sobre el eje diagonal contrario formando una "X".',
      '4. Ahorca el amarre dando 2 o 3 vueltas entre los maderos.',
      '5. Remata con un ballestrinque en cualquiera de los maderos.'
    ],
    visualSteps: [
      {
        stepNumber: 1,
        title: 'Vuelta de Braza inicial',
        instruction: 'Abraza la unión de ambos troncos con una vuelta de braza o leñador bien ceñida.',
        callout: 'Aproxima los dos leños.'
      },
      {
        stepNumber: 2,
        title: 'Diagonal 1',
        instruction: 'Da 3 a 4 vueltas en el primer sentido diagonal.',
        callout: 'Tensa en cada vuelta.'
      },
      {
        stepNumber: 3,
        title: 'Diagonal 2',
        instruction: 'Cruza a 90° y da 3 a 4 vueltas en la diagonal opuesta formando una X.',
        callout: 'Simetría en ambos ejes.'
      },
      {
        stepNumber: 4,
        title: 'Ahorcado y Remate',
        instruction: 'Ahorca con 2 vueltas entre maderos y remata con ballestrinque.',
        callout: 'Garantiza resistencia lateral.'
      }
    ],
    multimedia: {
      videoEmbedId: 'N33W1393n0E',
      videoTitle: 'Amarre Diagonal con vuelta de braza y ahorcado',
      videoChannel: 'Técnicas de Pionerismo Scout',
      videoDuration: '3:15 min',
      images: [
        {
          url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/26/Diagonal_lashing.svg/640px-Diagonal_lashing.svg.png',
          caption: 'Amarre diagonal con vueltas cruzadas'
        }
      ]
    },
    tips: [
      'La vuelta de braza permite acercar dos leños separados antes de iniciar las vueltas diagonales.'
    ]
  },
  {
    id: 'amarre_tripode',
    section: 'nudos',
    name: 'Amarre Trípode o en Ocho',
    categoryTag: 'Construcción',
    difficulty: 'Avanzado',
    icon: '⛺',
    summary: 'Unir tres maderos para crear la base de un trípode (soporte de lavamanos, lámparas, astas).',
    description: 'Estructura autoportante esencial de campamento. Se amarran los tres maderos juntos en el suelo y luego se abren las patas en triángulo.',
    steps: [
      '1. Coloca los tres maderos en el suelo en paralelo, con el leño central invertido (apuntando en sentido opuesto).',
      '2. Inicia con un ballestrinque en uno de los maderos exteriores.',
      '3. Pasa la cuerda en forma de "ocho" (por encima y por debajo) entre los tres leños por 4 a 5 pasadas.',
      '4. Da vueltas de ahorcado entre los espacios de los maderos sin apretar en exceso (para permitir que las patas se abran).',
      '5. Remata con un ballestrinque y levanta el trípode abriendo sus tres patas.'
    ],
    visualSteps: [
      {
        stepNumber: 1,
        title: 'Alineación de maderos',
        instruction: 'Coloca los 3 maderos juntos. Invierte el central para compensar el grosor.',
        callout: 'Deja una separación de 1 cm entre leños.'
      },
      {
        stepNumber: 2,
        title: 'Tejido en Ocho',
        instruction: 'Teje la cuerda pasando por arriba y por abajo de cada leño de forma continua.',
        callout: '4 a 5 pasadas sin estrangular aún.'
      },
      {
        stepNumber: 3,
        title: 'Ahorcado moderado',
        instruction: 'Pasa la cuerda en los dos intersticios para comprimir el tejido.',
        callout: 'No ahorques con demasiada fuerza o no abrirá.'
      },
      {
        stepNumber: 4,
        title: 'Apertura de patas',
        instruction: 'Remata con ballestrinque, pon de pie el trípode y abre las 3 patas formando la base triangular.',
        callout: 'Estructura rígida y autoportante.'
      }
    ],
    multimedia: {
      videoEmbedId: '1a1lJb6LpZc',
      videoTitle: 'Amarre de Trípode (Figura en 8) para campamento scout',
      videoChannel: 'Campismo Scout',
      videoDuration: '3:30 min'
    },
    tips: [
      'No aprietes el ahorcado demasiado fuerte, de lo contrario las patas no podrán abrirse y la soga se romperá por fricción.'
    ]
  },
  {
    id: 'nudo_ocho',
    section: 'nudos',
    name: 'Nudo en Ocho (Firme y Gaza)',
    categoryTag: 'Seguridad',
    difficulty: 'Básico',
    icon: '♾️',
    summary: 'Nudo de tope para evitar que una cuerda se escape de una polea, o gaza de escalada.',
    description: 'Mucho más fácil de desatar que el nudo simple después de haber soportado gran tensión. Estándar internacional en escalada y rappel.',
    steps: [
      '1. Haz un seno con el extremo de la cuerda.',
      '2. Pasa el chicote por detrás del firme dando una vuelta de 360 grados.',
      '3. Introduce el chicote por el seno delantero formando la silueta de un número 8.',
      '4. Tensa firmemente.'
    ],
    multimedia: {
      videoEmbedId: '84K2hZ6a1F8',
      videoTitle: 'Nudo en Ocho y Ocho Doble para montañismo y rescate',
      videoChannel: 'Seguridad Scout',
      videoDuration: '2:05 min',
      images: [
        {
          url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Figure_eight_knot.svg/640px-Figure_eight_knot.svg.png',
          caption: 'Nudo en ocho clásico'
        }
      ]
    },
    tips: [
      'Para encordarse en arnés, se hace en su versión "doble ocho por chicote".'
    ]
  },
  {
    id: 'vuelta_escota',
    section: 'nudos',
    name: 'Vuelta de Escota',
    categoryTag: 'Unión',
    difficulty: 'Básico',
    icon: '🧵',
    summary: 'Unir dos cuerdas de diferente grosor o material sin que se deslicen.',
    description: 'Esencial para izar banderas en astas o empalmar cabos cuando una soga es más gruesa que la otra.',
    steps: [
      '1. Haz un seno o bucle con la cuerda más gruesa.',
      '2. Pasa la cuerda más delgada a través del seno desde abajo hacia arriba.',
      '3. Rodea por detrás el seno de la cuerda gruesa.',
      '4. Pasa la cuerda delgada por debajo de sí misma (sin entrar de nuevo al seno).',
      '5. Tensa firmemente.'
    ],
    multimedia: {
      videoEmbedId: 'x3eqo7V2y8c',
      videoTitle: 'Vuelta de Escota: Unión de cuerdas de diferente grosor',
      videoChannel: 'Cabuyería Scout',
      videoDuration: '1:55 min',
      images: [
        {
          url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e9/Sheet_bend.svg/640px-Sheet_bend.svg.png',
          caption: 'Vuelta de escota con cabo grueso y fino'
        }
      ]
    },
    tips: [
      'Si la diferencia de grosores es muy grande, da una segunda vuelta para hacer la "Vuelta de Escota Doble".'
    ]
  },
  {
    id: 'vuelta_braza',
    section: 'nudos',
    name: 'Vuelta de Braza o Leñador',
    categoryTag: 'Arrastre',
    difficulty: 'Básico',
    icon: '🌲',
    summary: 'Arrastrar troncos pesados en el bosque e inicio clásico del amarre diagonal.',
    description: 'Un nudo que se aprieta proporcionalmente al peso arrastrado sobre corteza rugosa. Muy seguro y de rápido desmontaje.',
    steps: [
      '1. Rodea el tronco con la cuerda.',
      '2. Pasa el chicote alrededor del firme.',
      '3. Retuerce el chicote sobre sí mismo alrededor del lazo al menos tres o cuatro vueltas.',
      '4. Tensa el firme para que las vueltas muerdan contra el tronco.'
    ],
    multimedia: {
      videoEmbedId: 'a37u1B8H2vE',
      videoTitle: 'Vuelta de Braza o Leñador para arrastrar troncos',
      videoChannel: 'Técnicas de Pionerismo',
      videoDuration: '1:40 min'
    },
    tips: [
      'Acompaña con un cote adelante si vas a arrastrar el tronco a largas distancias para que no cabecee.'
    ]
  },
  {
    id: 'margarita',
    section: 'nudos',
    name: 'Nudo Margarita',
    categoryTag: 'Mantenimiento',
    difficulty: 'Intermedio',
    icon: '🌼',
    summary: 'Acortar una soga demasiado larga o aislar y proteger un tramo desgastado sin cortarlo.',
    description: 'Permite salvar una cuerda que tiene un tramo dañado o con fibras rotas, sometiendo a tensión únicamente los extremos sanos.',
    steps: [
      '1. Haz tres senos o dobleces consecutivos en la cuerda (dejando la parte rota en el seno del medio).',
      '2. Haz un cote o bucle corredizo en el extremo izquierdo y pásalo sobre el seno izquierdo.',
      '3. Haz un cote en el extremo derecho y pásalo sobre el seno derecho.',
      '4. Tira de los dos firmes principales. El nudo se sostiene por la tensión de ambos lados.'
    ],
    multimedia: {
      videoEmbedId: 'lU6XmQxYxN8',
      videoTitle: 'Nudo Margarita: Acortar o proteger una cuerda deteriorada',
      videoChannel: 'Cabuyería Scout',
      videoDuration: '2:15 min'
    },
    safety: 'El nudo margarita solo se sostiene bajo tensión constante. Si la cuerda queda floja se deshace.'
  },

  // ==========================================
  // 2. FOGATAS Y FUEGO SCOUT
  // ==========================================
  {
    id: 'fogata_piramide',
    section: 'fogatas',
    name: 'Fogata Pirámide o Tipí',
    categoryTag: 'Cocina y Calor',
    difficulty: 'Básico',
    icon: '🔥',
    summary: 'La fogata más clásica y fácil de encender. Llama alta y calor concentrado.',
    description: 'Es la reina de las fogatas de campamento. Se construye en forma de cono o tienda indígena india. El aire entra por la base y alimenta la llama ascendente.',
    steps: [
      '1. Limpia un círculo de 2 metros alrededor, retirando hojas secas hasta llegar a tierra mineral.',
      '2. Coloca en el centro una bola de yesca seca (hojarasca fina, viruta o paja seca).',
      '3. Clava una estaca inclinada o apoya ramitas delgadas en forma de cono alrededor de la yesca, dejando una pequeña "puerta" orientada hacia el viento.',
      '4. Coloca una segunda capa con leña más gruesa apoyada en el cono.',
      '5. Enciende la yesca por la puerta inferior con un solo fósforo.'
    ],
    visualSteps: [
      {
        stepNumber: 1,
        title: 'Centro de Yesca',
        instruction: 'Coloca un nido de yesca fina, seca y aireada en el suelo limpio.',
        callout: 'No compactar la yesca; necesita oxígeno.'
      },
      {
        stepNumber: 2,
        title: 'Cono de Ramitas Finas',
        instruction: 'Construye un pequeño tipi con palitos del grosor de un fósforo.',
        callout: 'Deja la puerta abierta hacia el viento.'
      },
      {
        stepNumber: 3,
        title: 'Capa de Leña Mediana',
        instruction: 'Apoya leños del grosor de un pulgar siguiendo la misma inclinación.',
        callout: 'Mantén la forma cónica.'
      },
      {
        stepNumber: 4,
        title: 'Encendido y Combustión',
        instruction: 'Acerca el fósforo a la yesca desde la puerta inferior. El fuego sube solo.',
        callout: 'Produce excelente brasa para cocinar.'
      }
    ],
    multimedia: {
      videoEmbedId: '2tU8e6EwXvE',
      videoTitle: 'Cómo encender una Fogata Pirámide o Tipí con un fósforo',
      videoChannel: 'Supervivencia y Campismo Scout',
      videoDuration: '4:10 min',
      images: [
        {
          url: 'https://images.unsplash.com/photo-1510312305653-8ed496efae75?w=800&auto=format&fit=crop',
          caption: 'Fogata pirámide en campamento al atardecer'
        }
      ]
    },
    tips: [
      'Ten preparada toda la leña que vas a usar ANTES de encender el fósforo.',
      'No amontones leña demasiado gruesa al principio o ahogarás el oxígeno.'
    ]
  },
  {
    id: 'fogata_polinesia',
    section: 'fogatas',
    name: 'Fogata Polinesia o de Pozo',
    categoryTag: 'Viento Fuerte',
    difficulty: 'Intermedio',
    icon: '🕳️',
    summary: 'Fuego oculto en un hoyo. Ideal para cocinar en días con mucho viento sin riesgo de chispas.',
    description: 'Muy utilizada en zonas costeras o planicies con vientos fuertes. Al estar bajo el nivel del suelo, el viento no dispersa las llamas ni apaga el fogón.',
    steps: [
      '1. Cava un pozo cónico de 40 a 50 cm de profundidad y unos 40 cm de ancho en la boca.',
      '2. Reviste las paredes internas del hoyo con leños o piedras verticales.',
      '3. En el fondo, enciende un pequeño fuego pirámide.',
      '4. Coloca los leños parados apoyados en las paredes del pozo hacia el centro.',
      '5. Coloca los sartenes u ollas apoyados directamente sobre la boca del pozo.'
    ],
    multimedia: {
      videoEmbedId: '4k8l1F8u6Xw',
      videoTitle: 'Fogata Polinesia o de Pozo: Cocina sin humo en campamento',
      videoChannel: 'Cocina y Fuego Scout',
      videoDuration: '3:25 min'
    },
    tips: [
      'Produce brasas concentradas con muy poca leña.',
      'Al terminar el campamento, se apaga con agua y se cubre con la misma tierra retirada, dejando el lugar idéntico.'
    ]
  },
  {
    id: 'fogata_pagoda',
    section: 'fogatas',
    name: 'Fogata Pagoda o Altar',
    categoryTag: 'Fogón de Consejo',
    difficulty: 'Intermedio',
    icon: '🪵',
    summary: 'Estructura cúbica en capas alternadas. Fuego duradero de gran iluminación para fogones ceremoniales.',
    description: 'Se arma colocando leños gruesos en pares paralelos formando un cuadrado, alternando la dirección en cada piso y reduciendo el tamaño hacia la cima.',
    steps: [
      '1. Coloca en la base dos leños gruesos y paralelos separados unos 30 cm.',
      '2. Coloca dos leños perpendiculares sobre los primeros formando un cuadrado.',
      '3. Rellena el centro del primer piso con yesca y ramas medianas.',
      '4. Construye 3 o 4 pisos más achicando ligeramente el cuadrado en cada piso.',
      '5. Enciende en la cima o por la base.'
    ],
    multimedia: {
      videoEmbedId: '2tU8e6EwXvE',
      videoTitle: 'Fogata Pagoda para fuegos de campamento y ceremonias',
      videoChannel: 'Tradición Scout',
      videoDuration: '3:40 min'
    },
    tips: [
      'Es la fogata perfecta para la noche de fogón de campamento ya que no requiere recargar leña constantemente.'
    ]
  },
  {
    id: 'fogata_reflector',
    section: 'fogatas',
    name: 'Fogata de Reflector',
    categoryTag: 'Calor Nocturno',
    difficulty: 'Intermedio',
    icon: '🧱',
    summary: 'Refleja el calor hacia tu tienda o vivac durante noches de frío extremo.',
    description: 'Consiste en una fogata con una pared trasera de leños verdes o piedras que rebota la radiación térmica hacia el interior del refugio.',
    steps: [
      '1. Construye una pared vertical o inclinada de leños verdes apilados entre dos estacas a 1 metro de tu refugio.',
      '2. Construye una fogata pirámide delante de la pared.',
      '3. El calor rebotará en la pared e ingresará en tu vivac manteniéndote abrigado.'
    ],
    multimedia: {
      videoEmbedId: '2tU8e6EwXvE',
      videoTitle: 'Fogata de Reflector para noches frías de supervivencia',
      videoChannel: 'Supervivencia Scout',
      videoDuration: '3:00 min'
    },
    safety: 'Nunca uses piedras de río para el reflector ya que la humedad interna las hace explotar con el calor.'
  },

  // ==========================================
  // 3. LENGUA DE SEÑAS SCOUT (INCLUSIÓN)
  // ==========================================
  {
    id: 'senas_alfabeto',
    section: 'senas',
    name: 'Alfabeto Dactilológico (A a Z)',
    categoryTag: 'Dactilológico',
    difficulty: 'Básico',
    icon: '🔤',
    summary: 'Deletreo manual letra por letra para comunicarse con personas sordas en actividades scouts.',
    description: 'El alfabeto manual permite deletrear nombres propios, lugares o palabras que no tienen una seña única. Debe realizarse con la mano dominante a la altura del pecho sin mover el brazo excesivamente.',
    steps: [
      '• A: Puño cerrado con el pulgar apoyado contra el costado del índice.',
      '• B: Cuatro dedos estirados juntos hacia arriba, pulgar doblado sobre la palma.',
      '• C: Todos los dedos curvados formando una letra "C" de perfil.',
      '• D: Índice extendido hacia arriba; los otros dedos tocan el pulgar formando un círculo.',
      '• E: Dedos curvados tocando la punta del pulgar.',
      '• F: Índice y pulgar tocándose por las puntas en círculo; los otros tres dedos estirados.',
      '• G: Índice y pulgar extendidos hacia un lado en paralelo.',
      '• H: Índice y medio juntos extendidos horizontalmente hacia un lado.',
      '• I: Meñique levantado; el resto de los dedos cerrados en puño.',
      '• L: Índice levantado y pulgar horizontal formando una "L".',
      '• M: Tres dedos (índice, medio, anular) doblados sobre el pulgar.',
      '• N: Dos dedos (índice y medio) doblados sobre el pulgar.',
      '• O: Todos los dedos curvados tocando el pulgar en forma de "O".',
      '• P: Dedo medio horizontal, índice hacia abajo y pulgar apoyado.',
      '• R: Índice y medio cruzados uno sobre el otro.',
      '• S: Puño cerrado con el pulgar cruzado por delante de los cuatro dedos.',
      '• T: Pulgar asomando entre el dedo índice y el dedo medio.',
      '• U: Índice y medio levantados juntos y estirados.',
      '• V: Índice y medio levantados separados en forma de "V".',
      '• W: Tres dedos (índice, medio, anular) levantados y separados.',
      '• Y: Pulgar y meñique extendidos (los demás dedos cerrados).'
    ],
    visualSteps: [
      {
        stepNumber: 1,
        title: 'Postura de la Mano Dominante',
        instruction: 'Ubica tu mano derecha (o izquierda si eres zurdo) a la altura del pecho.',
        callout: 'Mantén la muñeca relajada y la palma visible hacia el interlocutor.'
      },
      {
        stepNumber: 2,
        title: 'Vocales Básicas (A, E, I, O, U)',
        instruction: 'A (puño con pulgar al lado), E (garras al pulgar), I (meñique alzado), O (círculo completo), U (dos dedos juntos arriba).',
        callout: 'Practica deletreando tu nombre de scout.'
      },
      {
        stepNumber: 3,
        title: 'Letras de Silueta Clara (B, C, L, V, W)',
        instruction: 'L forma una L con pulgar e índice, V forma una V con índice y medio, W suma el anular.',
        callout: 'La claridad es más importante que la velocidad.'
      }
    ],
    multimedia: {
      videoEmbedId: 'P1p5xX3g7yU',
      videoTitle: 'Alfabeto Dactilológico en Lengua de Señas e Inclusión Scout',
      videoChannel: 'Inclusión y Diversidad Scout',
      videoDuration: '5:00 min'
    },
    tips: [
      'Mantén la mano quieta en un solo punto del espacio; no muevas la mano hacia los lados mientras deletreas.',
      'No mires tu propia mano mientras haces las señas; mira a los ojos de la persona.'
    ]
  },
  {
    id: 'senas_saludo_scout',
    section: 'senas',
    name: 'Saludo y Seña Scout en Señas',
    categoryTag: 'Identidad Scout',
    difficulty: 'Básico',
    icon: '⚜️',
    summary: 'Cómo presentarse y compartir el espíritu scout con personas con discapacidad auditiva.',
    description: 'Integra los tres principios del escultismo con la seña dactilar tradicional scout adaptada a la comunidad sorda.',
    steps: [
      '1. Seña Scout: Mano derecha a la altura de la sien con los tres dedos extendidos (índice, medio, anular) y el pulgar sujetando la uña del meñique.',
      '2. Significado en señas: Los tres dedos representan los deberes hacia Dios/Patria, el Prójimo y la Ley Scout.',
      '3. El pulgar sobre el meñique representa: "El fuerte protege al débil".',
      '4. Mano izquierda estrechada: Se extiende la mano izquierda abierta como símbolo de hermandad mundial que sale del corazón.'
    ],
    visualSteps: [
      {
        stepNumber: 1,
        title: 'Los Tres Dedos Elevados',
        instruction: 'Levanta los tres dedos centrales bien rectos.',
        callout: 'Representan la Promesa Scout.'
      },
      {
        stepNumber: 2,
        title: 'El Abrazo del Pulgar',
        instruction: 'Dobla el pulgar cubriendo el meñique.',
        callout: 'El mayor protege al menor.'
      },
      {
        stepNumber: 3,
        title: 'Posición a la Sien',
        instruction: 'Acerca la mano a la ceja/sien derecha.',
        callout: 'Saludo formal en formaciones.'
      }
    ],
    multimedia: {
      videoEmbedId: 'P1p5xX3g7yU',
      videoTitle: 'Seña y Saludo Scout: Historia y significado',
      videoChannel: 'Cultura Scout',
      videoDuration: '3:10 min'
    },
    tips: [
      'Extiende siempre la mano izquierda al saludar a otro scout o scouter.'
    ]
  },

  // ==========================================
  // 4. PISTAS Y RASTREO SCOUT
  // ==========================================
  {
    id: 'pista_direccion',
    section: 'pistas',
    name: 'Seguir Esta Dirección',
    categoryTag: 'Direccional',
    difficulty: 'Básico',
    icon: '➜',
    summary: 'Flecha trazada en tierra, con ramas o piedras indicando hacia dónde avanzó la patrulla.',
    description: 'La señal básica de rastreo en marchas scout. Se coloca en cruces de caminos para guiar a los rastreadores o a la patrulla que viene detrás.',
    steps: [
      '1. Trazo en suelo: Una flecha clara dibujada con una vara sobre la tierra blanda a la derecha del sendero.',
      '2. Con piedras: Una piedra grande en la punta y piedras más pequeñas en la cola.',
      '3. Con ramas: Una rama larga con dos ramitas inclinadas en el extremo formando la punta de lanza.',
      '4. Nunca la coloques en el medio del camino donde el ganado o transeúntes puedan pisarla.'
    ],
    visualSteps: [
      {
        stepNumber: 1,
        title: 'Cuerpo de la Flecha',
        instruction: 'Coloca una rama recta de 30 a 40 cm en dirección de la marcha.',
        callout: 'Siempre al costado derecho del sendero.'
      },
      {
        stepNumber: 2,
        title: 'Punta Direccional',
        instruction: 'Coloca dos ramitas o piedras formando una "V" en la punta.',
        callout: 'Apunta con exactitud al cruce que deben tomar.'
      }
    ],
    multimedia: {
      videoEmbedId: '5wX9q7l8k1E',
      videoTitle: 'Signos de Pista y Rastreo Scout en la naturaleza',
      videoChannel: 'Aire Libre y Rastreo Scout',
      videoDuration: '3:45 min'
    },
    tips: [
      'El código scout exige que la última patrulla en pasar BORRE todas las señales para no dejar marcas artificiales en la naturaleza.'
    ]
  },
  {
    id: 'pista_peligro',
    section: 'pistas',
    name: 'Peligro o Atención Inmediata',
    categoryTag: 'Seguridad',
    difficulty: 'Básico',
    icon: '⚠️',
    summary: 'Tres piedras apiladas en columna o tres estacas en trípode. Alerta de riesgo inminente.',
    description: 'Código universal de alerta en el bosque. Avisa de derrumbes, colmenas de abejas, serpientes, pozos ocultos o acantilados cercanos.',
    steps: [
      '1. Tres piedras colocadas una encima de la otra formando una pirámide vertical.',
      '2. Si no hay piedras, tres ramas clavadas en el suelo atadas en la punta.',
      '3. Si hay un número debajo, indica los metros de distancia al peligro (ej. "3 piedras + 20" = peligro a 20 metros).'
    ],
    multimedia: {
      videoEmbedId: '5wX9q7l8k1E',
      videoTitle: 'Signos de Peligro y Alerta en Excursiones Scout',
      videoChannel: 'Seguridad Scout',
      videoDuration: '2:50 min'
    },
    tips: [
      'Al ver esta señal, toda la patrulla debe detenerse inmediatamente y explorar el terreno con cautela.'
    ]
  },

  // ==========================================
  // 5. PRIMEROS AUXILIOS SCOUT
  // ==========================================
  {
    id: 'auxilios_pas',
    section: 'primeros_auxilios',
    name: 'Protocolo P.A.S. de Emergencias',
    categoryTag: 'Emergencia',
    difficulty: 'Esencial',
    icon: '🚨',
    summary: 'Proteger, Avisar y Socorrer. La regla de oro en cualquier accidente de campamento.',
    description: 'Secuencia estricta y universal que todo scout debe aplicar ante una persona herida antes de intentar manipular al paciente.',
    steps: [
      '1. PROTEGER: Asegura el lugar del accidente. Si hay fuego, cables caídos o tránsito, elimina el peligro para no convertirte en una segunda víctima.',
      '2. AVISAR: Notifica a los scouters, jefatura o llama a los servicios de emergencia (911 o número local). Da ubicación exacta, qué ocurrió y cuántos heridos hay.',
      '3. SOCORRER: Evalúa al herido (consciencia, respiración, pulso, hemorragias graves). Aplica primeros auxilios dentro de tus conocimientos sin improvisar maniobras arriesgadas.'
    ],
    multimedia: {
      videoEmbedId: 'aLwJ8FvB4g0',
      videoTitle: 'Protocolo P.A.S. en Primeros Auxilios de Emergencia',
      videoChannel: 'Cruz Roja / Socorrismo Scout',
      videoDuration: '3:30 min'
    },
    tips: [
      'Conserva la calma: el pánico de un socorrista agrava el estado de shock del herido.'
    ],
    safety: 'Nunca muevas a una persona que cayó de altura o sufrió golpe en la columna salvo que corra riesgo de fuego inminente.'
  },
  {
    id: 'auxilios_panuelo',
    section: 'primeros_auxilios',
    name: 'Vendajes con Pañuelo Scout',
    categoryTag: 'Inmovilización',
    difficulty: 'Básico',
    icon: '🧣',
    summary: 'Usar tu pañuelo de grupo o pañoleta triangular como cabestrillo o apósito compresivo.',
    description: 'El pañuelo scout es el elemento de primeros auxilios más versátil en el bosque. Doblado en triángulo o corbata sirve para inmovilizar miembros rotos.',
    steps: [
      '1. Cabestrillo para brazo o muñeca: Coloca la base del pañuelo bajo el antebrazo lesionado.',
      '2. Lleva una punta sobre el hombro sano y la otra sobre el hombro lesionado.',
      '3. Ata ambas puntas detrás del cuello con un nudo rizo (llano) y coloca un acolchado en la nuca para que no roce.',
      '4. Dobla el vértice suelto en el codo hacia adelante y fíjalo con un imperdible o nudo.',
      '5. Asegúrate de que los dedos queden ligeramente asomados para vigilar que no se pongan azules o fríos.'
    ],
    visualSteps: [
      {
        stepNumber: 1,
        title: 'Despliegue Triangular',
        instruction: 'Abre el pañuelo scout en triángulo con el vértice hacia el codo lesionado.',
        callout: 'La punta larga va sobre el hombro contrario.'
      },
      {
        stepNumber: 2,
        title: 'Elevación a 90 Grados',
        instruction: 'Flexiona el antebrazo del paciente en ángulo recto hacia el pecho.',
        callout: 'Mano ligeramente más alta que el codo.'
      },
      {
        stepNumber: 3,
        title: 'Nudo Llano en la Nuca',
        instruction: 'Ata los dos extremos en el costado del cuello con un Nudo Rizo.',
        callout: 'Nunca sobre la columna cervical.'
      }
    ],
    multimedia: {
      videoEmbedId: '2w8x1L6p0F8',
      videoTitle: 'Primeros Auxilios con Pañuelo Scout: Cabestrillos e inmovilizaciones',
      videoChannel: 'Socorrismo y Salud Scout',
      videoDuration: '4:30 min',
      images: [
        {
          url: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=800&auto=format&fit=crop',
          caption: 'Inmovilización y vendaje de brazo en primeros auxilios'
        }
      ]
    },
    tips: [
      'Usa siempre un nudo rizo (llano) para atar los vendajes; nunca se clava en la piel del paciente.'
    ]
  },
  {
    id: 'auxilios_quemaduras',
    section: 'primeros_auxilios',
    name: 'Quemaduras de Fogata y Ollas',
    categoryTag: 'Emergencia',
    difficulty: 'Esencial',
    icon: '🔥',
    summary: 'Enfriar con agua corriente limpia por 15 a 20 minutos de inmediato.',
    description: 'Las quemaduras de primer y segundo grado son el accidente más frecuente cerca de cocinas de campamento.',
    steps: [
      '1. Aparta a la persona de la fuente de calor.',
      '2. Vierte abundante agua limpia a temperatura ambiente (no helada) de manera continua sobre la zona por al menos 15 minutos.',
      '3. Retira suavemente anillos, relojes o prendas antes de que la zona se inflame (si la tela está pegada a la piel, NO la arranques).',
      '4. Cubre con una gasa estéril humedecida y traslada al médico.'
    ],
    multimedia: {
      videoEmbedId: 'aLwJ8FvB4g0',
      videoTitle: 'Tratamiento de Quemaduras en Campamentos de Verano',
      videoChannel: 'Salud y Prevención',
      videoDuration: '3:15 min'
    },
    tips: [
      'NUNCA apliques mantequilla, aceite, pasta dental, café ni hielo directo: infectan y profundizan la lesión térmica.'
    ],
    safety: 'Nunca revientes las ampollas; son la barrera natural del cuerpo contra las bacterias.'
  },
  {
    id: 'auxilios_deshidratacion',
    section: 'primeros_auxilios',
    name: 'Insolación y Golpe de Calor',
    categoryTag: 'Excursionismo',
    difficulty: 'Intermedio',
    icon: '☀️',
    summary: 'Traslado urgente a la sombra, enfriamiento corporal e hidratación con suero oral.',
    description: 'Producido por largas caminatas bajo sol intenso, humedad alta y falta de hidratación adecuada en marchas de patrulla.',
    steps: [
      '1. Lleva al scout de inmediato a un lugar con sombra ventilada.',
      '2. Acuéstalo boca arriba y eleva sus piernas unos 30 cm para favorecer el retorno venoso al cerebro.',
      '3. Afloja pañuelo, correas y calzado ajustado.',
      '4. Aplica paños húmedos frescos en la frente, nuca, axilas e ingles.',
      '5. Si está consciente, dale a beber agua fresca con pizca de sal y azúcar (suero oral) a pequeños sorbos pausados.'
    ],
    multimedia: {
      videoEmbedId: 'aLwJ8FvB4g0',
      videoTitle: 'Insolación y Golpe de Calor: Síntomas y Manejo de Emergencia',
      videoChannel: 'Medicina de Montaña',
      videoDuration: '3:40 min'
    },
    tips: [
      'Si el scout pierde la conciencia, colócalo en Posición Lateral de Seguridad (PLS) y busca traslado de urgencia.'
    ]
  },
  {
    id: 'auxilios_rice',
    section: 'primeros_auxilios',
    name: 'Esguinces y Torceduras (Protocolo R.I.C.E.)',
    categoryTag: 'Traumatismos',
    difficulty: 'Intermedio',
    icon: '🦶',
    summary: 'Reposo, Hielo indirecto, Compresión y Elevación para tobillos y rodillas.',
    description: 'Regla internacional mnemotécnica R.I.C.E. para tratar torceduras de tobillo producidas en senderos pedregosos o desniveles.',
    steps: [
      '1. R (Rest / Reposo): Detén la caminata y no apoyes el pie afectado.',
      '2. I (Ice / Frío): Aplica compresas frías o una bolsa con agua fría/hielo envuelta en un paño durante 15 minutos (nunca hielo directo a la piel).',
      '3. C (Compression / Compresión): Realiza un vendaje compresivo firme pero no sofocante con tu pañuelo scout o venda elástica.',
      '4. E (Elevation / Elevación): Mantén la pierna elevada por encima del nivel del corazón para reducir la hinchazón.'
    ],
    multimedia: {
      videoEmbedId: 'aLwJ8FvB4g0',
      videoTitle: 'Protocolo R.I.C.E. para Torceduras y Esguinces de Tobillo',
      videoChannel: 'Primeros Auxilios Scout',
      videoDuration: '3:20 min'
    },
    tips: [
      'No quites la bota bruscamente en pleno sendero si aún faltan pocos metros para llegar a la base, ya que el tobillo se hinchará al instante.'
    ]
  }
];

export default function NudosManualScreen({ navigation }: any) {
  const { isDarkMode, theme, primaryColor } = useTheme();
  const { user } = useAuth();

  const [activeSection, setActiveSection] = useState<ManualSectionKey>('nudos');
  const [search, setSearch] = useState('');
  const [selectedItem, setSelectedItem] = useState<ManualItem | null>(null);

  // Tabs internas del modal de técnica: Escrito | Visual | Multimedia
  const [modalTab, setModalTab] = useState<ModalTabKey>('escrito');
  const [visualStepIndex, setVisualStepIndex] = useState<number>(0);
  const [isPlayingWebVideo, setIsPlayingWebVideo] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Checklist de pasos practicados por el scout
  const [checkedSteps, setCheckedSteps] = useState<Record<string, boolean>>({});

  const toggleStepChecked = (itemKey: string, stepIdx: number) => {
    const key = `${itemKey}_step_${stepIdx}`;
    setCheckedSteps(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Soporte universal para gestos de retroceso en Android, iOS y PWA
  useModalBackHandler(selectedItem !== null, () => {
    if (lightboxImage) {
      setLightboxImage(null);
    } else {
      setSelectedItem(null);
      setIsPlayingWebVideo(false);
      setVisualStepIndex(0);
      setModalTab('escrito');
    }
  });

  const handleOpenItem = (item: ManualItem) => {
    setSelectedItem(item);
    setModalTab('escrito');
    setVisualStepIndex(0);
    setIsPlayingWebVideo(false);
  };

  const handleOpenVideoExternal = (embedId?: string, queryTitle?: string) => {
    const targetUrl = embedId
      ? `https://www.youtube.com/watch?v=${embedId}`
      : `https://www.youtube.com/results?search_query=scout+${encodeURIComponent(queryTitle || 'nudos y amarres')}`;
    
    Linking.openURL(targetUrl).catch(err => {
      console.warn('No se pudo abrir el enlace de video:', err);
    });
  };

  const SECTIONS_CONFIG: { id: ManualSectionKey; label: string; icon: string }[] = [
    { id: 'nudos', label: 'Nudos y Amarres', icon: '🪢' },
    { id: 'fogatas', label: 'Fogatas y Fuego', icon: '🔥' },
    { id: 'senas', label: 'Lengua de Señas', icon: '🤟' },
    { id: 'pistas', label: 'Pistas y Rastreo', icon: '🧭' },
    { id: 'primeros_auxilios', label: 'Primeros Auxilios', icon: '🩹' },
  ];

  const filteredItems = MANUALS_DATA.filter(item => {
    const matchesSection = item.section === activeSection;
    if (!matchesSection) return false;

    if (!search.trim()) return true;
    const query = search.toLowerCase();
    return (
      item.name.toLowerCase().includes(query) ||
      item.summary.toLowerCase().includes(query) ||
      item.categoryTag.toLowerCase().includes(query) ||
      item.description.toLowerCase().includes(query)
    );
  });

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      
      {/* CABECERA PRINCIPAL */}
      <View style={[styles.header, { backgroundColor: isDarkMode ? '#121214' : 'white', borderColor: theme.border }]}>
        <TouchableOpacity
          style={{
            alignSelf: 'flex-start',
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 5,
            paddingHorizontal: 10,
            borderRadius: 8,
            backgroundColor: isDarkMode ? '#27272a' : '#f1f5f9',
            marginBottom: 10,
            gap: 6
          }}
          onPress={() => navigateBackOrHome(navigation, user?.role)}
        >
          <ArrowLeft size={16} color={theme.text} />
          <Text style={{ fontSize: 12, fontWeight: 'bold', color: theme.text }}>Volver</Text>
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <View style={[styles.badgePill, { backgroundColor: '#16a34a15', borderColor: '#16a34a' }]}>
            <WifiOff size={11} color="#16a34a" />
            <Text style={[styles.badgePillText, { color: '#16a34a' }]}>100% OFFLINE DISPONIBLE</Text>
          </View>
          <View style={[styles.badgePill, { backgroundColor: '#ef444415', borderColor: '#ef4444' }]}>
            <Video size={11} color="#ef4444" />
            <Text style={[styles.badgePillText, { color: '#ef4444' }]}>VIDEOS & MULTIMEDIA</Text>
          </View>
        </View>

        <Text style={[styles.title, { color: theme.text, marginTop: 4 }]}>Manuales y Técnicas Scout</Text>
        <Text style={[styles.subTitle, { color: theme.subText }]}>
          Guías paso a paso escritas y visuales para campamento, más videos y galería técnica.
        </Text>

        {/* BUSCADOR UNIVERSAL */}
        <View style={[styles.searchBox, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
          <Search size={16} color={isDarkMode ? '#71717a' : '#a1a1aa'} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Buscar por técnica, nudo, fogata, seña o auxilio..."
            placeholderTextColor={isDarkMode ? '#71717a' : '#a1a1aa'}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <X size={16} color={theme.subText} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* SUBMENÚ DE SECCIONES (TABS HORIZONTALES) */}
      <View style={{ borderBottomWidth: 1, borderBottomColor: theme.border, backgroundColor: isDarkMode ? '#18181b' : '#fafafa' }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sectionTabsContainer}>
          {SECTIONS_CONFIG.map(sec => {
            const isActive = activeSection === sec.id;
            return (
              <TouchableOpacity
                key={sec.id}
                style={[
                  styles.sectionTabBtn,
                  isActive && { backgroundColor: primaryColor, borderColor: primaryColor }
                ]}
                onPress={() => {
                  setActiveSection(sec.id);
                  setSearch('');
                }}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: 15, marginRight: 5 }}>{sec.icon}</Text>
                <Text
                  style={[
                    styles.sectionTabText,
                    { color: isActive ? '#ffffff' : theme.text, fontWeight: isActive ? 'bold' : '600' }
                  ]}
                >
                  {sec.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* BANNER ESPECIAL SI ESTÁ EN NUDOS: ESPECIALIDAD ASV */}
      {activeSection === 'nudos' && (
        <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 2 }}>
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: isDarkMode ? '#1e1b4b' : '#ede9fe',
              borderColor: '#8b5cf6',
              borderWidth: 1.5,
              borderRadius: 14,
              padding: 12,
              gap: 12,
              elevation: 1
            }}
            onPress={() => navigation.navigate('Especialidades')}
            activeOpacity={0.8}
          >
            <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: '#8b5cf6', justifyContent: 'center', alignItems: 'center' }}>
              <Award size={20} color="#ffffff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, fontWeight: '800', color: isDarkMode ? '#c4b5fd' : '#6d28d9' }}>
                🏅 Especialidad Oficial: Maniobra con Cuerdas
              </Text>
              <Text style={{ fontSize: 11, color: theme.subText, marginTop: 1 }}>
                Revisa los requisitos ASV para obtener la insignia de especialidad.
              </Text>
            </View>
            <ChevronRight size={18} color="#8b5cf6" />
          </TouchableOpacity>
        </View>
      )}

      {/* LISTADO DE ITEMS DEL MANUAL ACTIVO */}
      <ScrollView style={{ flex: 1, padding: 16 }} contentContainerStyle={{ paddingBottom: 40 }}>
        {filteredItems.length === 0 ? (
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <Info size={36} color={theme.subText} style={{ marginBottom: 10 }} />
            <Text style={{ fontWeight: 'bold', fontSize: 15, color: theme.text }}>
              No se encontraron resultados
            </Text>
            <Text style={{ color: theme.subText, fontSize: 12, marginTop: 4, textAlign: 'center' }}>
              Intenta buscar con otra palabra clave o limpia el buscador.
            </Text>
          </View>
        ) : (
          filteredItems.map(item => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.manualCard,
                { backgroundColor: theme.cardBg, borderColor: theme.border }
              ]}
              onPress={() => handleOpenItem(item)}
              activeOpacity={0.8}
            >
              <View style={[styles.manualIconBox, { backgroundColor: isDarkMode ? '#27272a' : 'rgba(99, 102, 241, 0.1)' }]}>
                <Text style={{ fontSize: 26 }}>{item.icon}</Text>
              </View>

              <View style={{ flex: 1, marginLeft: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                  <Text style={[styles.manualName, { color: theme.text }]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  {item.difficulty && (
                    <View
                      style={[
                        styles.diffBadge,
                        {
                          backgroundColor:
                            item.difficulty === 'Básico' || item.difficulty === 'Esencial'
                              ? isDarkMode ? '#064e3b' : '#dcfce7'
                              : isDarkMode ? '#451a03' : '#fef3c7'
                        }
                      ]}
                    >
                      <Text
                        style={[
                          styles.diffBadgeText,
                          {
                            color:
                              item.difficulty === 'Básico' || item.difficulty === 'Esencial'
                                ? isDarkMode ? '#86efac' : '#15803d'
                                : isDarkMode ? '#fde68a' : '#b45309'
                          }
                        ]}
                      >
                        {item.difficulty}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Categoría y Badges multimedia disponibles */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
                  <View style={[styles.catTagBadge, { backgroundColor: primaryColor + '15' }]}>
                    <Text style={{ fontSize: 10, fontWeight: 'bold', color: primaryColor }}>
                      {item.categoryTag}
                    </Text>
                  </View>

                  <View style={styles.miniFeaturePill}>
                    <FileText size={10} color="#16a34a" />
                    <Text style={[styles.miniFeatureText, { color: '#16a34a' }]}>Escrito</Text>
                  </View>

                  <View style={styles.miniFeaturePill}>
                    <Eye size={10} color="#0284c7" />
                    <Text style={[styles.miniFeatureText, { color: '#0284c7' }]}>Visual</Text>
                  </View>

                  {!!item.multimedia?.videoEmbedId && (
                    <View style={[styles.miniFeaturePill, { backgroundColor: '#ef444415' }]}>
                      <Video size={10} color="#ef4444" />
                      <Text style={[styles.miniFeatureText, { color: '#ef4444' }]}>Video</Text>
                    </View>
                  )}
                </View>

                <Text style={[styles.manualSummary, { color: theme.subText }]} numberOfLines={2}>
                  {item.summary}
                </Text>
              </View>

              <ChevronRight size={18} color={isDarkMode ? '#71717a' : '#94a3b8'} style={{ marginLeft: 6 }} />
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* ==================================================== */}
      {/* MODAL DETALLADO DE LA TÉCNICA CON LAS 3 PESTAÑAS      */}
      {/* 1. ESCRITO | 2. VISUAL OFFLINE | 3. MULTIMEDIA/VIDEO  */}
      {/* ==================================================== */}
      {selectedItem && (
        <Modal
          visible={selectedItem !== null}
          transparent
          animationType="slide"
          onRequestClose={() => {
            setSelectedItem(null);
            setIsPlayingWebVideo(false);
          }}
        >
          <View style={modalStyles.overlay}>
            <View style={[modalStyles.sheet, { backgroundColor: isDarkMode ? '#18181b' : 'white', borderColor: theme.border }]}>
              
              {/* HEADER DEL MODAL */}
              <View style={[modalStyles.header, { borderBottomColor: theme.border }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 8 }}>
                  <Text style={{ fontSize: 28, marginRight: 10 }}>{selectedItem.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[modalStyles.title, { color: theme.text }]} numberOfLines={1}>
                      {selectedItem.name}
                    </Text>
                    <Text style={{ fontSize: 11, color: primaryColor, fontWeight: 'bold' }}>
                      {selectedItem.categoryTag} {selectedItem.difficulty ? `• Nivel ${selectedItem.difficulty}` : ''}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    setSelectedItem(null);
                    setIsPlayingWebVideo(false);
                  }}
                  style={{ padding: 6, borderRadius: 8, backgroundColor: isDarkMode ? '#27272a' : '#f1f5f9' }}
                >
                  <X size={20} color={theme.subText} />
                </TouchableOpacity>
              </View>

              {/* BARRA DE PESTAÑAS: ESCRITO / VISUAL / MULTIMEDIA */}
              <View style={[modalStyles.tabBar, { borderBottomColor: theme.border, backgroundColor: isDarkMode ? '#202024' : '#f8fafc' }]}>
                <TouchableOpacity
                  style={[
                    modalStyles.tabBtn,
                    modalTab === 'escrito' && { borderBottomColor: primaryColor, borderBottomWidth: 2.5 }
                  ]}
                  onPress={() => setModalTab('escrito')}
                >
                  <FileText size={15} color={modalTab === 'escrito' ? primaryColor : theme.subText} />
                  <Text
                    style={[
                      modalStyles.tabBtnText,
                      { color: modalTab === 'escrito' ? primaryColor : theme.subText, fontWeight: modalTab === 'escrito' ? 'bold' : '600' }
                    ]}
                  >
                    Guía Escrita
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    modalStyles.tabBtn,
                    modalTab === 'visual' && { borderBottomColor: primaryColor, borderBottomWidth: 2.5 }
                  ]}
                  onPress={() => setModalTab('visual')}
                >
                  <Eye size={15} color={modalTab === 'visual' ? primaryColor : theme.subText} />
                  <Text
                    style={[
                      modalStyles.tabBtnText,
                      { color: modalTab === 'visual' ? primaryColor : theme.subText, fontWeight: modalTab === 'visual' ? 'bold' : '600' }
                    ]}
                  >
                    Visual (Offline)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    modalStyles.tabBtn,
                    modalTab === 'multimedia' && { borderBottomColor: '#ef4444', borderBottomWidth: 2.5 }
                  ]}
                  onPress={() => setModalTab('multimedia')}
                >
                  <Video size={15} color={modalTab === 'multimedia' ? '#ef4444' : theme.subText} />
                  <Text
                    style={[
                      modalStyles.tabBtnText,
                      { color: modalTab === 'multimedia' ? '#ef4444' : theme.subText, fontWeight: modalTab === 'multimedia' ? 'bold' : '600' }
                    ]}
                  >
                    Video y Fotos
                  </Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={{ padding: 18 }} contentContainerStyle={{ paddingBottom: 40 }}>
                
                {/* ==================================================== */}
                {/* PESTAÑA 1: GUÍA ESCRITA (OFFLINE)                    */}
                {/* ==================================================== */}
                {modalTab === 'escrito' && (
                  <View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                      <WifiOff size={14} color="#16a34a" />
                      <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#16a34a' }}>
                        MODO ESCRITO 100% OFFLINE (DISPONIBLE SIN CONEXIÓN)
                      </Text>
                    </View>

                    {/* Explicación y Uso */}
                    <Text style={[modalStyles.sectionLabel, { color: primaryColor }]}>DESCRIPCIÓN Y USO SCOUT</Text>
                    <Text style={[modalStyles.useText, { color: theme.text }]}>{selectedItem.description}</Text>

                    {/* Pasos de ejecución con checklist interactivo de práctica */}
                    {selectedItem.steps && selectedItem.steps.length > 0 && (
                      <View style={{ marginTop: 18 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <Text style={[modalStyles.sectionLabel, { color: primaryColor, marginBottom: 0 }]}>
                            PASO A PASO EXPLICADO
                          </Text>
                          <Text style={{ fontSize: 10, color: theme.subText }}>Toca para marcar tu avance</Text>
                        </View>

                        {selectedItem.steps.map((st, idx) => {
                          const isDone = !!checkedSteps[`${selectedItem.id}_step_${idx}`];
                          return (
                            <TouchableOpacity
                              key={idx}
                              style={[
                                modalStyles.stepRow,
                                isDone && { opacity: 0.7 }
                              ]}
                              onPress={() => toggleStepChecked(selectedItem.id, idx)}
                              activeOpacity={0.7}
                            >
                              {isDone ? (
                                <CheckCircle2 size={18} color="#16a34a" style={{ marginTop: 2, marginRight: 10 }} />
                              ) : (
                                <Circle size={18} color={theme.subText} style={{ marginTop: 2, marginRight: 10 }} />
                              )}
                              <Text
                                style={[
                                  modalStyles.stepText,
                                  { color: theme.text, textDecorationLine: isDone ? 'line-through' : 'none' }
                                ]}
                              >
                                {st}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}

                    {/* Consejos prácticos de patrulla */}
                    {selectedItem.tips && selectedItem.tips.length > 0 && (
                      <View style={[modalStyles.tipBox, { backgroundColor: isDarkMode ? '#1e293b' : '#eff6ff', borderColor: '#3b82f6' }]}>
                        <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#2563eb', marginBottom: 4 }}>
                          💡 CONSEJOS DE PATRULLA / SCOUTER:
                        </Text>
                        {selectedItem.tips.map((t, idx) => (
                          <Text key={idx} style={{ fontSize: 12, color: isDarkMode ? '#bfdbfe' : '#1e40af', marginBottom: 2 }}>
                            • {t}
                          </Text>
                        ))}
                      </View>
                    )}

                    {/* Advertencia de seguridad */}
                    {!!selectedItem.safety && (
                      <View style={[modalStyles.tipBox, { backgroundColor: isDarkMode ? '#451a03' : '#fef2f2', borderColor: '#ef4444' }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                          <AlertTriangle size={14} color="#ef4444" />
                          <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#ef4444' }}>
                            PRECAUCIÓN DE SEGURIDAD:
                          </Text>
                        </View>
                        <Text style={{ fontSize: 12, color: isDarkMode ? '#fecaca' : '#991b1b' }}>
                          {selectedItem.safety}
                        </Text>
                      </View>
                    )}

                    {/* Acceso directo a ver el esquema visual */}
                    <TouchableOpacity
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        marginTop: 20,
                        padding: 12,
                        borderRadius: 12,
                        backgroundColor: primaryColor + '15',
                        borderWidth: 1,
                        borderColor: primaryColor
                      }}
                      onPress={() => setModalTab('visual')}
                    >
                      <Eye size={16} color={primaryColor} />
                      <Text style={{ fontSize: 13, fontWeight: 'bold', color: primaryColor }}>
                        Ver Esquema Visual Paso a Paso (Offline)
                      </Text>
                      <ChevronRight size={16} color={primaryColor} />
                    </TouchableOpacity>
                  </View>
                )}

                {/* ==================================================== */}
                {/* PESTAÑA 2: ESQUEMA VISUAL PASO A PASO (100% OFFLINE)  */}
                {/* ==================================================== */}
                {modalTab === 'visual' && (
                  <View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <WifiOff size={14} color="#16a34a" />
                        <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#16a34a' }}>
                          ESQUEMA VECTORIAL OFFLINE
                        </Text>
                      </View>
                      <Text style={{ fontSize: 11, color: theme.subText }}>Sin internet ni descargas</Text>
                    </View>

                    {/* DIAGRAMA VECTORIAL SVG */}
                    <ManualVisualDiagram
                      itemId={selectedItem.id}
                      stepIndex={visualStepIndex}
                      isDarkMode={isDarkMode}
                      primaryColor={primaryColor}
                    />

                    {/* SELECTOR DE PASOS VISUALES */}
                    <View style={{ marginTop: 12 }}>
                      <Text style={[modalStyles.sectionLabel, { color: primaryColor, marginBottom: 8 }]}>
                        SELECCIONA LA ETAPA DE CONSTRUCCIÓN:
                      </Text>

                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 6 }}>
                        <TouchableOpacity
                          style={[
                            modalStyles.visualStepPill,
                            visualStepIndex === 0 && { backgroundColor: primaryColor, borderColor: primaryColor }
                          ]}
                          onPress={() => setVisualStepIndex(0)}
                        >
                          <Text
                            style={[
                              modalStyles.visualStepPillText,
                              { color: visualStepIndex === 0 ? '#ffffff' : theme.text }
                            ]}
                          >
                            ✓ Vista Final
                          </Text>
                        </TouchableOpacity>

                        {(selectedItem.visualSteps || [
                          { stepNumber: 1, title: 'Paso 1', instruction: 'Inicio de la técnica' },
                          { stepNumber: 2, title: 'Paso 2', instruction: 'Desarrollo de vueltas' },
                          { stepNumber: 3, title: 'Paso 3', instruction: 'Remate y tensión' }
                        ]).map(vs => {
                          const isActive = visualStepIndex === vs.stepNumber;
                          return (
                            <TouchableOpacity
                              key={vs.stepNumber}
                              style={[
                                modalStyles.visualStepPill,
                                isActive && { backgroundColor: primaryColor, borderColor: primaryColor }
                              ]}
                              onPress={() => setVisualStepIndex(vs.stepNumber)}
                            >
                              <Text
                                style={[
                                  modalStyles.visualStepPillText,
                                  { color: isActive ? '#ffffff' : theme.text }
                                ]}
                              >
                                Paso {vs.stepNumber}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>

                      {/* EXPLICACIÓN ESPECÍFICA DEL PASO SELECCIONADO */}
                      {visualStepIndex > 0 && selectedItem.visualSteps && (
                        <View style={[modalStyles.stepDetailCard, { backgroundColor: isDarkMode ? '#27272a' : '#f8fafc', borderColor: theme.border }]}>
                          <Text style={{ fontSize: 13, fontWeight: 'bold', color: primaryColor, marginBottom: 4 }}>
                            {selectedItem.visualSteps[visualStepIndex - 1]?.title || `Paso ${visualStepIndex}`}
                          </Text>
                          <Text style={{ fontSize: 12, color: theme.text, lineHeight: 18 }}>
                            {selectedItem.visualSteps[visualStepIndex - 1]?.instruction}
                          </Text>
                          {!!selectedItem.visualSteps[visualStepIndex - 1]?.callout && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
                              <Sparkles size={13} color="#eab308" />
                              <Text style={{ fontSize: 11, fontWeight: 'bold', color: isDarkMode ? '#fde047' : '#ca8a04' }}>
                                Clave: {selectedItem.visualSteps[visualStepIndex - 1]?.callout}
                              </Text>
                            </View>
                          )}
                        </View>
                      )}

                      {visualStepIndex === 0 && (
                        <View style={[modalStyles.stepDetailCard, { backgroundColor: isDarkMode ? '#27272a' : '#f8fafc', borderColor: theme.border }]}>
                          <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#16a34a', marginBottom: 4 }}>
                            ✓ Resultado Final Azocado
                          </Text>
                          <Text style={{ fontSize: 12, color: theme.text, lineHeight: 18 }}>
                            {selectedItem.summary}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Botón para saltar a video y fotos */}
                    <TouchableOpacity
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        marginTop: 18,
                        padding: 12,
                        borderRadius: 12,
                        backgroundColor: '#ef444415',
                        borderWidth: 1,
                        borderColor: '#ef4444'
                      }}
                      onPress={() => setModalTab('multimedia')}
                    >
                      <Play size={16} color="#ef4444" />
                      <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#ef4444' }}>
                        Ver Video Demostrativo y Fotos Reales
                      </Text>
                      <ChevronRight size={16} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                )}

                {/* ==================================================== */}
                {/* PESTAÑA 3: MULTIMEDIA (VIDEO DEMOSTRATIVO & IMÁGENES) */}
                {/* ==================================================== */}
                {modalTab === 'multimedia' && (
                  <View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                      <Wifi size={14} color="#3b82f6" />
                      <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#3b82f6' }}>
                        MULTIMEDIA (REQUIERE CONEXIÓN DE DATOS O WIFI)
                      </Text>
                    </View>

                    {/* SECCIÓN DE VIDEO DEMOSTRATIVO */}
                    <Text style={[modalStyles.sectionLabel, { color: '#ef4444' }]}>VIDEO TUTORIAL DEMOSTRATIVO</Text>
                    
                    <View style={[modalStyles.videoCard, { backgroundColor: isDarkMode ? '#1e1b4b15' : '#fef2f2', borderColor: '#fca5a5' }]}>
                      
                      {/* REPRODUCTOR EN WEB O TARJETA DE REPRODUCCIÓN */}
                      {Platform.OS === 'web' && isPlayingWebVideo && selectedItem.multimedia?.videoEmbedId ? (
                        <View style={{ width: '100%', height: 210, borderRadius: 12, overflow: 'hidden', marginBottom: 10, backgroundColor: '#000000' }}>
                          {/* @ts-ignore iframe for web */}
                          <iframe
                            src={`https://www.youtube.com/embed/${selectedItem.multimedia.videoEmbedId}?autoplay=1&rel=0`}
                            title={selectedItem.multimedia.videoTitle || selectedItem.name}
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            style={{ width: '100%', height: '100%', border: 'none' }}
                          />
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={modalStyles.videoThumbBox}
                          onPress={() => {
                            if (Platform.OS === 'web' && selectedItem.multimedia?.videoEmbedId) {
                              setIsPlayingWebVideo(true);
                            } else {
                              handleOpenVideoExternal(selectedItem.multimedia?.videoEmbedId, selectedItem.name);
                            }
                          }}
                          activeOpacity={0.85}
                        >
                          <View style={modalStyles.videoPlayBtn}>
                            <Play size={26} color="#ffffff" fill="#ffffff" style={{ marginLeft: 3 }} />
                          </View>
                          <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: 'bold', marginTop: 8 }}>
                            Toca para ver el video demostrativo
                          </Text>
                          {!!selectedItem.multimedia?.videoDuration && (
                            <View style={modalStyles.durationBadge}>
                              <Text style={{ color: '#ffffff', fontSize: 10, fontWeight: 'bold' }}>
                                ⏱️ {selectedItem.multimedia.videoDuration}
                              </Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      )}

                      <View style={{ paddingHorizontal: 4 }}>
                        <Text style={{ fontSize: 13, fontWeight: 'bold', color: theme.text, marginBottom: 2 }}>
                          {selectedItem.multimedia?.videoTitle || `Tutorial: ${selectedItem.name}`}
                        </Text>
                        <Text style={{ fontSize: 11, color: theme.subText, marginBottom: 10 }}>
                          Fuente: {selectedItem.multimedia?.videoChannel || 'Escultismo y Pionerismo Scout'}
                        </Text>

                        {/* BOTONES DE ACCIÓN PARA EL VIDEO */}
                        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                          {Platform.OS === 'web' && selectedItem.multimedia?.videoEmbedId && (
                            <TouchableOpacity
                              style={[modalStyles.actionVideoBtn, { backgroundColor: isPlayingWebVideo ? '#64748b' : '#ef4444' }]}
                              onPress={() => setIsPlayingWebVideo(!isPlayingWebVideo)}
                            >
                              <Play size={14} color="#ffffff" />
                              <Text style={modalStyles.actionVideoBtnText}>
                                {isPlayingWebVideo ? 'Cerrar Reproductor' : 'Reproducir en App'}
                              </Text>
                            </TouchableOpacity>
                          )}

                          <TouchableOpacity
                            style={[modalStyles.actionVideoBtn, { backgroundColor: '#dc2626' }]}
                            onPress={() => handleOpenVideoExternal(selectedItem.multimedia?.videoEmbedId, selectedItem.name)}
                          >
                            <ExternalLink size={14} color="#ffffff" />
                            <Text style={modalStyles.actionVideoBtnText}>Abrir en YouTube</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[modalStyles.actionVideoBtn, { backgroundColor: isDarkMode ? '#3f3f46' : '#e2e8f0' }]}
                            onPress={() => handleOpenVideoExternal(undefined, selectedItem.name)}
                          >
                            <Search size={14} color={theme.text} />
                            <Text style={[modalStyles.actionVideoBtnText, { color: theme.text }]}>Más videos</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>

                    {/* GALERÍA DE IMÁGENES / ILUSTRACIONES */}
                    <Text style={[modalStyles.sectionLabel, { color: primaryColor, marginTop: 22 }]}>
                      GALERÍA DE IMÁGENES E ILUSTRACIONES
                    </Text>

                    {selectedItem.multimedia?.images && selectedItem.multimedia.images.length > 0 ? (
                      <View style={{ gap: 12 }}>
                        {selectedItem.multimedia.images.map((img, idx) => (
                          <TouchableOpacity
                            key={idx}
                            style={[modalStyles.imageCard, { backgroundColor: isDarkMode ? '#27272a' : '#f8fafc', borderColor: theme.border }]}
                            onPress={() => setLightboxImage(img.url)}
                            activeOpacity={0.85}
                          >
                            <Image
                              source={{ uri: img.url }}
                              style={modalStyles.imageThumb}
                              resizeMode="contain"
                            />
                            <View style={modalStyles.imageCaptionBox}>
                              <Text style={{ fontSize: 12, fontWeight: '600', color: theme.text }}>
                                {img.caption}
                              </Text>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                                <Maximize2 size={12} color={primaryColor} />
                                <Text style={{ fontSize: 10, color: primaryColor, fontWeight: 'bold' }}>
                                  Toca para ampliar imagen
                                </Text>
                              </View>
                            </View>
                          </TouchableOpacity>
                        ))}
                      </View>
                    ) : (
                      <View style={[modalStyles.imageFallbackBox, { borderColor: theme.border }]}>
                        <ImageIcon size={32} color={theme.subText} style={{ marginBottom: 8 }} />
                        <Text style={{ fontSize: 13, fontWeight: 'bold', color: theme.text }}>
                          Diagramas visuales disponibles en la pestaña "Visual (Offline)"
                        </Text>
                        <Text style={{ fontSize: 11, color: theme.subText, marginTop: 4, textAlign: 'center' }}>
                          Los esquemas paso a paso vectoriales ya están cargados y funcionan sin conexión.
                        </Text>
                        <TouchableOpacity
                          style={{ marginTop: 10, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, backgroundColor: primaryColor }}
                          onPress={() => setModalTab('visual')}
                        >
                          <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: 'bold' }}>Ver Esquema Visual</Text>
                        </TouchableOpacity>
                      </View>
                    )}

                  </View>
                )}

              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {/* LIGHTBOX MODAL PARA VER IMAGEN EN PANTALLA COMPLETA */}
      {!!lightboxImage && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setLightboxImage(null)}>
          <View style={modalStyles.lightboxOverlay}>
            <TouchableOpacity style={modalStyles.lightboxCloseBtn} onPress={() => setLightboxImage(null)}>
              <X size={26} color="#ffffff" />
            </TouchableOpacity>
            <Image
              source={{ uri: lightboxImage }}
              style={modalStyles.lightboxImage}
              resizeMode="contain"
            />
          </View>
        </Modal>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 16, borderBottomWidth: 1 },
  badgePill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, borderWidth: 1 },
  badgePillText: { fontSize: 9.5, fontWeight: '900', letterSpacing: 0.5 },
  title: { fontSize: 19, fontWeight: 'bold' },
  subTitle: { fontSize: 12, marginTop: 2 },
  searchBox: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, marginTop: 12, height: 42 },
  searchInput: { flex: 1, fontSize: 13 },
  sectionTabsContainer: { paddingHorizontal: 14, paddingVertical: 10, gap: 8 },
  sectionTabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff'
  },
  sectionTabText: { fontSize: 12 },
  manualCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 16, borderWidth: 1, marginBottom: 10 },
  manualIconBox: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  manualName: { fontSize: 14, fontWeight: 'bold', flex: 1 },
  manualSummary: { fontSize: 12, marginTop: 2, lineHeight: 16 },
  catTagBadge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 },
  diffBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, marginLeft: 6 },
  diffBadgeText: { fontSize: 9, fontWeight: 'bold' },
  miniFeaturePill: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#f1f5f9', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 },
  miniFeatureText: { fontSize: 9, fontWeight: 'bold' }
});

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: 1, maxHeight: '92%', height: '88%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  title: { fontSize: 16, fontWeight: 'bold' },
  tabBar: { flexDirection: 'row', borderBottomWidth: 1 },
  tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12 },
  tabBtnText: { fontSize: 12 },
  sectionLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 0.5, marginBottom: 4 },
  useText: { fontSize: 13, lineHeight: 19 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  stepText: { fontSize: 13, flex: 1, lineHeight: 19 },
  tipBox: { padding: 12, borderRadius: 10, borderWidth: 1, marginTop: 12 },
  visualStepPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: '#cbd5e1', backgroundColor: '#ffffff' },
  visualStepPillText: { fontSize: 11, fontWeight: 'bold' },
  stepDetailCard: { padding: 12, borderRadius: 12, borderWidth: 1, marginTop: 10 },
  videoCard: { padding: 12, borderRadius: 14, borderWidth: 1, marginTop: 6 },
  videoThumbBox: { height: 160, borderRadius: 12, backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center', marginBottom: 10, position: 'relative' },
  videoPlayBtn: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#ef4444', justifyContent: 'center', alignItems: 'center', elevation: 4 },
  durationBadge: { position: 'absolute', bottom: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  actionVideoBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  actionVideoBtnText: { color: '#ffffff', fontSize: 11, fontWeight: 'bold' },
  imageCard: { borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  imageThumb: { width: '100%', height: 180, backgroundColor: '#ffffff' },
  imageCaptionBox: { padding: 10 },
  imageFallbackBox: { padding: 24, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', alignItems: 'center', marginTop: 10 },
  lightboxOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center', alignItems: 'center' },
  lightboxCloseBtn: { position: 'absolute', top: 40, right: 20, zIndex: 10, padding: 8 },
  lightboxImage: { width: '90%', height: '80%' }
});
