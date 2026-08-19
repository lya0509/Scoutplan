// Catalogo Oficial de Indicadores de Logros de la Asociacion de Scouts de Venezuela (ASV)
// Extraido del manual oficial 'Indicadores de logros ASV.pdf'

export type GrowthAreaKey = 'corporalidad' | 'creatividad' | 'caracter' | 'afectividad' | 'sociabilidad' | 'espiritualidad';

export interface GrowthAreaInfo {
  key: GrowthAreaKey;
  name: string;
  icon: string;
  color: string;
  description: string;
}

export const GROWTH_AREAS: Record<GrowthAreaKey, GrowthAreaInfo> = {
  corporalidad: {
    key: 'corporalidad',
    name: 'Corporalidad',
    icon: '🏃',
    color: '#ef4444',
    description: 'Desarrollo físico, salud, higiene, uso del tiempo y habilidades motrices/al aire libre.'
  },
  creatividad: {
    key: 'creatividad',
    name: 'Creatividad',
    icon: '💡',
    color: '#f59e0b',
    description: 'Pensamiento ágil, resolución de problemas, expresión artística y propuestas innovadoras.'
  },
  caracter: {
    key: 'caracter',
    name: 'Carácter',
    icon: '🛡️',
    color: '#8b5cf6',
    description: 'Valores scouts, coherencia entre pensamiento y acción, responsabilidad y superación.'
  },
  afectividad: {
    key: 'afectividad',
    name: 'Afectividad',
    icon: '❤️',
    color: '#ec4899',
    description: 'Autoestima, asertividad, relaciones familiares, afecto y empatía hacia los demás.'
  },
  sociabilidad: {
    key: 'sociabilidad',
    name: 'Sociabilidad',
    icon: '🤝',
    color: '#3b82f6',
    description: 'Convivencia, trabajo en equipo, servicio comunitario, respeto a normas y ciudadanía.'
  },
  espiritualidad: {
    key: 'espiritualidad',
    name: 'Espiritualidad',
    icon: '🕊️',
    color: '#10b981',
    description: 'Trascendencia, relación con la naturaleza, principios espirituales y valores universales.'
  }
};

