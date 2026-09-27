import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal
} from 'react-native';
import {
  Compass,
  Search,
  ChevronRight,
  BookOpen,
  Shield,
  Sparkles,
  CheckCircle2,
  ArrowLeft,
  Award,
  Flame,
  HandMetal,
  MapPin,
  HeartPulse,
  X,
  AlertTriangle,
  Info
} from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useModalBackHandler } from '../hooks/useBackHandler';
import { colors } from '../theme/colors';
import { navigateBackOrHome } from '../utils/navigationHelper';

export type ManualSectionKey = 'nudos' | 'fogatas' | 'senas' | 'pistas' | 'primeros_auxilios';

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
    icon: '🦺',
    summary: 'El rey de los nudos de salvamento. Crea una gaza fija que jamás se corre ni se aprieta bajo tensión.',
    description: 'Nudo indispensable en montaña, mar y rescates de emergencia. Permite izar o descender personas u objetos pesados con absoluta confianza de que el lazo mantendrá su tamaño.',
    steps: [
      '1. Forma un bucle o seno pequeño en el firme de la cuerda (el lago).',
      '2. Pasa el chicote libre desde abajo hacia arriba a través del lago (la serpiente sale del lago).',
      '3. Rodea con el chicote el tramo largo de la cuerda por detrás (pasa alrededor del árbol).',
      '4. Vuelve a introducir el chicote hacia abajo dentro del lago (la serpiente regresa al agua).',
      '5. Sujeta el chicote y el borde del bucle mientras halas el firme para azocar.'
    ],
    tips: [
      'Cuento scout tradicional: "La serpiente sale del lago, rodea el árbol y vuelve al lago".',
      'Incluso tras soportar cientos de kilogramos de peso, se desata con una ligera presión en el dorso.'
    ],
    safety: 'Deja siempre un chicote sobrante de al menos 10 cm o remata con un nudo tope.'
  },
  {
    id: 'amarre_cuadrado',
    section: 'nudos',
    name: 'Amarre Cuadrado',
    categoryTag: 'Construcción',
    difficulty: 'Intermedio',
    icon: '🏗️',
    summary: 'Unir dos troncos que se cruzan a 90 grados. Pilar fundamental de portadas, mesas y torres scout.',
    description: 'Utilizado en pionerismo para unir maderos perpendiculares que soportarán cargas o fuerzas que intentan hacerlos resbalar uno sobre otro.',
    steps: [
      '1. Inicia con un Ballestrinque en el tronco vertical, debajo del cruce.',
      '2. Pasa la cuerda sobre el tronco horizontal, luego por detrás del vertical y sobre el horizontal del otro lado.',
      '3. Da de 3 a 4 vueltas completas bien pegadas y ordenadas (sin montar una vuelta sobre otra).',
      '4. Realiza el "ahorcado" (dar 2 a 3 vueltas de apriete entre ambos troncos para estrangular la cuerda).',
      '5. Remata firmemente con un Ballestrinque en el tronco horizontal.'
    ],
    tips: [
      'El secreto de un amarre indestructible está en el "ahorcado": ahí es donde se logra la rigidez.',
      'Mantén la cuerda mojada si es de fibra natural para que al secar apriete aún más.'
    ]
  },
  {
    id: 'amarre_diagonal',
    section: 'nudos',
    name: 'Amarre Diagonal',
    categoryTag: 'Construcción',
    difficulty: 'Intermedio',
    icon: '❌',
    summary: 'Unir dos troncos que se cruzan en diagonal o que tienden a separarse por tensión opuesta.',
    description: 'Especialmente diseñado para estructuras con arriostramientos (diagonales de refuerzo) o tijeras de soporte en puentes y torres.',
    steps: [
      '1. Inicia con un nudo Vuelta de Braza (Leñador) abrazando ambos troncos en el cruce.',
      '2. Da 3 a 4 vueltas completas en el sentido del ángulo obtuso.',
      '3. Cruza la cuerda y da 3 a 4 vueltas en el sentido opuesto formando una "X" firme.',
      '4. Ahorca fuertemente el cruce con 2 o 3 vueltas de estrangulación entre los troncos.',
      '5. Remata con un nudo Ballestrinque en cualquiera de los maderos.'
    ],
    tips: [
      'Usa palancas de madera para templar las vueltas si la cuerda es gruesa.'
    ]
  },
  {
    id: 'amarre_tripode',
    section: 'nudos',
    name: 'Amarre Trípode o en Ocho',
    categoryTag: 'Construcción',
    difficulty: 'Intermedio',
    icon: '⛺',
    summary: 'Unir tres troncos paralelos para abrir una base piramidal (trípode de cocina, lavamanos o asta).',
    description: 'Permite crear la base estructural de tres patas más estable del campamento scout. Los troncos se amarran acostados en el suelo y luego se abren las patas.',
    steps: [
      '1. Coloca los tres troncos en el suelo (el central en sentido opuesto a los dos laterales).',
      '2. Inicia con un Ballestrinque en uno de los troncos exteriores.',
      '3. Pasa la cuerda arriba y abajo entre los troncos en forma de ocho (ocho o nueve vueltas sin apretar en exceso).',
      '4. Haz el ahorcado pasando la cuerda entre cada separación de troncos.',
      '5. Remata con un Ballestrinque y levanta el trípode abriendo las patas en triángulo.'
    ],
    tips: [
      'No aprietes las primeras vueltas en exceso; si quedan demasiado tensas no podrás abrir las patas del trípode.'
    ]
  },
  {
    id: 'nudo_ocho',
    section: 'nudos',
    name: 'Nudo en Ocho (Firme y Gaza)',
    categoryTag: 'Tope y Seguridad',
    difficulty: 'Básico',
    icon: '♾️',
    summary: 'Nudo de tope para evitar que una cuerda se deslice de una polea, mosquetón o guía.',
    description: 'Muy superior al nudo simple porque no estropea las fibras de la cuerda y se deshace con facilidad incluso después de una fuerte tensión.',
    steps: [
      '1. Haz un seno con el extremo de la cuerda.',
      '2. Pasa el chicote por detrás del firme.',
      '3. Introduce el chicote por delante a través del seno formando el número 8.',
      '4. Ajusta tensando ambos lados.'
    ],
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
    tips: [
      'Acompaña con un cote adelante si vas a arrastrar el tronco a largas distancias para que no cabecee.'
    ]
  },
  {
    id: 'margarita',
    section: 'nudos',
    name: 'Nudo Margarita',
    categoryTag: 'Especial',
    difficulty: 'Avanzado',
    icon: '🌿',
    summary: 'Acortar una cuerda larga o aislar una sección dañada/gastada sin cortarla.',
    description: 'Mantiene la resistencia de la cuerda transmitiendo la fuerza a los dos senos externos y dejando el tramo central flojo.',
    steps: [
      '1. Dobla la cuerda haciendo tres senos continuos en forma de "S".',
      '2. Pasa el seno central a través de dos medios cotes formados en los extremos.',
      '3. Mantén tensión constante en los extremos principales para que no se desarme.'
    ],
    tips: [
      'Para que no se desarme si la cuerda se afloja, introduce una pequeña cuña de madera en cada gaza exterior.'
    ]
  },

  // ==========================================
  // 2. FOGATAS Y FUEGO SCOUT
  // ==========================================
  {
    id: 'fogata_piramide',
    section: 'fogatas',
    name: 'Fogata Pirámide o Tipí',
    categoryTag: 'Básica / Calefacción',
    difficulty: 'Básico',
    icon: '⛺',
    summary: 'El tipo de fuego más tradicional y rápido de encender. Llama alta y calor vertical inmediato.',
    description: 'Ideal para iniciar otros fuegos, iluminar la noche de campamento, hervir agua con rapidez en una tetera o cantar en el consejo de patrulla.',
    steps: [
      '1. Coloca un puñado generoso de yesca en el centro del círculo de fuego.',
      '2. Clava una estaca pequeña inclinada sobre la yesca o apoya ramas delgadas formando un cono o tipí.',
      '3. Añade ramas de mayor grosor alrededor del cono dejando una "puerta" hacia barlovento (por donde entra el viento) para introducir el fósforo.',
      '4. Enciende la yesca desde la base y alimenta con ramas secas conforme crezca la llama.'
    ],
    tips: [
      'Deja suficiente espacio entre las ramas para que circule el oxígeno; sin aire, el fuego se ahoga.',
      'Ten preparada de antemano toda la leña que vas a usar antes de encender el primer fósforo.'
    ],
    safety: 'No la construyas demasiado alta bajo copas de árboles secos. Ten agua o tierra lista al lado.'
  },
  {
    id: 'fogata_polinesia',
    section: 'fogatas',
    name: 'Fogata Polinesia o de Pozo',
    categoryTag: 'Cocina / Viento',
    difficulty: 'Intermedio',
    icon: '🕳️',
    summary: 'Fuego subterráneo protegido del viento. Produce poco humo y concentra calor para asar y hornear.',
    description: 'La fogata favorita de los scouts en zonas con viento fuerte o donde se requiera máxima discreción y seguridad contra incendios.',
    steps: [
      '1. Cava un hoyo cónico de unos 40 a 50 cm de profundidad, más ancho en el fondo que en la boca.',
      '2. Reviste las paredes del pozo con piedras secas o leños verdes resistentes al calor.',
      '3. Puedes cavar un pequeño túnel lateral inclinado para entrada de aire fresco (tiro de ventilación).',
      '4. Enciende una pirámide en el fondo y deja que se acumule un grueso lecho de brasas.',
      '5. Apoya ollas, sartenes o brochetas directamente en el borde superior del pozo.'
    ],
    tips: [
      'Al terminar el campamento, basta con apagar las brasas y rellenar con la tierra original; no queda rastro.'
    ],
    safety: 'NUNCA uses piedras de río húmedas para revestir el hoyo: el vapor atrapado puede hacerlas estallar.'
  },
  {
    id: 'fogata_pagoda',
    section: 'fogatas',
    name: 'Fogata Pagoda o Altar',
    categoryTag: 'Brasas / Gran Cocina',
    difficulty: 'Intermedio',
    icon: '🪵',
    summary: 'Estructura en capas cuadradas decrecientes. Genera un lecho de brasas abundante y uniforme.',
    description: 'Perfecta para cocinar para toda la tropa o clan, ya que se quema de arriba hacia abajo o de abajo hacia arriba de forma pausada y muy pareja.',
    steps: [
      '1. Coloca dos troncos gruesos paralelos en la base.',
      '2. Coloca dos troncos cruzados encima formando un cuadrado.',
      '3. Repite hacia arriba reduciendo el tamaño de los leños como una pirámide maya.',
      '4. En la parte superior o en el centro de la base, enciende una pequeña pirámide de yesca y ramas finas.',
      '5. Al arder, las capas superiores caerán al centro creando brasas de altísima duración.'
    ],
    tips: [
      'Excelente como fogata de campamento para asambleas nocturnas por su luz pareja y combustión sostenida.'
    ]
  },
  {
    id: 'fogata_reflector',
    section: 'fogatas',
    name: 'Fogata de Reflector',
    categoryTag: 'Calefacción Nocturna',
    difficulty: 'Intermedio',
    icon: '🛡️',
    summary: 'Fuego con una pared trasera que proyecta el calor directamente hacia la carpa o vivac.',
    description: 'Indispensable para noches frías o vivac sin carpa cerrada. La pared de piedras o maderos húmedos rebota el calor radiante hacia la zona de descanso.',
    steps: [
      '1. Construye una pequeña pared vertical de troncos verdes o piedras secas a un lado de la fogata.',
      '2. Inclina ligeramente la pared hacia el fuego para que el ángulo refleje el calor hacia tu refugio.',
      '3. Enciende una fogata pirámide o corredor a unos 30 cm de la pared reflectora.',
      '4. Orienta la instalación para que el viento no devuelva el humo a tu tienda.'
    ],
    tips: [
      'La distancia óptima entre la fogata reflectora y tu saco de dormir es de unos 1.8 a 2 metros.'
    ]
  },
  {
    id: 'fogata_cruz',
    section: 'fogatas',
    name: 'Fogata en Cruz',
    categoryTag: 'Larga Duración',
    difficulty: 'Básico',
    icon: '➕',
    summary: 'Fuego regulable y de larga duración empujando troncos hacia el centro.',
    description: 'Dos zanjas o cuatro leños gruesos dispuestos en cruz con un fuego en la intersección central. Ideal para vigilias nocturnas o noches de guardia.',
    steps: [
      '1. Cava dos zanjas poco profundas en forma de cruz o dispone cuatro leños largos tocándose en el centro.',
      '2. Enciende un fuego de inicio justo en el punto de cruce.',
      '3. A medida que los extremos de los maderos se consuman en el fuego, empújalos hacia el centro.',
      '4. Las zanjas garantizan oxígeno sin importar de qué dirección sople el viento.'
    ],
    tips: [
      'Permite mantener un fuego constante durante horas sin tener que cortar leña pequeña continuamente.'
    ]
  },
  {
    id: 'leña_clasificacion',
    section: 'fogatas',
    name: 'Clasificación de Leña Scout',
    categoryTag: 'Técnica de Fuego',
    difficulty: 'Esencial',
    icon: '🌿',
    summary: 'Los 4 tipos de combustible natural indispensables para encender fuego con un solo fósforo.',
    description: 'Un buen scout nunca usa combustibles químicos ni plástico. La clave del éxito reside en clasificar y recolectar la leña antes del encendido.',
    steps: [
      '1. YESCA (Tinder): Paja seca, hojas secas trituradas, corteza fibrosa de abedul o eucalipto, nidos de pájaro abandonados o virutas finas.',
      '2. LEÑA DE INICIO (Kindling): Ramitas secas y quebradizas del grosor de un fideo o un fósforo. Deben chasquear al doblarse.',
      '3. LEÑA INTERMEDIA: Ramas del grosor del dedo meñique al pulgar. Alimenta la llama inicial.',
      '4. LEÑOS DE BRASAS (Fuel): Troncos maduros de madera dura (roble, encina, eucalipto) que mantienen calor constante por horas.'
    ],
    tips: [
      'Prueba de la rama: Si se dobla sin romperse, está verde o húmeda y solo producirá humo. Si se quiebra con un "¡crack!", está lista.'
    ]
  },
  {
    id: 'seguridad_fuego',
    section: 'fogatas',
    name: 'Seguridad y Leave No Trace (Sin Dejar Huella)',
    categoryTag: 'Conservación',
    difficulty: 'Esencial',
    icon: '🧯',
    summary: 'Reglas de oro para prevenir incendios forestales y apagar el fuego al 100%.',
    description: 'La huella de un campamento debe ser cero. Aprender a apagar y borrar el rastro del fuego es tan vital como saber encenderlo.',
    steps: [
      '1. Limpia un círculo de 3 metros de diámetro libre de hojas secas, raíces y vegetación.',
      '2. Ten a mano un balde con agua, una pala con tierra o una rama verde con follaje.',
      '3. PARA APAGAR: Rocía agua poco a poco mientras revuelves las cenizas con un palo.',
      '4. Echa tierra o arena fresca y sigue revolviendo hasta enfriar cada brasa oculta.',
      '5. REGLA DE ORO: Si está demasiado caliente para tocar las cenizas con la palma de la mano, está demasiado caliente para abandonarlo.'
    ],
    tips: [
      'Corta el césped en panes cuadrados antes de cavar y colócalo a la sombra; al finalizar vuelve a ponerlo y riégalo.'
    ]
  },

  // ==========================================
  // 3. LENGUA DE SEÑAS (INCLUSIÓN SCOUT)
  // ==========================================
  {
    id: 'senas_alfabeto',
    section: 'senas',
    name: 'Alfabeto Dactilológico (A a Z)',
    categoryTag: 'Dactilología',
    difficulty: 'Básico',
    icon: '🔤',
    summary: 'Deletreo manual letra por letra para nombres, lugares y palabras sin seña específica.',
    description: 'La base de la comunicación inclusiva en lengua de señas venezolana e internacional. Permite deletrear cualquier concepto con una sola mano.',
    steps: [
      'A: Puño cerrado con el pulgar erguido a un costado.',
      'B: Cuatro dedos extendidos juntos y el pulgar doblado sobre la palma.',
      'C: Mano en semicírculo arqueado formando la letra "C".',
      'D: Índice apuntando hacia arriba, los demás dedos forman un círculo con el pulgar.',
      'E: Dedos flexionados tocando suavemente la punta del pulgar.',
      'F: Índice y pulgar juntos formando un aro; los otros tres dedos erguidos.',
      'G: Índice y pulgar paralelos apuntando horizontalmente.',
      'H: Índice y medio juntos extendidos hacia adelante.',
      'I: Solo el dedo meñique erguido hacia arriba.',
      'L: Índice erguido y pulgar horizontal formando una "L" perfecta.',
      'M: Tres dedos (índice, medio, anular) descansando sobre el pulgar.',
      'N: Dos dedos (índice y medio) descansando sobre el pulgar.',
      'O: Todos los dedos unidos en círculo formando una "O".',
      'P: Mano hacia abajo con índice extendido y medio en ángulo de 90°.',
      'R: Dedos índice y medio cruzados (signo de suerte).',
      'S: Puño cerrado con el pulgar cruzando sobre los dedos.',
      'T: Pulgar introducido entre el índice y el medio en puño.',
      'U: Índice y medio juntos extendidos hacia arriba.',
      'V: Índice y medio separados en "V" (signo de victoria).',
      'W: Índice, medio y anular abiertos en abanico.',
      'Y: Pulgar y meñique extendidos (signo de teléfono o hang loose).'
    ],
    tips: [
      'Mantén la mano a la altura del hombro, relajada y con la palma mirando hacia el frente de tu interlocutor.',
      'Haz pausas breves entre palabras en lugar de bajar la mano bruscamente.'
    ]
  },
  {
    id: 'senas_saludo_scout',
    section: 'senas',
    name: 'Saludo y Seña Scout en Señas',
    categoryTag: 'Escultismo',
    difficulty: 'Esencial',
    icon: '⚜️',
    summary: 'La seña scout universal adaptada con respeto y elegancia en la lengua de señas.',
    description: 'La seña scout simboliza la Promesa y la Ley: los tres dedos extendidos representan los tres principios y deberes, y el pulgar sobre el meñique simboliza que el fuerte protege al débil.',
    steps: [
      '1. Eleva la mano derecha a la altura de la sien o el hombro derecho.',
      '2. Extiende firmes los dedos índice, medio y anular.',
      '3. Cruza la yema del pulgar por encima de la uña del meñique.',
      '4. Con la mano izquierda, estrecha la mano izquierda del hermano scout.',
      '5. Para decir "Hermano Scout": Cruza suavemente los índices de ambas manos como un lazo fraterno.'
    ],
    tips: [
      'El apretón con la mano izquierda es el más cercano al corazón, legado de los guerreros ashantis que soltaban su escudo para confiar en el otro.'
    ]
  },
  {
    id: 'senas_siempre_listos',
    section: 'senas',
    name: 'Lema "Siempre Listos"',
    categoryTag: 'Lema Scout',
    difficulty: 'Básico',
    icon: '⚡',
    summary: 'Seña enérgica que transmite disposición constante para servir al prójimo.',
    description: 'Forma parte del saludo en asambleas, ceremonias y formaciones para saludar a dirigentes y compañeros.',
    steps: [
      '1. Mano derecha abierta con palma mirando hacia ti cerca del pecho.',
      '2. Sube la mano con energía hacia arriba a la altura de la frente mientras cierras en postura firme o en seña scout.',
      '3. Acompaña con expresión facial de decisión y sonrisa scout.'
    ],
    tips: [
      'La expresión facial en lengua de señas equivale a la entonación de la voz; una cara sonriente y atenta es fundamental.'
    ]
  },
  {
    id: 'senas_cortesia',
    section: 'senas',
    name: 'Cortesía y Convivencia',
    categoryTag: 'Comunicación',
    difficulty: 'Básico',
    icon: '🤝',
    summary: 'Gracias, Por Favor, De Nada, Perdón y Saludos cotidianos.',
    description: 'Las señas clave de educación y amabilidad scout que todo joven y dirigente debe dominar en actividades inclusivas.',
    steps: [
      '• GRACIAS: Toca tus labios o barbilla con la punta de los dedos de la mano abierta y extiéndela suavemente hacia la otra persona.',
      '• POR FAVOR: Apoya la palma abierta en el centro del pecho y realiza dos círculos suaves en el sentido de las agujas del reloj.',
      '• SÍ: Cierra la mano en puño y oscila la muñeca hacia adelante y atrás, como quien asiente con la cabeza.',
      '• NO: Junta el dedo índice y el dedo medio con el pulgar dos veces en un movimiento de pinza firme.',
      '• DE NADA / CON GUSTO: Mano abierta con la palma hacia arriba bajando ligeramente con cordialidad.',
      '• PERDÓN: Mano en puño frotando suavemente en círculos el pecho con expresión de arrepentimiento.'
    ],
    tips: [
      'Para decir "Buenos Días": Toca la barbilla (gracias/bueno) y luego lleva la mano derecha a apoyarse sobre el antebrazo izquierdo en forma de sol naciente.'
    ]
  },
  {
    id: 'senas_emergencia',
    section: 'senas',
    name: 'Seguridad y Campamento en Señas',
    categoryTag: 'Seguridad',
    difficulty: 'Intermedio',
    icon: '🚨',
    summary: 'Ayuda, Agua, Fuego, Médico, Peligro y Amigo.',
    description: 'Palabras cruciales para transmitir necesidades vitales, pedidos de socorro y elementos de supervivencia.',
    steps: [
      '• AYUDA: Extiende la palma de la mano izquierda hacia arriba; sobre ella apoya la mano derecha cerrada en puño con el pulgar erguido, y eleva ambas manos juntas.',
      '• AGUA: Forma una "W" con los dedos índice, medio y anular, y golpea suavemente la barbilla dos veces.',
      '• FUEGO: Abre ambas manos con dedos ondulantes elevándose hacia arriba imitando las llamas que arden.',
      '• MÉDICO / ENFERMERÍA: Con dos dedos de la mano derecha toca el pulso en la muñeca izquierda.',
      '• AMIGO: Engancha los dedos índices de ambas manos primero de un lado y luego invirtiendo la posición.',
      '• COMIDA: Junta las yemas de los cinco dedos de una mano y llévalos hacia la boca un par de veces.'
    ],
    tips: [
      'La seña de Ayuda se puede hacer hacia una dirección específica para pedir auxilio para un tercero.'
    ]
  },

  // ==========================================
  // 4. PISTAS Y RASTREO SCOUT (PIONERISMO)
  // ==========================================
  {
    id: 'pista_direccion',
    section: 'pistas',
    name: 'Seguir Esta Dirección',
    categoryTag: 'Orientación',
    difficulty: 'Básico',
    icon: '➡️',
    summary: 'Flecha natural construida con ramas, piedras o marcada en el suelo.',
    description: 'El signo de pista más común en las pistas de rastreo. Indica la dirección precisa que debe seguir la patrulla.',
    steps: [
      '1. Se forma con una rama larga como cuerpo y dos ramas cortas como punta de flecha.',
      '2. También se hace con tres piedras alineadas con una piedra más pequeña indicando la punta.',
      '3. En senderos de tierra, se dibuja suavemente una flecha sin alterar el entorno.'
    ],
    tips: [
      'Colócala siempre a la derecha del sendero, en un lugar visible pero que no llame la atención de extraños.'
    ]
  },
  {
    id: 'pista_camino_cerrado',
    section: 'pistas',
    name: 'Camino Cerrado / No ir por aquí',
    categoryTag: 'Advertencia',
    difficulty: 'Básico',
    icon: '🛑',
    summary: 'Cruz de ramas o piedras que prohíbe el paso por un sendero falso o peligroso.',
    description: 'Evita que las patrullas se desvíen por caminos erróneos o caigan en terrenos cortados o barrancos.',
    steps: [
      '1. Dos ramas secas cruzadas en "X" sobre el camino.',
      '2. O dos líneas de piedras que se intersectan claramente.',
      '3. Si hay una bifurcación, se coloca la "X" en la entrada del sendero que NO se debe tomar.'
    ],
    tips: [
      'Al ver este signo, la patrulla debe regresar al último signo de dirección y buscar la ruta correcta.'
    ]
  },
  {
    id: 'pista_peligro',
    section: 'pistas',
    name: 'Peligro o Atención Inmediata',
    categoryTag: 'Seguridad',
    difficulty: 'Intermedio',
    icon: '⚠️',
    summary: 'Tres piedras apiladas en columna o estaca con rama quebrada.',
    description: 'Alerta sobre animales ponzoñosos, nidos de avispas, terreno pantanoso, desfiladeros o peligro inminente.',
    steps: [
      '1. Tres piedras superpuestas una encima de la otra en equilibrio.',
      '2. O un montículo de tierra con una rama quebrada apuntando al suelo.',
      '3. Detener la marcha de la patrulla y avanzar con cautela extrema.'
    ],
    tips: [
      'La regla scout dice: "Tres de cualquier cosa es señal universal de peligro o socorro".'
    ]
  },
  {
    id: 'pista_mensaje',
    section: 'pistas',
    name: 'Mensaje Oculto a X Pasos',
    categoryTag: 'Mensajería',
    difficulty: 'Intermedio',
    icon: '✉️',
    summary: 'Cuadro con círculo y flecha indicando mensaje secreto enterrado o escondido.',
    description: 'Señal clásica para pistas de juegos nocturnos o rallies de orientación donde se deja un pergamino o prueba.',
    steps: [
      '1. Dibuja o forma un cuadrado de piedras o ramas.',
      '2. Dentro del cuadrado coloca un círculo o caracol.',
      '3. Al lado coloca una flecha con un número (ej: 8), que indica dar 8 pasos en esa dirección para hallar el mensaje.',
      '4. El mensaje suele esconderse en la horqueta de un árbol, bajo una piedra o en un tronco hueco.'
    ],
    tips: [
      'Protege siempre el mensaje dentro de una bolsa hermética o envase plástico para que no se moje con el rocío.'
    ]
  },
  {
    id: 'pista_fin',
    section: 'pistas',
    name: 'Fin de Pista / Misión Cumplida',
    categoryTag: 'Final',
    difficulty: 'Básico',
    icon: '🏁',
    summary: 'Círculo con un punto central: "He vuelto a casa / Misión cumplida".',
    description: 'El signo más emotivo del escultismo tradicional. También se coloca en la tumba de los scouts que partieron al campamento eterno (como en la lápida del fundador Baden-Powell).',
    steps: [
      '1. Dibuja o forma un círculo perfecto con ramas o piedras pequeñas.',
      '2. Coloca una piedra solitaria justo en el centro del círculo.',
      '3. Significa que la pista concluyó, la patrulla ha alcanzado su objetivo o debe reagruparse.'
    ],
    tips: [
      'Al encontrar este signo, la patrulla guarda silencio y espera la instrucción del Scouter.'
    ]
  },

  // ==========================================
  // 5. PRIMEROS AUXILIOS SCOUT
  // ==========================================
  {
    id: 'auxilios_pas',
    section: 'primeros_auxilios',
    name: 'Protocolo P.A.S. de Emergencias',
    categoryTag: 'Protocolo',
    difficulty: 'Esencial',
    icon: '🚑',
    summary: 'Proteger, Avisar y Socorrer: los 3 pasos obligatorios ante cualquier accidente.',
    description: 'La base universal de los primeros auxilios. Mantiene la calma y evita que el socorrista se convierta en una segunda víctima.',
    steps: [
      '1. PROTEGER: Asegura el lugar del accidente. Si hay fuego, cables eléctricos, abejas o caída de piedras, aléjate del peligro antes de tocar al herido.',
      '2. AVISAR: Da la alarma inmediatamente al Scouter, médico del campamento o números de emergencia (911). Indica lugar exacto y estado del paciente.',
      '3. SOCORRER: Atiende a la víctima según tus conocimientos. Conserva la calma, no muevas a un herido con sospecha de fractura de cuello o columna y abriga para prevenir shock.'
    ],
    tips: [
      'Habla con voz serena al accidentado: "Soy scout, estoy aquí contigo y la ayuda ya viene en camino".'
    ]
  },
  {
    id: 'auxilios_panuelo',
    section: 'primeros_auxilios',
    name: 'Vendajes con Pañuelo Scout',
    categoryTag: 'Vendaje Práctico',
    difficulty: 'Intermedio',
    icon: '🧣',
    summary: 'Transformar la pañoleta de la unidad en cabestrillo, venda en corbata o apósito.',
    description: 'La pañoleta scout es una herramienta de salvamento triangular perfecta para inmovilizar miembros superiores, sujetar férulas de madera o vendar cabezas.',
    steps: [
      '1. CABESTRILLO: Coloca la base del triángulo sobre el hombro sano, la punta hacia el codo herido. Lleva el vértice inferior sobre el antebrazo y anuda en la nuca con nudo rizo.',
      '2. VENDA EN CORBATA: Dobla la punta de la pañoleta hacia la base y sigue plegando hasta obtener una faja ancha para muñecas, tobillos o rodillas.',
      '3. CAPELINA PARA CABEZA: Cubre el cráneo con la base en la frente y anuda los dos extremos atrás asegurando la gasa sobre una herida.'
    ],
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

  // Soporte universal para gestos de retroceso en Android, iOS y PWA
  useModalBackHandler(selectedItem !== null, () => setSelectedItem(null));

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

        <Text style={styles.offlineBadge}>⚡ 100% OFFLINE (DISPONIBLE SIN INTERNET NI MEGAS)</Text>
        <Text style={[styles.title, { color: theme.text }]}>Manuales y Técnicas Scout</Text>
        <Text style={[styles.subTitle, { color: theme.subText }]}>
          Guías prácticas de cabuyería, fogatas, señas inclusivas, pionerismo y socorrismo.
        </Text>

        {/* BUSCADOR UNIVERSAL */}
        <View style={[styles.searchBox, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
          <Search size={16} color={isDarkMode ? '#71717a' : '#a1a1aa'} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Buscar por técnica, paso, nudo o palabra clave..."
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
              onPress={() => setSelectedItem(item)}
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

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <View style={[styles.catTagBadge, { backgroundColor: primaryColor + '15' }]}>
                    <Text style={{ fontSize: 10, fontWeight: 'bold', color: primaryColor }}>
                      {item.categoryTag}
                    </Text>
                  </View>
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

      {/* MODAL DETALLE DE LA TÉCNICA / MANUAL */}
      {selectedItem && (
        <Modal
          visible={selectedItem !== null}
          transparent
          animationType="slide"
          onRequestClose={() => setSelectedItem(null)}
        >
          <View style={modalStyles.overlay}>
            <View style={[modalStyles.sheet, { backgroundColor: isDarkMode ? '#18181b' : 'white', borderColor: theme.border }]}>
              {/* Header modal */}
              <View style={[modalStyles.header, { borderBottomColor: theme.border }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 8 }}>
                  <Text style={{ fontSize: 30, marginRight: 10 }}>{selectedItem.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[modalStyles.title, { color: theme.text }]}>{selectedItem.name}</Text>
                    <Text style={{ fontSize: 11, color: primaryColor, fontWeight: 'bold' }}>
                      {selectedItem.categoryTag} {selectedItem.difficulty ? `• Nivel ${selectedItem.difficulty}` : ''}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => setSelectedItem(null)} style={{ padding: 4 }}>
                  <X size={22} color={theme.subText} />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ padding: 18, maxHeight: 460 }}>
                {/* Explicación y Uso */}
                <Text style={[modalStyles.sectionLabel, { color: primaryColor }]}>DESCRIPCIÓN Y USO SCOUT</Text>
                <Text style={[modalStyles.useText, { color: theme.text }]}>{selectedItem.description}</Text>

                {/* Pasos de ejecución */}
                {selectedItem.steps && selectedItem.steps.length > 0 && (
                  <>
                    <Text style={[modalStyles.sectionLabel, { color: primaryColor, marginTop: 18 }]}>
                      PASOS PASO A PASO
                    </Text>
                    {selectedItem.steps.map((st, idx) => (
                      <View key={idx} style={modalStyles.stepRow}>
                        <CheckCircle2 size={16} color={primaryColor} style={{ marginTop: 2, marginRight: 8 }} />
                        <Text style={[modalStyles.stepText, { color: theme.text }]}>{st}</Text>
                      </View>
                    ))}
                  </>
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
                {selectedItem.safety && (
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
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 16, borderBottomWidth: 1 },
  offlineBadge: { fontSize: 10, fontWeight: '900', color: '#16a34a', letterSpacing: 0.5, marginBottom: 2 },
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
  diffBadgeText: { fontSize: 9, fontWeight: 'bold' }
});

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 24, borderTopWidth: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18, borderBottomWidth: 1 },
  title: { fontSize: 16, fontWeight: 'bold' },
  sectionLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 0.5, marginBottom: 4 },
  useText: { fontSize: 13, lineHeight: 19 },
  stepRow: { flexDirection: 'row', marginBottom: 8 },
  stepText: { fontSize: 13, flex: 1, lineHeight: 19 },
  tipBox: { padding: 10, borderRadius: 8, borderWidth: 1, marginTop: 12 }
});