export const ACHIEVEMENT_INDICATORS_BY_STAGE: Record<GrowthAreaKey, Record<string, string[]>> = {
  "corporalidad": {
    "1": [
      "Cumple las tareas en la oportunidad en que se l pide.",
      "Define para cual fecha desea tener una insigni trabaja para obtenerla.",
      "Usa la lectura como mecanismo para el descanso.",
      "Describe las diferencias que observa entre su organismo y el de otros",
      "Pide a familiares y adul Scouts la ayuda que requiere para adquirir habilidades y las practi",
      "Mantiene en su casa la clasificación de ciertos desperdicios sólidos.",
      "Se da cuenta de los cambios en su organismo cuando hace un esfuerzo.",
      "Elabora un horario para sus actividades diarias en época de estudios.",
      "Disfruta las actividades de agilidad tanto física como mental.",
      "Elabora objetos utilitarios escogidos libremente.",
      "Se esfuerza por aprender habilidades que requiere en excursiones y acantonamientos.",
      "Identifica elementos propios del lugar donde realiza las excursiones.",
      "Identifica las destrezas que ha adquirido.",
      "Disfruta de sus actividades.",
      "Desarrolla acciones de higiene personal sin que se le solicite.",
      "Cumple con una rutina de limpieza, después de jugar.",
      "Asume la limpieza y el orden de áreas comunes en su casa."
    ],
    "2": [
      "• Elabora y lleva a cabo un cronograma de trabajo ante una tarea a ejecutar e • Se asegura de mantener en buenas condiciones el lugar donde ha realizado actividades. •Interviene en definir qué hacer y cuando hacerlo, a y para que junto a otros Lobatos y Lobeznas aprenda, estudie y ayude en su casa. • Utiliza diversas formas para lograr el descanso con la aprobación familiar. • Utiliza sus cinco sentidos . en su relación con su tos familia y escuela, pudiendo describirlos con propiedad. ca. • Cumple las actividades que se le asignan, en el tiempo señalado, con la ayuda de otros",
      "Participa espontáneamente en actividades que requieren utilizar sus capacidades y explica lo hecho y el aporte que ha dado.",
      "Participa en actividades que le enseñen a mejorar la calidad de vida.",
      "Practica actividades individuales y en grupo, de carácter físico y mental.",
      "Integra su creatividad mental y su destreza física para provecho de su entorno. • Se integra a actividades familiares, escolares, Scouts, efectuadas en un ambiente natural y ayuda a los demás a tener mejor experiencia.",
      "• Aprende y disfruta de su relación con el medio natural, sin destruirlo. • Describe cabalmente diferentes partes de su cuerpo y como ellas le permiten disfrutar la vida. • Utiliza su cuerpo y su mente, de forma que se siente satisfecho consigo mismo. • Cumple diariamente con acciones para mantenerse limpio. • Mantiene limpio y en orden su espacio físico, según lo solicitado por sus padres, maestros y comunidad."
    ],
    "3": [
      "Elabora junto a los otros, el cronograma de trabajo del Consejo de Patrulla y vigila su cumplimiento.",
      "Programa junto a sus padres el uso de su tiempo libre.",
      "Utiliza la conversación con otros como medio para descansar.",
      "Determina la alimentación que requiere según su edad y actividad.",
      "Elabora su horario de actividades, dando especial atención a las que contribuyen a su desarrollo",
      "•",
      "Explica los cambios orgánicos que observa en quienes son mayores que él o ella.",
      "Identifica los cambios que • suceden en su organismo producto de su desarrollo, y las diferencias con los de otro sexo",
      "Invierte por lo menos 8 • horas de sueño para descansar.",
      "Realiza actividades fuertes sin excederse",
      "Se vincula a grupos para realizar las actividades de su interés. •",
      "Cumple un horario de estudios que le permite cumplir con lo que se le pide.",
      "Se prepara en la ciudad para los eventos al aire libre.",
      "Enseña a otros sus habilidades para vivir al aire libre",
      "Mantiene orden y limpieza en el campamento.",
      "Se plantea cómo quiere ser y actúa para lograrlo.",
      "Participa junto a sus mayores en la elaboración de la lista de alimentos y en la compra de los mismos.",
      "Describe lo que quiere lograr en la vida y cómo lo está logrando.",
      "Periódicamente, limpia a profundidad su cuarto y otras áreas de su casa.",
      "Incluye en sus actividades diarias la limpieza y el orden de sus objetos.",
      "Participa en actividades de la Unidad para restituir el orden y la limpieza de los locales que utiliza."
    ],
    "4": [
      "Ejecuta un programa de sus actividades de una semana, para cumplir con los • diferentes roles que ejerce (familia, Scouts, estudios/ trabajo). •",
      "Participa activamente en la decisión de cómo invertir su tiempo.",
      "Compagina las formas de • descanso que le gustan con las obligaciones que le son propias. •",
      "Razona cuales actividades son perjudiciales para su desarrollo social. •",
      "Expresa su sexualidad en • Disc actividades sociales de evo forma de mantener buena hum autoestima y respetando la en l individualidad de quienes le per rodean.",
      "Comprende los riesgos • Ide físicos y emocionales de adq una conducta sin con autocontrol. pro",
      "Comprende como sus • Se a actividades afectan su bala desarrollo, y escoge las que les permitan preservar su • Res organismo. sue • Man",
      "Distribuye su tiempo entre acc actividades físicas y entr mentales, entre acción y refl pasividad, entre la soledad •Disfr y el compartir. sole",
      "Acude con frecuencia al aire libre para efectuar • Di actividades deportivas o ac recreativas y disfruta su su relación con el medio natural. .",
      "Aprovecha los recursos del • Pe aire libre y sus capacidades pr y evita utilizar los del medio re urbano.",
      "Comprende cómo su • Cu accionar afecta el medio, se re esfuerza por mejorarlo. m",
      "Comprende lo perfecto de su • Re persona y agradece a Dios po por sus posibilidades y en potencialidades.",
      "Identifica las actividades que • Se son cónsonas con la imagen ac que desea de sí y las lleva a se cabo. su",
      "Se involucra en su • H comunidad para mejorarla su",
      "Ejecuta acciones para lograr • Id beneplácito e higiene a pu través del baño y el orden. y",
      "Manifiesta en su accionar su • Se preocupación por cuidar to objetos y espacios. es"
    ],
    "5": [
      "• Ad eq su Analiza su uso del tiempo ob y se impone correctivos. pr for de",
      "Busca recursos alternos, para lograr su bienestar, y que le permiten preservar o mejorar el ambiente En su tiempo libre incluye lapsos para descansar acordes con sus lapsos de actividad. • Co lo Describe sus habilidades ar y debilidades orgánicas y bu reconoce medios para de mejorarlas. po m Expone las normas (de seguridad, sanitarias, gerencia, operación) que hay que seguir en el trabajo escogido y por qué existen",
      "ute con otros la lución del organismo ano y como ello influye a conducta de las",
      "sonas. • Cre ntifica medios para su e uirir habilidades y sus tacta a quienes las tom",
      "veen. limit indi limenta en forma nceada. peta sus horas de ño. tiene un programa de ión que está balanceado e lo físico, lo social y lo exivo. uta estar en grupo y la dad. • Pa d sfruta la práctica de e tividades físicas fuera de n entorno. ar a",
      "rtenece a grupos cuyos opósitos deportivos y creativos, comparte ida la vegetación cuando aliza actividades en un edio natural. • Va conoce los aspectos im sitivos que los demás ven m él. p e vincula con grupos y ciones que le hacen ntirse bien y le aportan a desarrollo personal. ace un balance positivo de s logros y actividades. entifica factores que eden perjudicar su salud los evita. esfuerza en recoger do lo utilizado para tudiar, trabajar, vestirse."
    ],
    "6": [
      "ministra el tiempo uilibradamente entre s diversas ligaciones, acticando además mas apropiadas de scanso. noce su organismo, conserva mónicamente en en estado y sarrolla sus sibilidades físicas, entales y sociales.",
      "a formas de mejorar stado físico y la de compañeros ando en cuenta las aciones de cada viduo rticipa en actividades eportivas y recreativas n un medio ambiente atural, conviviendo mónicamente con ese mbiente.",
      "lora y mantiene una agen adecuada de sí ismo, y cuida la higiene ersonal y la de su ntorno."
    ]
  },
  "creatividad": {
    "1": [
      "Divulga a otros pasajes de su vida familiar.",
      "Se esfuerza por no desperdiciar los materiales que utiliza",
      "Relata una vivencia, exponiendo los hechos en secuencia.",
      "Participa en la invención colectiva de actividades para la Manada.",
      "Participa en la discusión de cómo mejorar una actividad ya efectuada en la Manada.",
      "Utiliza la creación a través de la mano para dar a conocer sus sentimientos.",
      "Contribuye con otros en el orden y limpieza del local de la unidad/Grupo.",
      "Elabora un dibujo donde refleja su comunidad local.",
      "Crea objetos que demuestran su interés en que no se maltrate el entorno.",
      "Participa con gusto en actividades con sus iguales de otras Unidades.",
      "Representa su comprensión de fechas importantes.",
      "Acompaña de buena gana a sus padres y hermanos cuando van a eventos de organizaciones diferentes a los Scouts.",
      "Expresa gráficamente como debe vivir el hombre en su medio ambiente.",
      "Se esfuerza por mejorar su labor en su casa."
    ],
    "2": [
      "Crea historietas para explicar cómo resolver situaciones de su comunidad.",
      "Describe manifestaciones culturales del país y sus protagonistas.",
      "Utiliza la representación gráfica para mostrar la labor que cumple en su casa en forma regular.",
      "Amplía las ideas de otros, complementándolas con las suyas.",
      "Elabora objetos de su invención, para decorar su cuarto.",
      "Aprovecha actividades fuera de su casa y del local Scout, para conocer la geografía, la gente, y el medio natural.",
      "Obtiene insignias libremente escogida y apoyado por sinodales de la comunidad.",
      "Recurre a la verbalización para dar a conocer sus ideas de cómo resolver un problema de su edificio o calle.",
      "Asume tareas específicas en la decoración y limpieza de su hogar.",
      "Estudia su entorno cuando realiza actividades en ambientes naturales, sin modificarlos o dañarlos",
      "Se integra a equipos de acción de su escuela.",
      "Ayuda a los más jóvenes a prepararse para trabajar en el mantenimiento del local y equipo, en forma sistemática.",
      "Entiende por qué se deben botar los desperdicios en lugares destinados a ello",
      "Se mantiene activo e integrado cuando acude a actividades de otras organizaciones de las cuales no es miembro frecuente.",
      "Describe cambios que ha visto en su edificio, barrio, que son buenos para su familia.",
      "Prepara ciertos alimentos para su familia."
    ],
    "3": [
      "Resuelve problemas de ingenio.",
      "Aporta ideas propias a las actividades de Patrulla, razonando su escogencia.",
      "Crea objetos que son útiles en la vida al aire libre, para tener bienestar.",
      "Elabora reportes sobre sus aprendizajes sobre la conservación del entorno y los da a conocer a otros.",
      "Realiza actividades con sus iguales, para conocer nuevos lugares y explorarlos.",
      "Utiliza medios no verbales para divulgar su punto de vista.",
      "Contribuye con otros en la mejora de su habitación y hogar.",
      "Asume nuevas tareas en su patrulla una vez que domina y ejerce con propiedad las anteriores.",
      "Trabaja solo y en Patrulla para adquirir habilidades y conocimientos nuevos.",
      "Diseña actividades para acercarse a otras nacionalidades y las disfruta.",
      "Comparte con otros miembros de su Patrulla una labor determinada.",
      "Participa activamente en el Consejo de Patrulla asumiendo una tarea concreta.",
      "Escoge su participación en un servicio, tomando en cuenta sus intereses y los demás miembros de la Patrulla."
    ],
    "4": [
      "Participa en la solución de problemas y tareas buscando vías nuevas en cada ocasión.",
      "Promueve y participa en visitas a centros de trabajo junto con sus iguales.",
      "Recopila y/o utiliza bienes de servicios relacionados con su interés laboral y determina ventajas y desventajas observadas.",
      "Resume los puntos que considera importantes de una charla o visita y expresa por qué los escogió.",
      "Aprovecha ideas de otros para crear nuevas soluciones a situaciones de rutina.",
      "Elabora un listado de normas que deben regir la producción de un bien o servicio.",
      "Expone verbalmente a sus iguales, cómo se siente • Co ante situaciones novedosas. Sco",
      "Organiza en su Patrulla un sien proyecto de mejora del en medio ambiente y lo lleva a cabo.",
      "Prepara el ambiente de reuniones, de forma que los asistentes lo perciban • Bus grato. acc real",
      "Describe con propiedad los par aportes de Venezuela a la con comunidad internacional de hoy. • Con",
      "Contribuye a la mejora de pro su hogar a través de mie reparación de algo que específico. mej de",
      "Comparte con miembros de • Se otras Tropas, un servicio. inst",
      "Participa en labores nuevas par que le reportan aprendizaje del de nuevos conocimientos y act destrezas.",
      "Busca información sobre • Se los orígenes de la nación lab moderna, e interpreta la req interdependencia de los tien hechos.",
      "• Se",
      "Informa a sus mayores los ma logros en sus tareas del de equipo. act • Se",
      "Participa en eventos fuera otr de su Unidad, y comparte org con personas diferentes a pro las habituales. pre • Inv",
      "Se informa de los cambios per positivos que se observan org en su comunidad. co • Inv",
      "Se encarga de ciertos a s trabajos de mantenimiento, ba bajo guía de un conocedor. me • De",
      "Promueve en la Tropa la pro ejecución de actividades vin fuera de lo urbano, a lugares su no conocidos. bie ent"
    ],
    "5": [
      "Se plantea más de una forma para resolver los problemas sobre los cuales desea actuar.",
      "Recorre parajes no conocidos y se vincula con los habitantes para conocer su estilo de vida.",
      "Participa en discusiones con sus iguales y propone vías de acción para atender el tema.",
      "Participa con ideas propias y novedosas, en discusiones destinadas a organizar actividades comunitarias o laborales",
      "Busca información sobre procesos que están cambiando en el país, y analiza lo que conoce.",
      "Investiga cuáles organizaciones existen en su comunidad para desempeño de actividades productivas y realiza un proyecto en alguna de ellas.",
      "• Exp sie dis munica a adultos no exp uts lo que piensa y am te, luego de participar esp un proyecto social. faci ent per • Re eve ca información de con iones que se estén car izando en otros lugares nac a ayudar a mejorar las res diciones de vida. la imp del tribuye al éxito de yectos de otros mbros de la Unidad, hagan aportes a orar la calidad de vida otros o propia. relaciona con • Co ituciones o personas for a investigar los logros org país y a sus principales des ores. pro prepara antes de asumir ores para las cuales uiere destrezas que no e.",
      "involucra en labores de ntenimiento y decoración locales donde realiza ividades vincula con jóvenes de os Clanes u anizaciones para ducir un resultado viamente definido. ita a su Unidad a sonas de otras anizaciones para mpartir actividades estiga las oportunidades u alcance, de estudio en se a sus intereses y dios para completarlos. scribe el proceso ductivo en el cual se ha culado incluyendo como labor le agrega valor al n o servicio que se",
      "rega"
    ],
    "6": [
      "Actúa con agilidad mental ante las situaciones más diversas, desarrollando su capacidad de pensar, innovar y aventurar.",
      "Analiza diferentes tipos de trabajo que están presentes en su entorno, determinando cómo cada uno de ellos contribuye a la sociedad, las normas que lo rigen, y cómo responden a sus propios intereses.",
      "one lo que piensa y nte a través de los tintos medios de resión, creando en los bientes donde actúe, acios gratos que liten el encuentro y el endimiento entre las sonas. conoce y analiza los ntos y memoraciones de ácter local, regional y/o ional, que persiguen altar el acervo cultural, historia, los personajes, ortantes y la geografía país. noce y aplica diversas mas de asociación y anización para empeñar actividades ductivas."
    ]
  },
  "caracter": {
    "1": [
      "Identifica cuando una conducta está de acuerdo con los valores Scouts.",
      "Escoge el momento en que desea pasar las pruebas en la Manada.",
      "Explica a los más nuevos qué quiere decir la Ley de la Manada.",
      "Explica la Ley y la Promesa refiriéndose a conductas válidas en la sociedad.",
      "Ofrece a sus padres su ayuda para las tareas derivadas de la vida familiar",
      "Acepta las normas impuestas por los adultos para mejorar la calidad de vida.",
      "Sigue las sugerencias de sus mayores para mejorar su conducta.",
      "Informa a sus mayores como va a realizar una tarea que se le asigna.",
      "Informa a los adultos scouts que lo acompañan, las pruebas y especialidades que quiere aprender",
      "Describe que le gusta más de lo que hace y explica su utilidad.",
      "Lista lo que le gusta y lo que no le gusta de sus resultados.",
      "Escucha a sus mayores cuando le dicen que debe por hacer mejor alguna cosa.",
      "Hace dibujos de su familia y se expone a sí mismo como parte de ella.",
      "Participa con ideas cuando se analiza la conducta de los miembros de su Unidad.",
      "Pide participar en actividades nuevas.",
      "Obedece las normas en juegos y vida al aire libre."
    ],
    "2": [
      "• Demuestra que aplica los valores Scouts en sus actividades con su familia. • Describe con propiedad las instituciones de su comunidad, con las que está vinculado. • Da reconocimiento a sus pares, cuando otro niño se destaca ejecutando acciones diferentes a las que acostumbra. • Opina sobre su conducta ante normativas escolares y familiares.",
      "• Determina el conocimiento y las habilidades con las cuales quiere pasar a la siguiente Unidad. • Elabora un conjunto de normas para hacer bien sus tareas en ella • Identifica un error y trabaja para corregirlo. • Da a conocer cuando ha terminado una tarea que se le ha asignado, para que otros aprendan como hacerlo. • Participa en la toma de decisiones para definir las habilidades que quiere aprender un tiempo libre.",
      "Ofrece su ayuda en las actividades que realiza con habilidad.",
      "Reconoce a sus pares cuando estos se destacan actuando con valores scouts",
      "Enuncia una cosa que desea hacer mejor y solicita ayuda para ello.",
      "Manifiesta su alegría cuando es llamado a colaborar.",
      "Asume una tarea de orden dentro de su casa, y la cumple a cabalidad.",
      "Se plantea lo que desea hacer cuando se integra a un grupo de iguales y evalúa cómo lo ha hecho.",
      "Repite las tareas hasta que está satisfecho con su logro.",
      "Participa en actos públicos donde demuestra lo que sabe hacer bien"
    ],
    "3": [
      "Demuestra en sus actos lealtad y veracidad.",
      "Asume una tarea específica en su Patrulla y la lleva a cabo en forma constante y cada vez mejor.",
      "Acepta las decisiones de la Patrulla cuando están de acuerdo con los valores Scouts.",
      "Razona sus respuestas.",
      "Elabora un horario para adquirir habilidades y lo lleva a cabo junto con otros miembros de la Unidad.",
      "Solicita a sus mayores, opinión sobre sus logros y medios para perfeccionarlas.",
      "Se propone alcanzar algo definiendo cuan bien lo quiere hacer.",
      "Toma decisiones para mejorar una tarea que ha realizado.",
      "Asume funciones para las cuales se ha preparado.",
      "Evita comprometerse con responsabilidades para las cuales no posee las habilidades necesarias.",
      "Acepta los comentarios positivos que los demás hagan de sí, de una manera constructiva.",
      "Identifica tanto las cosas buenas que ha hecho, como las que debe mejorar.",
      "Mantiene al día el control de su progreso personal, en aquello que le gusta."
    ],
    "4": [
      "• V",
      "Explica con ejemplos la to importancia de vivir de lo acuerdo con la Ley y la • S Promesa, y los utiliza en su p vida cotidiana. u d • S tr",
      "Reconoce el valor de la y heterogeneidad de los c miembros de la patrulla. d o",
      "Aplica los valores Scouts cuando determina las • S normas que deben regir a la a Patrulla. • P",
      "Evalúa sus acciones en n relación con las normas que c ha ayudado a definir. ra",
      "Se plantea nuevas formas • Ri de vida para su vida adulta de y se prepara para ella. lo",
      "Vigila el correcto uso y mantenimiento de los • Lis aparatos eléctricos del m hogar, para ahorro de tar energía",
      "Identifica un defecto en su • El forma de ser y planifica cr como corregirlo.",
      "Emprende una tarea y • Bu consulta cómo puede pe hacerla mejor que en el ex pasado. de",
      "Colabora con otros para que • S dominen una tarea que sabe co hacer bien. de • B",
      "Acepta las observaciones cu de oro cuando se le pide la mejorar su desempeño. es",
      "Se muestra satisfecho cuando hace un esfuerzo • Ex por actuar bien, sin importar di el resultado.",
      "Describe todos los logros • E que ha alcanzado hasta m este momento de su vida y po cuales quiere alcanzar.",
      "Se prepara con ahínco y • S acepta los resultados como ca expresión de su mejor • U esfuerzo. sa"
    ],
    "5": [
      "ela porque en su Unidad • A dos vivan de acuerdo con c s Valores Scouts. v e responsabiliza por un L royecto para la mejora de y n ambiente natural d eteriorado v • D c e vincula con centros de p abajo, haciendo pasantías c determina las a aracterísticas de la labor a r iferentes niveles de la e rganización. b p e responsabiliza por sus cciones. • articipa en establecer d ormas y se esfuerza en e umplirlas en forma e zonada. r c",
      "nde informe del resultado las labores que asume y discute con sus iguales ta sus logros y las ejoras que desea en cada ea que asume • Asu pro abora una meta para su per ecimiento personal. la r par se sca trabajar al lado de rsonas con más periencia, para aprender",
      "ellas.",
      "• e autoevalúa ante sus mpañeros de Unidad, y scribe sus destrezas. usca la opinión de otros ando considera que su bor no es lo que él peraba. presa con libertad lo que sfruta y le gusta. nuncia su vida futura • ostrando una imagen sitiva de sí mismo. • e expresa de sí mismo con lificativos positivos. tiliza productos del país que tisfacen sus necesidades."
    ],
    "6": [
      "ctúa de manera onsecuente con los alores que inspiran la ey y la Promesa Scouts, construye su proyecto e vida en base a dichos alores. emuestra sus apacidades personales ara desempeñar ualquier labor que sume, en forma esponsable, en su quipo, y con deseos de úsqueda constante del erfeccionamiento Mantiene autenticidad al emostrar coherencia ntre su pensamiento, su xpresión verbal y el esultado de su acción readora.",
      "me la vida como un ceso constante de fectibilidad, asumiendo esponsabilidad que tiene a que se dé y para que alcance sus logros.",
      "Identifica sus posibilidades y limitaciones, aceptándose con capacidad de autocrítica y manteniendo a la vez una buena imagen de sí mismo.",
      "Asume la responsabilidad de su propia formación",
      "Busca medios para conocer más profundamente a su país, demostrando orgullo por los logros alcanzados por éste."
    ]
  },
  "afectividad": {
    "1": [
      "Se observa a sí mismo y comprende que es único.",
      "Realiza actividades de diversión cuidando no dañar animales y plantas",
      "Le interesa conocer a otros.",
      "Plantea sus ideas francamente.",
      "Comparte con niños y niñas de su edad, que acaba de conocer, en un ambiente de amistad.",
      "Comparte con alegría el afecto de sus padres y hermanos.",
      "Comparte sus éxitos con su familia y acepta sus fracasos como parte del crecimiento.",
      "Ejerce su capacidad de cambio a la vez que se siente tranquilo.",
      "Describe como le gustaría fuera su escuela, para aprender mejor.",
      "Explica cómo se puede mantener la belleza de la naturaleza."
    ],
    "2": [
      "• Se quiere a sí mismo y descubre su propia capacidad para relacionarse con otros. • Elabora objetos que expresan sentimientos positivos ante el país. • Se relaciona con otras personas francamente (sin manipular). • Muestra afecto a los demás sin dejar de apreciarse a sí mismo. • Disfruta actividades con niños y niñas de su edad, en un ambiente social.",
      "Participa en la vida familiar demostrando amor por cada uno.",
      "Comparte con sus hermanos actividades y objetos, siendo cuidadoso.",
      "Describe las costumbres de grupos indígenas del país, de partes lejanas.",
      "Expresa sus sentimientos libremente.",
      "Expresa sus pensamientos y acepta nuevas ideas",
      "Conversa con sus familiares para saber qué piensan de su labor en la casa y cómo los beneficia.",
      "Cuida animales y plantas a su alcance."
    ],
    "3": [
      "Identifica los cambios en su desarrollo sexual y los acepta con tranquilidad.",
      "Se involucra en proyectos conservacionistas organizados por la Unidad.",
      "Acepta su realidad y es feliz en ella.",
      "Se acerca a los demás sin temor a ideas nuevas y sin timidez.",
      "Descubre que el amor es la base de las relaciones humanas y centro de su felicidad.",
      "Acepta la autoridad de sus padres basada en su experiencia y en el amor.",
      "Comprende que su futuro está fuera de su casa actual y con el amor de los suyos.",
      "Piensa independientemente",
      "Lee para buscar su desarrollo personal",
      "Diseña actividades con sus iguales para preservar la naturaleza",
      "Practica expresiones de afecto."
    ],
    "4": [
      "•",
      "Explica su desarrollo sexual, de así como el de otro sexo. y do • En re re",
      "Colabora en la preservación de de espacios para la vida natural. • D ca",
      "Acepta y comprende el • A punto de vista y la verdad de ot los demás. un",
      "Expresa su visión del mundo • R y la acepta como propia. de • C pe",
      "Participa en actividades que ca pretenden la felicidad ajena, entendiendo en ellas un acto de amor. • M a",
      "• Re",
      "Manifiesta alegría por los ca logros de sus familiares. su",
      "Acude a sus padres y • Inv hermanos mayores en los busca de respuestas a sus pa inquietudes. • Pa",
      "m dia • Ac",
      "Obedece con disciplina y pr razonadamente ala • Ve",
      "Escoge lo que quiere leer. su",
      "Expresa satisfacción por • Es los nuevos conocimientos de y habilidades adquiridas. los",
      "• Ayud",
      "Expresa amor sin imponer sus condiciones apoyado en la tiem pareja. diver",
      "Vela por el cumplimiento • Se de normas y costumbres mo del país, dentro de su tris unidad. apo",
      "Conversa con sus padres y • Pr profesores o tutores los co intereses del momento y gru su visión de su futuro."
    ],
    "5": [
      "Se relaciona con personas • C otro sexo en forma grata s con afecto por parte de los p s. c • D tiende que el amor en una v lación se basa en el a speto y en la necesidad c desarrollarse a c q escubre y desarrolla sus a pacidades de autodominio n c • D a yuda y recibe ayuda de a ros, obteniendo de ellos p aprendizaje. si p • S a econoce en los demás el o recho a ser distintos. d p d omprende que su felicidad rsonal gira en torno a su • S pacidad para amar. s fe a anifiesta su felicidad y mor a su pareja",
      "• R speta las diferencias de ba rácter y de intereses de co s familiares. un co • A olucra a sus padres en pa eventos importantes pa ra sí. co rticipa con su familia en omentos de convivencia",
      "ria. epta el mérito de su • Man opio éxito, sin hacer de l rde de ello. ma en sí mismo fuentes de propio valor. responsable de la mejora su hogar, en compañía de adultos.",
      "a a los más jóvenes en tareas, y en el uso del po libre en forma sana y tida. acerca a sus padres en mentos de felicidad y teza para dar y buscar yo. actica actividades en su munidad y se integra con pos humanos diferentes."
    ],
    "6": [
      "onoce, acepta y respeta su exualidad y la de las ersonas de otro sexo omo expresión de amor. emuestra orgullo de ser enezolano, a través de doptar las normas y ostumbres que identifican la comunidad nacional, y onociendo las instituciones ue la forman, a la vez que cepta las demás acionalidades y ostumbres emuestra conducta sertiva y una actitud fectuosa hacia las demás ersonas, sin inhibiciones y n perjuicio de la propia ersona. e integra a grupos, sociaciones u rganizaciones para el esempeño de actividades roductivas, de servicio o e aporte. e integra a relaciones ociales y construye su licidad personal en el mor.",
      "econoce la familia como se de la sociedad, nvirtiendo la suya en a comunidad de amor nyugal, filial y fraterno. dapta sus actividades ra que todos puedan rticipar y sentirse bien n lo que hacen. tiene un estado interior ibertad, equilibrio y durez emocional"
    ]
  },
  "sociabilidad": {
    "1": [
      "Muestra respeto por el país y las personas qu en él habitan",
      "Conversa con sus padres sobre las normas que se le piden cumpla, para saber el porqué de ellas.",
      "Aplica la Ley de la Manada en su vida diaria.",
      "Reconoce los platos típicos de diferentes partes del país",
      "Cuida el uso del material, de acuerdo con lo que se le pide.",
      "Explica a otros como mejorar el medio ambiente de su comunidad",
      "Se acerca a nuevos miembros de su Unida y salón para entablar amistad.",
      "Expresa oralmente consejos que daría a un familiar para que hiciera un buen trabajo",
      "Contribuye al mantenimiento del equipo de la Unidad.",
      "Muestra un comportamiento adecuado al viajar en transporte público.",
      "Obedece las instrucciones que le son dadas.",
      "Identifica las normas que debe cumplir para vivir en su barrio, edificio, calle",
      "Cumple con las tareas que se le asignan",
      "Rehace de buen grado trabajo cuando se le orie a mejorar.",
      "Expresa ante varias personas, lo que deduc de su observación sobr las tareas de un artesa",
      "Conoce a miembros de su comunidad que son originarios de otros países.",
      "Comprende la importancia de la paz entre los pueblos",
      "Obedece las órdenes d sus padres y maestros.",
      "Apoya a la Unidad en s trabajo, para el mantenimiento de local equipo, sin requerir que se le ordene.",
      "Demuestra amistad a los miembros de otros grupo Scouts.",
      "Participa en actos conmemorativos patrios.",
      "Discute con sus iguales e qué contribuyen al bienestar de las personas los trabajos de familiares.",
      "Acepta las normas de s casa, escuela y su Unidad."
    ],
    "2": [
      "Comprende las razones de e las normas que debe cumplir • Comparte con otros miembros de su Unidad, expresiones de cultura de otros países. • Aplica las normas de conducta.",
      "• Aplica en las actividades lo aprendido para hacer buen uso de los equipos. • Se acerca a personas de la sociedad que contribuyen al bienestar colectivo para conocer su labor • Se acerca a niños de su edad, para realizar juegos y otras actividades que le d atraen. • Conversa con sus padres sobre la importancia de cuidar las áreas verdes. .",
      "Cuida los materiales que le entrega el Grupo, para hacer actividades.",
      "Ayuda a personas no conocidas al hacer uso del transporte público.",
      "Se interesa en adquirir habilidades de acuerdo a su edad e intereses.",
      "Pregunta a sus padres, maestros, como se efectúan las tareas que le han sido asignadas",
      "Observa con cuidado las normas que le son dadas cuando se le asigna una tarea.",
      "el • Se esfuerza por mejorar nta sus tiempos y cantidad de trabajo. e • Utiliza los símbolos de e la hermandad mundial y no. conoce su significado. • Reconoce a figuras de otros países que han hecho aportes a Venezuela • Disfruta de compartir con personas de otras latitudes • Reconoce en los adultos e la experiencia que tienen. u • Participa a gusto en actividades con sus y iguales de otras unidades",
      "s n • Expresa como su familia y él conviven en armonía con la naturaleza. • Propone a su familia u adoptar normas que le han dado resultado en otros medios."
    ],
    "3": [
      "Solicita la ayuda de personas ajenas al Grupo para aprender habilidades, que requieran a un experto.",
      "Ayuda a la patrulla a evaluar cómo es la conducta de sus integrantes y propone correctivos.",
      "Hace esfuerzos por ser ejemplo de la conducta que se acuerde en su equipo de iguales.",
      "Comparte con sus iguales las vivencias en otras partes del país.",
      "Pone en práctica lo que aprende para hacer buen uso de los materiales que utiliza en su casa y en la escuela.",
      "Acude a sus mayores cuando considera que se ha violado un derecho de alguien cercano.",
      "Comparte con otros jóvenes de su edad, en forma grata, aún sin ser amigos.",
      "Junto con sus iguales adopta el cuidado de un ser vivo de su comunidad.",
      "Identifica lo que la sociedad le da para su beneficio",
      "Identifica por lo menos una labor productiva de su interés e investiga oportunidades en su entorno.",
      "Utiliza con cuidado los recursos del medio que debe utilizar en su escuela.",
      "Hace buen uso de las áreas comunes y de los parques públicos.",
      "Acepta la dirección de personas más experimentadas, cuando asume tareas nuevas.",
      "Conoce sus habilidades y las que quisiera tener",
      "Identifica cuales tareas puede asumir con mínima preparación sin que se corran riesgos.",
      "Se fija niveles de excelencia al aprender nuevas destrezas.",
      "Promueve la participación de su Patrulla en las actividades Institucionales.",
      "Conoce el aporte de figuras venezolanas a otros países del continente",
      "Respeta las opiniones diferentes a la suya y busca puntos de encuentro.",
      "Asume las tareas y deberes que se derivan de su vinculación a la Patrulla.",
      "Participa en actividades destinadas a mejorar el entorno, con Patrullas de otros Grupos.",
      "Identifica normas concretas de convivencia con animales y plantas que no están en cautiverio.",
      "Reconoce las manifestaciones culturales de su región, en aspectos como canto, danza, artesanía.",
      "Practica algunas manifestaciones de cultura de su región.",
      "Explica normas o costumbres del país, que identifican a sus habitantes",
      "Propone y discute con su Patrulla las normas que deben regir sus tareas dentro de ella",
      "Se prepara junto a su Patrulla para participar en actividades conservacionistas.",
      "Cumple las normas básicas para la convivencia armónica con su medio social."
    ],
    "4": [
      "Integra a sus actividades • P Scouts recursos d provenientes de la d comunidad, sin perjuicio de o ésta. • A",
      "Se interesa por comprender a como se cumplen las y normas en la comunidad p donde vive, y busca el • Id origen de su vigencia actual. c e • S",
      "Se preocupa por mejorar su d vivencia de los valores d éticos. d h",
      "Utiliza los recursos • S disponibles en el lugar del u campamento, impactando lo m menos posible el ambiente. a",
      "Adquiere conocimientos para hacer buen uso de los recursos necesarios para • C lograr bienestar. s c",
      "Valora positivamente los p esfuerzos que se hagan en el país, para su mejora • J",
      "Asiste a eventos en su c comunidad para conocer a mejor su país. c h • P s c",
      "Se relaciona con integrantes e de otras organizaciones para conocer su labor. • R c a m",
      "Reconoce las instituciones • S de servicio de su a comunidad y el papel que c deben jugar",
      "Comprende al aporte de • U Venezuela al desarrollo de in otros países. d",
      "• Re qu",
      "Reconoce los recursos de co su comunidad local y como cu puede acceder a ellos. br pr",
      "Orienta a sus iguales para • Se utilizar adecuadamente las m instalaciones de uso de comunitario.",
      "Participa activamente en proyectos elaborados por • El los más experimentados, y se para los cuales puede dar aportes positivos •As",
      "Asume tareas concretas su cuando está seguro de que es tiene suficiente preparación. in pr",
      "Busca conocer las habilidades y conocimientos • Inv para asumir tareas que son in delicadas o que solo int pueden hacerse previa preparación personal.",
      "• Se",
      "Se involucra con nuevas una tareas cuando domina las des que puede realizar en un prop momento determinado. alte",
      "Se interesa por conocer las • M características del m Escultismo en otras H latitudes. d • S",
      "Estudia la realidad de otros p pueblos p • S",
      "Defiende la libre expresión d de los hombres. e",
      "Plantea a sus padres y • Id Adultos scouts sus q opiniones, acatando las e instrucciones que le son re dadas. • A",
      "Aplica en su casa actitudes, p habilidades y conocimientos ju desarrolladas en los Scouts. p",
      "• E",
      "Identifica cuales acciones im conservacionistas deben el realizarse para mejorar su pr localidad. e • S",
      "Participa en proyectos tr desarrollo comunitario de d carácter interinstitucional. d • R",
      "p p • Se i",
      "acci de p",
      "Promueve en la Unidad • S actividades de educación de ot la comunidad en el cuido del c medio ambiente.",
      "Contribuye en el • A establecimiento de reglas y si normas de los grupos a los p cuales pertenece."
    ],
    "5": [
      "• U lo p articipa en eventos para lo ar a conocer los valores el el país a personas de la tras latitudes. d vi d pl sume una actitud crítica • V nte la conducta de líderes cr figuras públicas de su n aís. c a entifica normas que desea a ambiar y razona su lo scogencia. re • P m la re e involucra en acciones la e grupos, para el análisis vi e los valores éticos que d eben regir la conducta a umana d fi d d e integra activamente en n proyecto de mejora del edio ambiente, sugiriendo cciones concretas.",
      "• G p onoce organizaciones a ociales de servicio de su re omunidad, en las cuales (r uede prestar ayuda. bi in u unto a la Unidad y su omunidad define acciones seguir para restituir las ondiciones de vida de un ábitat natural. articipa en actividades de ervicio que se llevan a abo en el medio donde se • Coo ncuentra. de l ealiza un servicio junto par on la comunidad para acti yudar a conservar el edio ambiente e integra a actividades al ire libre y vigila que no sea ontaminado tiliza los mecanismos e stancias, para la defensa el individuo.",
      "conoce los recursos e existen en su munidad regional, y los idados que deben indársele para su eservación • Par labo com integra a grupos que nac antienen instalaciones pro uso comunal. cole ajus soc valo abora proyectos de rvicio a la comunidad. ume compromisos con comunidad cuando tá convencido que le teresan y le son de ovecho ita a jóvenes de otras stituciones para que se egren a sus proyectos",
      "mantiene involucrado con tarea, perfeccionando su empeño y orcionando nuevas rnativas • Pr antiene contacto con in iembros de la he ermandad Scout más allá en e las fronteras. lu co e vincula con proyectos ara la integración de los",
      "aíses. e integra a acciones para efender la paz en el país y n el mundo. entifican las autoridades • A ue conducen la sociedad re n lo social, escolar, de ligioso, etc. cata las leyes vigentes a esar de no considerarlas stas y busca las razones ara su puesta en vigencia",
      "xpresa a sus iguales la portancia de convivir con medio para la eservación de la specie. e integra a equipos de abajo para defender sus erechos y ejercer sus eberes ciudadanos. ecorre la geografía del aís, según sus osibilidades. ntegra a equipos de ón de bienestar colectivo ermanencia en el tiempo. e acerca a nacionales de ros países y disfruta su ompañía. • A cepta las normas sociales no n renunciar al derecho de co oder cambiarlas. so"
    ],
    "6": [
      "tiliza adecuadamente s recursos que le rovee el entorno para el gro de su bienestar y/o de otros, plantas, y con mínima modificación el ambiente de estos, gilando la preservación e la vida de animales y antas. ive y convive íticamente con las ormas y valores que onstituyen la nación, sumiendo un papel ctivo y constructivo ante s cambios que querirá. articipa en la mejora del edio ambiente cuando s circunstancias lo quieran, para restituir s condiciones para la da de los seres propios e ese lugar o de quellos que se haya eterminado adaptar, a n de mejorar la calidad e vida y la preservación e la naturaleza.",
      "enera acciones que ermiten utilizar decuadamente los cursos del país enovables o no) para el enestar colectivo e dividual, sin perjuicio el no del otro. pera en la adaptación os espacios en los que ticipa y donde ejecuta vidades",
      "ticipa activamente en res requeridas en la unidad local, regional o ional, para mejorar la ductividad y bienestar ctivos, que estén tadas a las normas iales y éticas, y los res que le son propios",
      "omueve la cooperación ternacional, la rmandad mundial y el cuentro de los pueblos chando por la mprensión y la paz. cepta la autoridad y speta la disciplina que ella se desprende.",
      "ctúa de acuerdo con las rmas éticas y de buena stumbre, que da la ciedad."
    ]
  },
  "espiritualidad": {
    "1": [
      "Acepta el derecho de los demás a tener diferentes intereses.",
      "Reconoce los símbolos Patrios y les rinde honores.",
      "En juegos y representaciones comparte con todos sin distingo",
      "Inventa relatos sobra la amistad entre el hombre y la naturaleza .",
      "Le interesa conocer la vida en la naturaleza.",
      "Se esfuerza por hacer bien las cosas.",
      "Explica cómo hacer feliz a Dios.",
      "Reconoce las obligaciones que le impone su Fe y su Iglesia.",
      "Conoce sus orígenes y las tradiciones de la familia."
    ],
    "2": [
      "Se integra a diferentes grupos humanos conociendo los gustos de sus miembros",
      "Ejemplifica la importancia de mantener el equilibrio ecológico entre los seres vivos.",
      "Da algunas ideas de cómo se puede hacer para restituir la vida en algún lugar.",
      "Se muestra contento al participar en actividades con iguales de otras instituciones.",
      "Practica en su grupo de pares la igualdad de derechos y deberes.",
      "Busca dentro de sí las razones para su conducta y se esfuerza por cumplir con lo que es mejor para todos.",
      "Cuida a animales o plantas para que crezcan sanos.",
      "Vive en armonía con sus vecinos, se preocupa por ellos.",
      "Descubre cualidades en otras personas.",
      "Cumple los deberes que se derivan de su Fe según las costumbres de su Iglesia y respeta la de los demás.",
      "Participa en actividades con personas de otro género, que le permitan observar las características y valores particulares que los hacen destacarse."
    ],
    "3": [
      "Se alegra de formar parte de un grupo y se comporta con camaradería.",
      "Explica como su comportamiento conservacionista lo ayuda a mejorar la calidad de vida de su familia.",
      "Acepta que cada persona es única, identifica las virtudes de cada quien.",
      "Demuestra por qué un medio ambiente perdió las condiciones para albergar vida.",
      "Demuestra que se esfuerza por dar un paso más, por acercarse a quienes no se le acercan",
      "Participa en el Consejo de Patrulla, llegando a acuerdos sobre cómo conducirse .",
      "Hace de su medio un lugar que refleje la obra de Dios.",
      "Cumple con sus responsabilidades en la Patrulla, para que los demás sean felices.",
      "Reconoce en su medio a personajes que se entregan al servicio de los demás, e identifica sus cualidades",
      "Comprende la importancia del respeto por la Vida",
      "Compara sus principios religiosos con los Valores Scouts.",
      "Comprende las conmemoraciones de fechas patrias, al conocer las razones y logros del evento.",
      "Se esfuerza en mejorar sus habilidades.",
      "Tiene una visión positiva del país y con gran potencial."
    ],
    "4": [
      "• Se de",
      "Establece comunicación de con las personas más diversas con franca confianza en sí mismo y • Ide en sus ideas. los co del",
      "Conoce las virtudes de • Par diferentes razas, credos y que clases sociales, act aceptándolas en su bus realidad.",
      "Investiga la opinión de • Ent otros y relata las otra conclusiones, aun cuando mej difieran de las suyas vivi",
      "Realiza junto a su Unidad • De las acciones necesarias per para restituir las las condiciones de vida de un inte lugar. .",
      "Protege el medio para que perdure por la eternidad. • En be",
      "Participa en celebraciones m de tradición en su casa y Di en las de sus amigos.",
      "Busca el avance propio y el avance de quienes le • Bu rodean, a través de valores an que mejoran la calidad de se vida.",
      "Se inspira en Dios para asumir su papel en la sociedad. • Bu cu",
      "Analiza la importancia de el que el hombre viva en armonía con la naturaleza",
      "Participa en actividades donde refleja su apego a la Vida. • In re",
      "Participa en proyectos que y le permitan mejorar la ne calidad de convivencia con el medio ambiente.",
      "Expresa abiertamente su • Ha Credo de manera cotidiana m según las costumbres de su su Iglesia y respetando a so quienes tengan otra religión"
    ],
    "5": [
      "comunica con personas • D pensamientos diferentes p forma armónica. su so es ntifica los recursos con co cuales cuenta su h munidad para el bienestar ac ser humano. la ticipa en grupos humanos , con intereses comunes, úan como pueblo que ca la verdad. • P abla conversaciones con ig s personas sobre cómo gé orar la forma en que es",
      "mos. vi scubre valores en sonas de su entorno, con cuales no comparte",
      "reses",
      "seña a otros como la • Id lleza de la naturaleza es na anifestación de la obra de y os. pr sca fortaleza interior para te los obstáculos para guir adelante sca en su interior alidades humanas para bienestar de otros • C co vierte tiempo para co flexionar sobre sí mismo as sobre su forma y pa cesidad de trascender. pr de o • In ce concreta la re anifestación personal de co Fe en obras de acción co cial realizadas en grupo. su pa"
    ],
    "6": [
      "ialoga con todas las ersonas, cualquiera sea credo, raza o clase cial, buscando tablecer vínculos de municación entre los ombres, y un ercamiento conjunto a verdad ractica la aceptación e ualdad sin distinción de nero y aprecia como ta conducta mejora su da",
      "entifica en la turaleza, en el hombre en sí mismo, la esencia de Dios. onvive armónicamente n el medio nsiderando que este pecto es importante ra su propia eservación y de las más especies, propias no del lugar. tegra sus principios ligiosos a su conducta tidiana, estableciendo herencia entre su Fe, vida personal y su rticipación social"
    ]
  }
};

/**
 * Retorna las etapas aplicables segun la rama scout:
 * - Manada: Etapas 1 y 2
 * - Tropa: Etapas 3 y 4
 * - Caminantes: Etapa 5
 * - Clan: Etapas 5 y 6
 */
export function getStagesForUnit(unit?: string | null): string[] {
  const clean = (unit || '').toLowerCase().trim();
  if (clean === 'manada') return ['1', '2'];
  if (clean === 'tropa') return ['3', '4'];
  if (clean === 'caminantes' || clean === 'comunidad') return ['5'];
  if (clean === 'clan' || clean === 'rover' || clean === 'rovers') return ['5', '6'];
  return ['1', '2', '3', '4', '5', '6'];
}

/**
 * Retorna todas las etapas combinadas para una o más unidades (Sinodal)
 */
export function getStagesForUnits(units: string[]): string[] {
  const stageSet = new Set<string>();
  units.forEach(u => {
    getStagesForUnit(u).forEach(st => stageSet.add(st));
  });
  return Array.from(stageSet).sort();
}

/**
 * Obtiene todos los indicadores de un area para una rama o ramas especificas
 */
export function getIndicatorsForAreaAndUnit(area: GrowthAreaKey, unitOrUnits?: string | string[] | null): { stage: string; text: string }[] {
  const units = Array.isArray(unitOrUnits) ? unitOrUnits : [unitOrUnits || ''];
  const stages = getStagesForUnits(units);
  const areaData = ACHIEVEMENT_INDICATORS_BY_STAGE[area] || {};
  const result: { stage: string; text: string }[] = [];

  stages.forEach(st => {
    const list = areaData[st] || [];
    list.forEach(txt => {
      if (txt && txt.trim()) {
        result.push({ stage: st, text: txt.trim() });
      }
    });
  });

  return result;
}
